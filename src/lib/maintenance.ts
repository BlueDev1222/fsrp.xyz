import { db } from "./db";
export async function maintenance() {
  const now = new Date();
  const priorities = await db.priorityRequest.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
  });
  for (const priority of priorities)
    await db.$transaction(async (tx) => {
      const changed = await tx.priorityRequest.updateMany({
        where: { id: priority.id, status: "ACTIVE" },
        data: { status: "ENDED" },
      });
      if (!changed.count) return;
      await tx.session.update({
        where: { id: priority.sessionId },
        data: { priorityStatus: "COOLDOWN" },
      });
      await tx.auditLog.create({
        data: { action: "PRIORITY_EXPIRED", target: priority.id },
      });
      await tx.notification.create({
        data: {
          userId: priority.userId,
          title: "Priority ended",
          body: "Your scene time has ended. The session is now in cooldown.",
          href: "/sessions",
        },
      });
    });
  const moderations = await db.moderation.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
  });
  for (const moderation of moderations)
    await db.$transaction(async (tx) => {
      const changed = await tx.moderation.updateMany({
        where: { id: moderation.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
      if (changed.count)
        await tx.auditLog.create({
          data: { action: "MODERATION_EXPIRED", target: moderation.id },
        });
    });
  await db.authSession.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.rateLimit.deleteMany({
    where: { window: { lt: new Date(now.getTime() - 86400_000) } },
  });
}
