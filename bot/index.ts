import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { db } from "../src/lib/db";
import { AppError, type Actor, requirePermission } from "../src/lib/policy";
import {
  createModeration,
  createSession,
  updateSession,
  requestPriority,
} from "../src/lib/services";
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const clientId = process.env.DISCORD_CLIENT_ID;
const origin = process.env.APP_URL;
if (!token || !guildId || !clientId || !origin) {
  console.log(
    "Bot disabled: configure DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_CLIENT_ID, and APP_URL.",
  );
  process.exit(0);
}
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  allowedMentions: { parse: [] },
});
const commands = [
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your verified community profile"),
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your community currency balance"),
  new SlashCommandBuilder()
    .setName("session")
    .setDescription("Community sessions")
    .addSubcommand((s) =>
      s.setName("status").setDescription("Current session status"),
    )
    .addSubcommand((s) =>
      s
        .setName("start")
        .setDescription("Start a session")
        .addStringOption((o) =>
          o.setName("title").setDescription("Session title").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("End a session")
        .addStringOption((o) =>
          o.setName("id").setDescription("Session ID").setRequired(true),
        ),
    ),
  new SlashCommandBuilder()
    .setName("priority")
    .setDescription("Roleplay priorities")
    .addSubcommand((s) =>
      s.setName("status").setDescription("View priority status"),
    )
    .addSubcommand((s) =>
      s
        .setName("request")
        .setDescription("Request a priority")
        .addStringOption((o) =>
          o
            .setName("scene")
            .setDescription("Describe the scene")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("participants")
            .setDescription("Participant usernames, comma separated")
            .setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("minutes")
            .setDescription("Requested minutes")
            .setMinValue(1)
            .setMaxValue(60)
            .setRequired(true),
        ),
    ),
  new SlashCommandBuilder()
    .setName("moderate")
    .setDescription("Create a moderation record")
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Action")
        .setRequired(true)
        .addChoices(
          ...["NOTE", "WARNING", "KICK", "PERMANENT_BAN"].map((value) => ({
            name: value,
            value,
          })),
        ),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("case")
    .setDescription("Look up a moderation case")
    .addIntegerOption((o) =>
      o
        .setName("number")
        .setDescription("Case number")
        .setMinValue(1)
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("appeal")
    .setDescription("Open your appeal form"),
  new SlashCommandBuilder()
    .setName("applications")
    .setDescription("View open applications"),
  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("View your last 30 days of platform activity"),
];
async function actorFor(discordId: string): Promise<Actor> {
  const user = await db.user.findUnique({
    where: { discordId },
    include: {
      roles: { include: { role: true } },
      departments: { include: { rank: true } },
    },
  });
  if (!user || user.disabled)
    throw new AppError(
      "UNAUTHENTICATED",
      `Sign in at ${origin}/login first.`,
      401,
    );
  return {
    id: user.id,
    discordId: user.discordId,
    createdAt: user.createdAt,
    roleIds: user.roles.map((r) => r.roleId),
    permissions: [...new Set(user.roles.flatMap((r) => r.role.permissions))],
    departments: user.departments
      .filter((d) => d.status === "ACTIVE")
      .map((d) => ({
        departmentId: d.departmentId,
        permissions: d.rank?.permissions ?? [],
      })),
  };
}
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.guildId !== guildId)
    return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const actor = await actorFor(interaction.user.id);
    const window = new Date(Math.floor(Date.now() / 60000) * 60000);
    const counter = await db.rateLimit.upsert({
      where: { key: `bot:${actor.id}:${window.getTime()}` },
      create: { key: `bot:${actor.id}:${window.getTime()}`, window },
      update: { count: { increment: 1 } },
    });
    if (counter.count > 20)
      throw new AppError(
        "RATE_LIMITED",
        "Please wait before using more commands.",
      );
    let message = "";
    switch (interaction.commandName) {
      case "profile": {
        const user = await db.user.findUniqueOrThrow({
          where: { id: actor.id },
        });
        message = `${user.username}\nRoblox: ${user.robloxUsername ?? "Not linked"}\n${origin}/dashboard/profile`;
        break;
      }
      case "balance": {
        const account = await db.economyAccount.findUnique({
          where: { userId: actor.id },
        });
        message = `Community balance: ${account?.balance.toString() ?? "0"}`;
        break;
      }
      case "session": {
        const action = interaction.options.getSubcommand();
        if (action === "start") {
          const session = await createSession(actor, {
            title: interaction.options.getString("title", true),
            startsAt: new Date().toISOString(),
          });
          await updateSession(actor, { id: session.id, status: "ACTIVE" });
          message = `Session started: ${session.title}\nID: ${session.id}`;
        } else if (action === "end") {
          await updateSession(actor, {
            id: interaction.options.getString("id", true),
            status: "ENDED",
          });
          message = "Session ended.";
        } else {
          const session = await db.session.findFirst({
            where: { status: { in: ["ACTIVE", "FULL", "STARTING_SOON"] } },
            orderBy: { startsAt: "desc" },
          });
          message = session
            ? `${session.title}: ${session.status}\n${session.playerCount}/${session.maxPlayers} players\nID: ${session.id}`
            : "No active session.";
        }
        break;
      }
      case "priority": {
        const session = await db.session.findFirst({
          where: { status: { in: ["ACTIVE", "FULL"] } },
          orderBy: { startsAt: "desc" },
        });
        if (!session) throw new AppError("INACTIVE", "No active session.");
        if (interaction.options.getSubcommand() === "status")
          message = `Priority: ${session.priorityStatus}\nPeacetime: ${session.peacetime ? "On" : "Off"}`;
        else {
          await requestPriority(actor, {
            sessionId: session.id,
            type: "Discord request",
            participants: interaction.options
              .getString("participants", true)
              .split(",")
              .map((s) => s.trim()),
            description: interaction.options.getString("scene", true),
            duration: interaction.options.getInteger("minutes", true),
          });
          message = "Priority request sent for staff review.";
        }
        break;
      }
      case "moderate": {
        const target = await db.user.findUnique({
          where: { discordId: interaction.options.getUser("user", true).id },
        });
        if (!target)
          throw new AppError(
            "NOT_FOUND",
            "That member has not linked their account.",
          );
        const record = await createModeration(actor, {
          userId: target.id,
          type: interaction.options.getString("type", true),
          reason: interaction.options.getString("reason", true),
        });
        message = `Created case #${record.number}. This records the moderation on the platform.`;
        break;
      }
      case "case": {
        requirePermission(actor, "viewModerations");
        const record = await db.moderation.findUnique({
          where: { number: interaction.options.getInteger("number", true) },
        });
        message = record
          ? `Case #${record.number} · ${record.type}\n${record.reason}\n${record.status}`
          : "Case not found.";
        break;
      }
      case "appeal":
        message = `${origin}/appeals`;
        break;
      case "applications":
        message = `${origin}/applications`;
        break;
      case "activity": {
        const count = await db.auditLog.count({
          where: {
            actorId: actor.id,
            createdAt: { gte: new Date(Date.now() - 30 * 86400_000) },
          },
        });
        message = `${count} recorded platform actions in the last 30 days.`;
        break;
      }
    }
    await interaction.editReply({
      content: message.slice(0, 1900),
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    await interaction.editReply({
      content:
        error instanceof AppError
          ? error.message
          : "Unable to complete this action. Please try again.",
      allowedMentions: { parse: [] },
    });
  }
});
async function syncRoles(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      departments: { include: { department: true, rank: true } },
      memberships: { include: { membership: true } },
    },
  });
  const [roles, departments, ranks, memberships] = await Promise.all([
    db.role.findMany(),
    db.department.findMany(),
    db.departmentRank.findMany(),
    db.membership.findMany(),
  ]);
  const managed = new Set(
    [...roles, ...departments, ...ranks, ...memberships]
      .map((r) => r.discordRoleId)
      .filter((id): id is string => Boolean(id)),
  );
  const desired = new Set(
    [
      ...user.roles.map((r) => r.role.discordRoleId),
      ...user.departments
        .filter(
          (d) =>
            d.status === "ACTIVE" &&
            (!d.suspensionUntil || d.suspensionUntil < new Date()),
        )
        .flatMap((d) => [d.department.discordRoleId, d.rank?.discordRoleId]),
      ...user.memberships
        .filter((m) => !m.expiresAt || m.expiresAt > new Date())
        .map((m) => m.membership.discordRoleId),
    ].filter((id): id is string => Boolean(id)),
  );
  const guild = await client.guilds.fetch(guildId!);
  const member = await guild.members.fetch(user.discordId);
  const added: string[] = [],
    removed: string[] = [];
  for (const role of desired)
    if (!member.roles.cache.has(role)) {
      await member.roles.add(role, "Community role sync");
      added.push(role);
    }
  for (const role of managed)
    if (!desired.has(role) && member.roles.cache.has(role)) {
      await member.roles.remove(role, "Community role sync");
      removed.push(role);
    }
  await db.auditLog.create({
    data: {
      action: "DISCORD_ROLES_SYNCED",
      target: userId,
      after: { added, removed },
    },
  });
}
let working = false;
async function tick() {
  if (working) return;
  working = true;
  try {
    const expired = await db.priorityRequest.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    });
    for (const p of expired)
      await db.$transaction(async (tx) => {
        const changed = await tx.priorityRequest.updateMany({
          where: { id: p.id, status: "ACTIVE" },
          data: { status: "ENDED" },
        });
        if (changed.count) {
          await tx.session.update({
            where: { id: p.sessionId },
            data: { priorityStatus: "COOLDOWN" },
          });
          await tx.auditLog.create({
            data: { action: "PRIORITY_EXPIRED", target: p.id },
          });
        }
      });
    await db.moderation.updateMany({
      where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    });
    await db.rateLimit.deleteMany({
      where: { window: { lt: new Date(Date.now() - 86400_000) } },
    });
    await db.authSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const jobs = await db.outbox.findMany({
      where: {
        sentAt: null,
        availableAt: { lte: new Date() },
        attempts: { lt: 10 },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    for (const job of jobs) {
      const claim = await db.outbox.updateMany({
        where: { id: job.id, sentAt: null, availableAt: job.availableAt },
        data: {
          availableAt: new Date(Date.now() + 300000),
          attempts: { increment: 1 },
        },
      });
      if (!claim.count) continue;
      try {
        const data = job.payload as Record<string, string>;
        if (job.type === "ROLE_SYNC") await syncRoles(data.userId);
        else {
          if (!process.env.DISCORD_NOTIFICATION_CHANNEL_ID)
            throw new Error("Notification channel is not configured");
          const channel = await client.channels.fetch(
            process.env.DISCORD_NOTIFICATION_CHANNEL_ID,
          );
          if (!channel?.isSendable())
            throw new Error("Channel cannot receive messages");
          await channel.send({
            content: `**${data.title}**\n${data.message}`.slice(0, 1900),
            allowedMentions: { parse: [] },
          });
        }
        await db.outbox.update({
          where: { id: job.id },
          data: { sentAt: new Date() },
        });
      } catch {
        await db.outbox.update({
          where: { id: job.id },
          data: {
            availableAt: new Date(
              Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts),
            ),
          },
        });
        console.error(`Outbox job ${job.id} failed; retry scheduled.`);
      }
    }
  } finally {
    working = false;
  }
}
client.once("clientReady", async () => {
  await new REST()
    .setToken(token!)
    .put(Routes.applicationGuildCommands(clientId!, guildId!), {
      body: commands.map((c) => c.toJSON()),
    });
  console.log("Community bot ready. Commands registered.");
  setInterval(
    () => tick().catch(() => console.error("Worker tick failed")),
    10000,
  );
});
await client.login(token);
