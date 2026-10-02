import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import {
  AppError,
  type Actor,
  can,
  requirePermission,
  requireDepartment,
  assertTransition,
  sessionTransitions,
} from "./policy";
import {
  applicationInput,
  evidence,
  id,
  moderationInput,
  priorityInput,
  sessionInput,
  short,
  text,
  validateAnswer,
} from "./validation";
type Tx = Prisma.TransactionClient;
const serial = <T>(fn: (tx: Tx) => Promise<T>) =>
  db.$transaction(fn, { isolationLevel: "Serializable" });
const toJson = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  ) as Prisma.InputJsonValue;
export async function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  target: string,
  before?: unknown,
  after?: unknown,
) {
  await tx.auditLog.create({
    data: {
      actorId: actor.id,
      action,
      target,
      ...(before ? { before: toJson(before) } : {}),
      ...(after ? { after: toJson(after) } : {}),
    },
  });
}
async function notify(
  tx: Tx,
  userId: string,
  title: string,
  body: string,
  href: string,
) {
  await tx.notification.create({ data: { userId, title, body, href } });
}
async function enqueue(tx: Tx, type: string, payload: unknown) {
  await tx.outbox.create({ data: { type, payload: toJson(payload) } });
}
function found<T>(record: T | null): T {
  if (!record) throw new AppError("NOT_FOUND", "Record not found.", 404);
  return record;
}

