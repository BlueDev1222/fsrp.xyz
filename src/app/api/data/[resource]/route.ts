import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { AppError, can, requirePermission } from "@/lib/policy";
import { errorResponse, json, rateLimit } from "@/lib/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    const actor = await requireActor();
    await rateLimit(`read:${actor.id}`, 150);
    const { resource } = await context.params;
    const search = new URL(request.url).searchParams;
    const page = Math.max(1, Math.min(10000, Number(search.get("page")) || 1));
    const q = (search.get("q") ?? "").slice(0, 100);
    const query = { take: 25, skip: (page - 1) * 25 };
    const staff = search.get("scope") === "staff";
    let data: unknown;
    switch (resource) {
      case "moderations": {
        if (staff) requirePermission(actor, "viewModerations");
        data = await db.moderation.findMany({
          ...query,
          where: {
            ...(staff ? {} : { userId: actor.id }),
            ...(q
              ? {
                  OR: [
                    { reason: { contains: q, mode: "insensitive" } },
                    {
                      user: { username: { contains: q, mode: "insensitive" } },
                    },
                    { user: { discordId: q } },
                    { user: { robloxId: q } },
                    ...(Number.isInteger(Number(q))
                      ? [{ number: Number(q) }]
                      : []),
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            number: true,
            type: true,
            reason: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            evidence: true,
            user: { select: { username: true } },
            moderator: { select: { username: true } },
            ...(staff ? { internalNotes: true } : {}),
          },
        });
        break;
      }
      case "applications": {
        if (staff) requirePermission(actor, "manageApplications");
        data = await db.applicationSubmission.findMany({
          ...query,
          where: { ...(staff ? {} : { userId: actor.id }) },
          orderBy: { createdAt: "desc" },
          include: {
            application: { select: { title: true } },
            user: { select: { username: true } },
            answers: { include: { question: { select: { label: true } } } },
            ...(staff ? { reviews: true } : {}),
          },
        });
        break;
      }
      case "appeals": {
        if (staff) requirePermission(actor, "viewAppeals");
        data = await db.appeal.findMany({
          ...query,
          where: staff ? {} : { userId: actor.id },
          orderBy: { createdAt: "desc" },
          include: {
            moderation: { select: { number: true, reason: true, type: true } },
            ...(staff ? { actions: true } : {}),
          },
        });
        break;
      }
      case "reports": {
        if (staff) requirePermission(actor, "manageReports");
        data = await db.report.findMany({
          ...query,
          where: staff ? {} : { userId: actor.id },
          orderBy: { createdAt: "desc" },
        });
        break;
      }
      case "economy": {
        data = await db.economyTransaction.findMany({
          ...query,
          where: { account: { userId: actor.id } },
          orderBy: { createdAt: "desc" },
        });
        break;
      }
      case "notifications": {
        data = await db.notification.findMany({
          ...query,
          where: { userId: actor.id },
          orderBy: { createdAt: "desc" },
        });
        break;
      }
      case "attendance": {
        if (staff) requirePermission(actor, "manageSessions");
        data = await db.sessionAttendance.findMany({
          ...query,
          where: staff ? {} : { userId: actor.id },
          include: {
            session: { select: { title: true } },
            user: { select: { username: true } },
          },
          orderBy: { joinedAt: "desc" },
        });
        break;
      }
      case "priority": {
        data = await db.priorityRequest.findMany({
          ...query,
          where: can(actor, "manageSessions") ? {} : { userId: actor.id },
          orderBy: { createdAt: "desc" },
        });
        break;
      }
      case "logs": {
        requirePermission(actor, "viewAuditLogs");
        data = await db.auditLog.findMany({
          ...query,
          where: {
            ...(q
              ? {
                  OR: [
                    { action: { contains: q, mode: "insensitive" } },
                    { target: q },
                    {
                      actor: { username: { contains: q, mode: "insensitive" } },
                    },
                  ],
                }
              : {}),
          },
          include: { actor: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
        });
        break;
      }
      case "users": {
        requirePermission(actor, "viewStaff");
        data = await db.user.findMany({
          ...query,
          where: {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { robloxUsername: { contains: q, mode: "insensitive" } },
              { discordId: q },
              { robloxId: q },
            ],
          },
          select: {
            id: true,
            username: true,
            discordId: true,
            robloxId: true,
            robloxUsername: true,
            lastActiveAt: true,
            roles: { include: { role: { select: { name: true } } } },
          },
        });
        break;
      }
      case "characters": {
        const all = can(actor, "cadLaw") || can(actor, "cadDispatch");
        data = await db.cADCharacter.findMany({
          ...query,
          where: {
            ...(all ? {} : { userId: actor.id }),
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              {
                vehicles: {
                  some: { plate: { contains: q, mode: "insensitive" } },
                },
              },
            ],
          },
          include: {
            vehicles: true,
            licenses: true,
            ...(all ? { citations: true, warrants: true, arrests: true } : {}),
          },
        });
        break;
      }
      case "calls": {
        if (!can(actor, "cadLaw") && !can(actor, "cadFire"))
          requirePermission(actor, "cadDispatch");
        data = await db.cADCall.findMany({
          ...query,
          where: { status: "OPEN" },
          include: { units: true },
          orderBy: { priority: "asc" },
        });
        break;
      }
      case "units": {
        if (!can(actor, "cadLaw") && !can(actor, "cadFire"))
          requirePermission(actor, "cadDispatch");
        data = await db.cADUnit.findMany({
          ...query,
          include: { call: { select: { title: true } } },
        });
        break;
      }
      default:
        throw new AppError("NOT_FOUND", "Resource not found.", 404);
    }
    return json({
      success: true,
      data,
      page,
      pageSize: 25,
      hasMore: Array.isArray(data) && data.length === 25,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
