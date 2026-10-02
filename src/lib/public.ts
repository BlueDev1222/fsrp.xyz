import { db } from "./db";
export const defaultCommunity = {
  name: "Florida State Roleplay",
  abbreviation: "FSRP",
  description: "Roleplay like no other.",
  logo: "/brand/logo.gif",
  banner: "/brand/dashboard.png",
  accent: "#5261ff",
  discordInvite: "https://discord.gg/fsrp",
  robloxGroupUrl: "https://www.roblox.com/communities/1082694446",
  serverUrl: null as string | null,
  schedule: "Daily around 11:30 AM. Check Discord for schedule updates.",
  timezone: "America/New_York",
  setupComplete: false,
};
export async function publicData() {
  if (!process.env.DATABASE_URL)
    return {
      community: defaultCommunity,
      configured: false,
      departments: [],
      sessions: [],
      announcements: [],
      applications: [],
      rules: [],
      restrictions: [],
      products: [],
      memberships: [],
      counts: { members: 0, staff: 0, sessions: 0 },
    };
  const [
    community,
    departments,
    sessions,
    announcements,
    applications,
    rules,
    restrictions,
    products,
    memberships,
    members,
    staff,
    sessionCount,
  ] = await Promise.all([
    db.community.findUnique({ where: { id: "community" } }),
    db.department.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    db.session.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      orderBy: { startsAt: "desc" },
      take: 20,
      include: { host: { select: { username: true } } },
    }),
    db.announcement.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    db.application.findMany({
      where: {
        status: "OPEN",
        AND: [
          { OR: [{ opensAt: null }, { opensAt: { lte: new Date() } }] },
          { OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] },
        ],
      },
      include: {
        questions: { orderBy: { position: "asc" } },
        department: { select: { abbreviation: true } },
      },
    }),
    db.rule.findMany({ orderBy: { position: "asc" } }),
    db.restrictedItem.findMany({ orderBy: { name: "asc" } }),
    db.shopProduct.findMany({
      where: { available: true },
      orderBy: { position: "asc" },
    }),
    db.membership.findMany({ orderBy: { position: "asc" } }),
    db.user.count(),
    db.user.count({
      where: {
        roles: {
          some: {
            role: { permissions: { hasSome: ["*", "createModeration"] } },
          },
        },
      },
    }),
    db.session.count({ where: { status: "ENDED" } }),
  ]);
  return {
    community: community ?? defaultCommunity,
    configured: Boolean(community),
    departments,
    sessions,
    announcements,
    applications,
    rules,
    restrictions,
    products,
    memberships,
    counts: { members, staff, sessions: sessionCount },
  };
}
export type PublicData = Awaited<ReturnType<typeof publicData>>;
