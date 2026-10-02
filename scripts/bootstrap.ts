import "dotenv/config";
import { db } from "../src/lib/db";
async function main() {
  const discordId = process.env.BOOTSTRAP_DISCORD_ID;
  if (!discordId || !/^\d{17,20}$/.test(discordId))
    throw new Error(
      "Set BOOTSTRAP_DISCORD_ID to the owner's verified Discord ID. Sign in first.",
    );
  const user = await db.user.findUnique({ where: { discordId } });
  if (!user)
    throw new Error("This Discord account must sign in before bootstrap.");
  await db.$transaction(async (tx) => {
    const role = await tx.role.upsert({
      where: { name: "Ownership" },
      create: { name: "Ownership", permissions: ["*"] },
      update: {},
    });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "OWNER_BOOTSTRAPPED", target: user.id },
    });
  });
  console.log(
    `Ownership granted to verified Discord ID ${discordId}. Remove BOOTSTRAP_DISCORD_ID from the environment now.`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
