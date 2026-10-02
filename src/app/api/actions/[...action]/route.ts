import { z } from "zod";
import { requireActor } from "@/lib/auth";
import { assertOrigin, AppError, requirePermission } from "@/lib/policy";
import { errorResponse, json, rateLimit, readBody } from "@/lib/http";
import * as service from "@/lib/services";
import {
  assignRole,
  departmentAction,
  saveAdmin,
  saveCommunity,
} from "@/lib/admin";
import { cadAction } from "@/lib/cad";
import { db } from "@/lib/db";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string[] }> },
) {
  try {
    assertOrigin(
      request.headers.get("origin"),
      process.env.APP_URL ?? "http://localhost:3000",
    );
    const actor = await requireActor();
    await rateLimit(`action:${actor.id}`);
    const input = await readBody(request);
    const { action } = await context.params;
    const key = action.join("/");
    const actions: Record<
      string,
      (
        actor: Parameters<typeof service.submitApplication>[0],
        input: unknown,
      ) => Promise<unknown>
    > = {
      "applications/submit": service.submitApplication,
      "applications/review": service.reviewApplication,
      "applications/create": service.createApplication,
      "moderations/create": service.createModeration,
      "appeals/create": service.createAppeal,
      "appeals/review": service.reviewAppeal,
      "sessions/create": service.createSession,
      "sessions/update": service.updateSession,
      "sessions/attendance": service.attendance,
      "priority/request": service.requestPriority,
      "priority/decide": service.decidePriority,
      "economy/transaction": service.economyTransaction,
      "reports/action": service.reportAction,
      "departments/action": departmentAction,
      "settings/save": saveCommunity,
      "roles/assign": assignRole,
    };
    let result: unknown;
    if (actions[key]) result = await actions[key](actor, input);
    else if (action[0] === "admin" && action.length === 2)
      result = await saveAdmin(actor, action[1], input);
    else if (action[0] === "cad" && action.length === 2)
      result = await cadAction(actor, action[1], input);
    else if (key === "notifications/read") {
      const data = z.object({ id: z.string() }).parse(input);
      result = await db.notification.updateMany({
        where: { id: data.id, userId: actor.id },
        data: { readAt: new Date() },
      });
    } else if (key === "applications/withdraw") {
      const data = z.object({ id: z.string() }).parse(input);
      result = await db.$transaction(async (tx) => {
        const updated = await tx.applicationSubmission.updateMany({
          where: {
            id: data.id,
            userId: actor.id,
            status: { in: ["PENDING", "UNDER_REVIEW", "INTERVIEW"] },
          },
          data: { status: "WITHDRAWN" },
        });
        if (!updated.count)
          throw new AppError(
            "CONFLICT",
            "Application cannot be withdrawn.",
            409,
          );
        await service.audit(tx, actor, "APPLICATION_WITHDRAWN", data.id);
        return updated;
      });
    } else if (key === "moderations/revoke") {
      requirePermission(actor, "editModeration");
      const data = z
        .object({ id: z.string(), reason: z.string().min(3).max(10000) })
        .parse(input);
      result = await db.$transaction(async (tx) => {
        const before = await tx.moderation.findUniqueOrThrow({
          where: { id: data.id },
        });
        const updated = await tx.moderation.update({
          where: { id: data.id },
          data: { status: "REVOKED" },
        });
        await service.audit(tx, actor, "MODERATION_REVOKED", data.id, before, {
          ...updated,
          revocationReason: data.reason,
        });
        return updated;
      });
    } else if (key === "membership/assign") {
      requirePermission(actor, "manageShop");
      const data = z
        .object({
          userId: z.string(),
          membershipId: z.string(),
          expiresAt: z.iso.datetime().optional(),
        })
        .parse(input);
      result = await db.$transaction(async (tx) => {
        const updated = await tx.userMembership.upsert({
          where: {
            userId_membershipId: {
              userId: data.userId,
              membershipId: data.membershipId,
            },
          },
          create: data,
          update: { expiresAt: data.expiresAt },
        });
        await service.audit(
          tx,
          actor,
          "MEMBERSHIP_ASSIGNED",
          data.userId,
          undefined,
          updated,
        );
        await tx.outbox.create({
          data: { type: "ROLE_SYNC", payload: { userId: data.userId } },
        });
        return updated;
      });
    } else if (key === "settings/preferences") {
      const data = z
        .object({ announcements: z.boolean(), sessions: z.boolean() })
        .parse(input);
      result = await db.user.update({
        where: { id: actor.id },
        data: { notificationPreferences: data },
        select: { notificationPreferences: true },
      });
    } else throw new AppError("NOT_FOUND", "Action not found.", 404);
    return json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