export async function createModeration(actor: Actor, input: unknown) {
  requirePermission(actor, "createModeration");
  const data = moderationInput.parse(input);
  if (["TEMPORARY_BAN", "BLACKLIST"].includes(data.type))
    requirePermission(actor, "banUsers");
  if (data.type === "PERMANENT_BAN") requirePermission(actor, "permanentBan");
  if (data.userId === actor.id)
    throw new AppError(
      "INVALID_TARGET",
      "You cannot moderate your own account.",
    );
  return serial(async (tx) => {
    const result = await tx.moderation.create({
      data: { ...data, moderatorId: actor.id },
    });
    await audit(tx, actor, "MODERATION_CREATED", result.id, undefined, result);
    await notify(
      tx,
      data.userId,
      "Moderation notice",
      data.reason,
      "/dashboard/moderations",
    );
    await enqueue(tx, "NOTICE", {
      title: "Moderation created",
      message: `Case #${result.number} · ${data.type}`,
    });
    return result;
  });
}
export async function submitApplication(actor: Actor, input: unknown) {
  const data = z
    .object({ applicationId: id, answers: z.record(z.string(), z.unknown()) })
    .parse(input);
  return serial(async (tx) => {
    const form = found(
      await tx.application.findUnique({
        where: { id: data.applicationId },
        include: { questions: true },
      }),
    );
    const now = new Date();
    if (
      form.status !== "OPEN" ||
      (form.opensAt && form.opensAt > now) ||
      (form.closesAt && form.closesAt < now)
    )
      throw new AppError("CLOSED", "This application is closed.", 409);
    if (
      form.requiredRoles.length &&
      !form.requiredRoles.some((r) => actor.roleIds.includes(r))
    )
      throw new AppError("INELIGIBLE", "You do not have a required role.", 403);
    const discordCreated = Number(
      (BigInt(actor.discordId) >> BigInt(22)) + BigInt(1420070400000),
    );
    if (Date.now() - discordCreated < form.minimumAccountDays * 86400_000)
      throw new AppError(
        "INELIGIBLE",
        "Your Discord account does not meet the minimum age.",
        403,
      );
    const submissions = await tx.applicationSubmission.findMany({
      where: { userId: actor.id, applicationId: form.id },
      orderBy: { createdAt: "desc" },
    });
    if (
      submissions.length >= form.maximumSubmissions ||
      submissions.some((s) =>
        ["PENDING", "UNDER_REVIEW", "INTERVIEW"].includes(s.status),
      )
    )
      throw new AppError(
        "SUBMISSION_LIMIT",
        "You already have a pending application or reached the submission limit.",
        409,
      );
    if (
      submissions[0] &&
      Date.now() - submissions[0].createdAt.getTime() <
        form.cooldownHours * 3600000
    )
      throw new AppError(
        "COOLDOWN",
        "Wait for the application cooldown to finish.",
        409,
      );
    const answers = form.questions.map((q) => {
      try {
        return {
          questionId: q.id,
          value: toJson(validateAnswer(q, data.answers[q.id])),
        };
      } catch {
        throw new AppError(
          "INVALID_ANSWER",
          `Check your answer to: ${q.label}`,
        );
      }
    });
    const result = await tx.applicationSubmission.create({
      data: {
        applicationId: form.id,
        userId: actor.id,
        answers: { create: answers },
      },
    });
    await audit(tx, actor, "APPLICATION_SUBMITTED", result.id);
    await enqueue(tx, "NOTICE", {
      title: "New application",
      message: form.title,
    });
    return result;
  });
}
export async function reviewApplication(actor: Actor, input: unknown) {
  const data = z
    .object({
      id,
      status: z.enum(["UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "DENIED"]),
      note: text,
      score: z.number().int().min(0).max(100).optional(),
    })
    .parse(input);
  return serial(async (tx) => {
    const before = found(
      await tx.applicationSubmission.findUnique({
        where: { id: data.id },
        include: { application: true },
      }),
    );
    if (!can(actor, "manageApplications")) {
      if (!before.application.departmentId)
        requirePermission(actor, "manageApplications");
      else
        requireDepartment(
          actor,
          before.application.departmentId,
          "manageApplications",
        );
    }
    if (before.userId === actor.id)
      throw new AppError(
        "SELF_REVIEW",
        "You cannot review your own application.",
        403,
      );
    if (!["PENDING", "UNDER_REVIEW", "INTERVIEW"].includes(before.status))
      throw new AppError(
        "CLOSED",
        "This application already has a decision.",
        409,
      );
    const result = await tx.applicationSubmission.update({
      where: { id: data.id },
      data: {
        status: data.status,
        reviewerId: actor.id,
        decision:
          data.status === "ACCEPTED" || data.status === "DENIED"
            ? data.note
            : undefined,
        reviews: {
          create: {
            reviewerId: actor.id,
            status: data.status,
            note: data.note,
            score: data.score,
          },
        },
      },
    });
    if (data.status === "ACCEPTED") {
      if (before.application.departmentId)
        await tx.departmentMember.upsert({
          where: {
            userId_departmentId: {
              userId: before.userId,
              departmentId: before.application.departmentId,
            },
          },
          create: {
            userId: before.userId,
            departmentId: before.application.departmentId,
          },
          update: {},
        });
      if (before.application.acceptedRoleId)
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: before.userId,
              roleId: before.application.acceptedRoleId,
            },
          },
          create: {
            userId: before.userId,
            roleId: before.application.acceptedRoleId,
          },
          update: {},
        });
      await enqueue(tx, "ROLE_SYNC", { userId: before.userId });
    }
    await audit(
      tx,
      actor,
      "APPLICATION_REVIEWED",
      result.id,
      { status: before.status },
      { status: result.status },
    );
    await notify(
      tx,
      before.userId,
      "Application updated",
      `Your application is ${data.status.toLowerCase().replaceAll("_", " ")}.`,
      "/dashboard/applications",
    );
    return result;
  });
}
export async function createAppeal(actor: Actor, input: unknown) {
  const data = z
    .object({
      moderationId: id,
      reason: text,
      account: text,
      improvements: text,
      evidence,
    })
    .parse(input);
  return serial(async (tx) => {
    const moderation = found(
      await tx.moderation.findUnique({ where: { id: data.moderationId } }),
    );
    if (moderation.userId !== actor.id)
      throw new AppError(
        "FORBIDDEN",
        "You may only appeal your own moderation.",
        403,
      );
    if (moderation.status !== "ACTIVE")
      throw new AppError("CLOSED", "This moderation is no longer active.", 409);
    if (
      await tx.appeal.count({
        where: {
          moderationId: moderation.id,
          status: { in: ["PENDING", "UNDER_REVIEW"] },
        },
      })
    )
      throw new AppError("DUPLICATE", "An appeal is already pending.", 409);
    const result = await tx.appeal.create({
      data: { ...data, userId: actor.id },
    });
    await audit(tx, actor, "APPEAL_SUBMITTED", result.id);
    await enqueue(tx, "NOTICE", {
      title: "Appeal submitted",
      message: `Case #${moderation.number}`,
    });
    return result;
  });
}
export async function reviewAppeal(actor: Actor, input: unknown) {
  requirePermission(actor, "manageAppeals");
  const data = z
    .object({
      id,
      status: z.enum(["UNDER_REVIEW", "ACCEPTED", "DENIED"]),
      note: text,
    })
    .parse(input);
  return serial(async (tx) => {
    const before = found(
      await tx.appeal.findUnique({ where: { id: data.id } }),
    );
    if (before.userId === actor.id)
      throw new AppError(
        "SELF_REVIEW",
        "You cannot decide your own appeal.",
        403,
      );
    if (!["PENDING", "UNDER_REVIEW"].includes(before.status))
      throw new AppError("CLOSED", "This appeal already has a decision.", 409);
    const result = await tx.appeal.update({
      where: { id: data.id },
      data: {
        status: data.status,
        reviewerId: actor.id,
        decision: data.status === "UNDER_REVIEW" ? undefined : data.note,
        actions: {
          create: { actorId: actor.id, action: data.status, note: data.note },
        },
      },
    });
    if (data.status === "ACCEPTED")
      await tx.moderation.update({
        where: { id: before.moderationId },
        data: { status: "REVOKED" },
      });
    await audit(
      tx,
      actor,
      "APPEAL_REVIEWED",
      result.id,
      { status: before.status },
      { status: result.status },
    );
    await notify(
      tx,
      before.userId,
      "Appeal updated",
      data.status === "UNDER_REVIEW"
        ? "Your appeal is under review."
        : data.note,
      "/dashboard/appeals",
    );
    return result;
  });
}
export async function createSession(actor: Actor, input: unknown) {
  requirePermission(actor, "manageSessions");
  const data = sessionInput.parse(input);
  return serial(async (tx) => {
    const result = await tx.session.create({
      data: { ...data, hostId: actor.id, cohostIds: [] },
    });
    await audit(tx, actor, "SESSION_CREATED", result.id, undefined, result);
    await enqueue(tx, "NOTICE", {
      title: result.title,
      message: `Scheduled for ${data.startsAt}`,
    });
    return result;
  });
}
export async function updateSession(actor: Actor, input: unknown) {
  requirePermission(actor, "manageSessions");
  const data = z
    .object({
      id,
      status: z
        .enum([
          "SCHEDULED",
          "STARTING_SOON",
          "ACTIVE",
          "FULL",
          "ENDED",
          "CANCELLED",
        ])
        .optional(),
      peacetime: z.boolean().optional(),
      playerCount: z.number().int().min(0).max(1000).optional(),
      priorityStatus: z.enum(["AVAILABLE", "COOLDOWN", "PEACETIME"]).optional(),
    })
    .parse(input);
  return serial(async (tx) => {
    const before = found(
      await tx.session.findUnique({ where: { id: data.id } }),
    );
    if (data.status && data.status !== before.status)
      assertTransition(before.status, data.status, sessionTransitions);
    if (data.playerCount !== undefined && data.playerCount > before.maxPlayers)
      throw new AppError("CAPACITY", "Player count exceeds capacity.");
    const result = await tx.session.update({
      where: { id: data.id },
      data: {
        ...data,
        ...(data.status === "ENDED" ? { endsAt: new Date() } : {}),
      },
    });
    if (["ENDED", "CANCELLED"].includes(result.status) || result.peacetime) {
      await tx.priorityRequest.updateMany({
        where: {
          sessionId: result.id,
          status: { in: ["REQUESTED", "ACTIVE", "CLAIMED"] },
        },
        data: { status: "ENDED" },
      });
    }
    if (result.status === "ENDED") {
      const attendance = await tx.sessionAttendance.findMany({
        where: { sessionId: result.id, leftAt: null },
      });
      for (const entry of attendance)
        await tx.sessionAttendance.update({
          where: { id: entry.id },
          data: {
            leftAt: new Date(),
            minutes:
              entry.minutes +
              Math.floor((Date.now() - entry.joinedAt.getTime()) / 60000),
          },
        });
    }
    await audit(tx, actor, "SESSION_UPDATED", result.id, before, result);
    await enqueue(tx, "NOTICE", {
      title: result.title,
      message: `${result.status} · Priority ${result.priorityStatus} · Peacetime ${result.peacetime ? "on" : "off"}`,
    });
    return result;
  });
}
export async function attendance(actor: Actor, input: unknown) {
  const data = z
    .object({
      sessionId: id,
      action: z.enum(["JOIN", "LEAVE"]),
      department: short.optional(),
      role: short.default("Civilian"),
    })
    .parse(input);
  return serial(async (tx) => {
    const session = found(
      await tx.session.findUnique({ where: { id: data.sessionId } }),
    );
    if (!["ACTIVE", "FULL"].includes(session.status))
      throw new AppError("INACTIVE", "This session is not active.", 409);
    const prior = await tx.sessionAttendance.findUnique({
      where: {
        sessionId_userId: { sessionId: data.sessionId, userId: actor.id },
      },
    });
    if (data.action === "JOIN") {
      if (prior && !prior.leftAt) return prior;
      return tx.sessionAttendance.upsert({
        where: {
          sessionId_userId: { sessionId: data.sessionId, userId: actor.id },
        },
        create: {
          sessionId: data.sessionId,
          userId: actor.id,
          department: data.department,
          role: data.role,
        },
        update: { joinedAt: new Date(), leftAt: null },
      });
    }
    if (!prior || prior.leftAt)
      throw new AppError("NOT_ATTENDING", "You are not checked in.", 409);
    return tx.sessionAttendance.update({
      where: { id: prior.id },
      data: {
        leftAt: new Date(),
        minutes:
          prior.minutes +
          Math.floor((Date.now() - prior.joinedAt.getTime()) / 60000),
      },
    });
  });
}
export async function requestPriority(actor: Actor, input: unknown) {
  const data = priorityInput.parse(input);
  return serial(async (tx) => {
    const session = found(
      await tx.session.findUnique({ where: { id: data.sessionId } }),
    );
    if (
      !["ACTIVE", "FULL"].includes(session.status) ||
      session.peacetime ||
      session.priorityStatus === "PEACETIME"
    )
      throw new AppError(
        "UNAVAILABLE",
        "Priority is unavailable during peacetime or inactive sessions.",
        409,
      );
    if (
      await tx.priorityRequest.count({
        where: {
          sessionId: data.sessionId,
          userId: actor.id,
          status: { in: ["REQUESTED", "ACTIVE", "CLAIMED"] },
        },
      })
    )
      throw new AppError(
        "DUPLICATE",
        "You already have a pending or active priority.",
        409,
      );
    const result = await tx.priorityRequest.create({
      data: { ...data, userId: actor.id },
    });
    await audit(tx, actor, "PRIORITY_REQUESTED", result.id);
    return result;
  });
}
export async function decidePriority(actor: Actor, input: unknown) {
  requirePermission(actor, "manageSessions");
  const data = z
    .object({ id, status: z.enum(["ACTIVE", "DENIED", "ENDED"]) })
    .parse(input);
  return serial(async (tx) => {
    const before = found(
      await tx.priorityRequest.findUnique({
        where: { id: data.id },
        include: { session: true },
      }),
    );
    if (!["REQUESTED", "ACTIVE", "CLAIMED"].includes(before.status))
      throw new AppError("CLOSED", "This priority request has ended.", 409);
    if (data.status === "ACTIVE") {
      if (
        !["ACTIVE", "FULL"].includes(before.session.status) ||
        before.session.peacetime ||
        before.session.priorityStatus !== "AVAILABLE"
      )
        throw new AppError(
          "UNAVAILABLE",
          "This session cannot start a priority.",
          409,
        );
      if (
        await tx.priorityRequest.count({
          where: { sessionId: before.sessionId, status: "ACTIVE" },
        })
      )
        throw new AppError("CONFLICT", "Another priority is active.", 409);
    }
    const result = await tx.priorityRequest.update({
      where: { id: data.id },
      data: {
        status: data.status,
        expiresAt:
          data.status === "ACTIVE"
            ? new Date(Date.now() + before.duration * 60000)
            : undefined,
      },
    });
    if (data.status === "ACTIVE" || before.status === "ACTIVE")
      await tx.session.update({
        where: { id: before.sessionId },
        data: {
          priorityStatus: data.status === "ACTIVE" ? "ACTIVE" : "COOLDOWN",
        },
      });
    await audit(
      tx,
      actor,
      "PRIORITY_CHANGED",
      result.id,
      { status: before.status },
      { status: result.status },
    );
    await notify(
      tx,
      before.userId,
      "Priority updated",
      result.status,
      "/sessions",
    );
    return result;
  });
}
export async function economyTransaction(actor: Actor, input: unknown) {
  requirePermission(actor, "manageEconomy");
  const data = z
    .object({
      userId: id,
      amount: z
        .number()
        .int()
        .safe()
        .min(-1_000_000_000)
        .max(1_000_000_000)
        .refine((v) => v !== 0),
      type: z.enum([
        "SESSION_REWARD",
        "STAFF_REWARD",
        "PURCHASE",
        "ADMIN_ADJUSTMENT",
        "MEMBERSHIP_REWARD",
        "EVENT_REWARD",
      ]),
      reason: text,
      idempotencyKey: z.string().min(16).max(100),
    })
    .parse(input);
  return serial(async (tx) => {
    const existing = await tx.economyTransaction.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { account: true },
    });
    if (existing) {
      if (
        existing.account.userId !== data.userId ||
        existing.amount !== BigInt(data.amount) ||
        existing.type !== data.type ||
        existing.reason !== data.reason
      )
        throw new AppError(
          "CONFLICT",
          "This transaction key was used for a different transaction.",
          409,
        );
      return existing;
    }
    const account = await tx.economyAccount.upsert({
      where: { userId: data.userId },
      create: { userId: data.userId },
      update: {},
    });
    if (account.balance + BigInt(data.amount) < 0)
      throw new AppError(
        "INSUFFICIENT_FUNDS",
        "The account has insufficient funds.",
        409,
      );
    await tx.economyAccount.update({
      where: { id: account.id },
      data: { balance: { increment: BigInt(data.amount) } },
    });
    const result = await tx.economyTransaction.create({
      data: {
        accountId: account.id,
        amount: BigInt(data.amount),
        type: data.type,
        reason: data.reason,
        createdById: actor.id,
        idempotencyKey: data.idempotencyKey,
      },
    });
    await audit(tx, actor, "ECONOMY_TRANSACTION", result.id, undefined, result);
    return result;
  });
}
export async function reportAction(actor: Actor, input: unknown) {
  const data = z
    .discriminatedUnion("action", [
      z.object({
        action: z.literal("CREATE"),
        reportedUser: short,
        category: z.enum(["PLAYER", "STAFF", "RULE", "BUG"]),
        description: text,
        evidence,
        sessionId: id.optional(),
      }),
      z.object({
        action: z.literal("UPDATE"),
        id,
        status: z.enum(["CLAIMED", "INVESTIGATING", "RESOLVED", "DISMISSED"]),
        resolution: z.string().max(10000).optional(),
      }),
    ])
    .parse(input);
  return serial(async (tx) => {
    if (data.action === "CREATE") {
      const { action: _action, ...fields } = data;
      const result = await tx.report.create({
        data: { ...fields, userId: actor.id },
      });
      await audit(tx, actor, "REPORT_CREATED", result.id);
      return result;
    }
    requirePermission(actor, "manageReports");
    const before = found(
      await tx.report.findUnique({ where: { id: data.id } }),
    );
    if (["RESOLVED", "DISMISSED"].includes(before.status))
      throw new AppError("CLOSED", "This report is closed.", 409);
    if (before.claimedById && before.claimedById !== actor.id)
      throw new AppError(
        "ALREADY_CLAIMED",
        "Another staff member has claimed this report.",
        409,
      );
    if (
      ["RESOLVED", "DISMISSED"].includes(data.status) &&
      !data.resolution?.trim()
    )
      throw new AppError("REQUIRED", "Provide a resolution.");
    const result = await tx.report.update({
      where: { id: data.id },
      data: {
        status: data.status,
        claimedById: actor.id,
        resolution: data.resolution,
      },
    });
    await audit(tx, actor, "REPORT_UPDATED", result.id, before, result);
    return result;
  });
}
export async function createApplication(actor: Actor, input: unknown) {
  requirePermission(actor, "manageApplications");
  const data = applicationInput.parse(input);
  return serial(async (tx) => {
    const result = await tx.application.create({
      data: { ...data, questions: { create: data.questions } },
    });
    await audit(tx, actor, "APPLICATION_FORM_CREATED", result.id);
    return result;
  });
}
