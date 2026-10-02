import "dotenv/config";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/db";
async function main() {
  const community = await db.community.upsert({
    where: { id: "community" },
    create: {},
    update: {},
  });
  const roles = [
    ["Ownership", ["*"]],
    [
      "Administrator",
      [
        "viewModerations",
        "createModeration",
        "editModeration",
        "banUsers",
        "permanentBan",
        "viewAppeals",
        "manageAppeals",
        "manageApplications",
        "manageSessions",
        "manageDepartments",
        "manageReports",
        "manageEconomy",
        "manageShop",
        "manageAnnouncements",
        "viewStaff",
        "viewAuditLogs",
        "manageCommunitySettings",
        "cadLaw",
        "cadFire",
        "cadDispatch",
      ],
    ],
    [
      "Moderator",
      [
        "viewModerations",
        "createModeration",
        "banUsers",
        "viewAppeals",
        "manageReports",
        "manageSessions",
        "viewStaff",
      ],
    ],
    ["Trial Moderator", ["viewModerations", "createModeration", "viewStaff"]],
    ["Law Enforcement", ["cadLaw"]],
    ["Fire / EMS", ["cadFire"]],
    ["Dispatch", ["cadDispatch"]],
  ] as const;
  for (let i = 0; i < roles.length; i++)
    await db.role.upsert({
      where: { name: roles[i][0] },
      create: { name: roles[i][0], permissions: [...roles[i][1]], position: i },
      update: {},
    });
  const departmentText = await readFile(
    "reference/Florida State Departments.md",
    "utf8",
  );
  const names = [
    "Florida Highway Patrol",
    "Hillsborough County Sheriff's Office",
    "Tampa Fire Department",
    "Tampa Police Department",
    "Department Hub",
    "Special Response Team",
    "Florida Department of Transportation",
    "Florida Government",
  ];
  const abbreviations = [
    "FHP",
    "HCSO",
    "TFD",
    "TPD",
    "HUB",
    "SRT",
    "FDOT",
    "GOV",
  ];
  for (let i = 0; i < names.length; i++) {
    const part = departmentText
      .slice(departmentText.indexOf(names[i]) + names[i].length)
      .trim();
    const invite = part.match(/https:\/\/discord\.gg\/\w+/)?.[0];
    const description = part.split("https:")[0].trim();
    const department = await db.department.upsert({
      where: { abbreviation: abbreviations[i] },
      create: {
        name: names[i],
        abbreviation: abbreviations[i],
        description,
        discordInvite: invite,
        applicationsOpen: i !== 4 && i !== 5,
        callsignFormat: i === 3 ? "1A-###" : `${abbreviations[i]}-###`,
        handbook:
          "See your department leadership and the department regulations for current procedures.",
      },
      update: {},
    });
    for (const [position, name] of [
      "Chief",
      "Captain",
      "Sergeant",
      "Officer",
    ].entries())
      await db.departmentRank.upsert({
        where: { departmentId_name: { departmentId: department.id, name } },
        create: {
          departmentId: department.id,
          name,
          position,
          permissions:
            position === 0
              ? ["manageMembers", "manageApplications", "manageDivisions"]
              : [],
        },
        update: {},
      });
    if (
      !(await db.application.findFirst({
        where: { departmentId: department.id },
      })) &&
      department.applicationsOpen
    )
      await db.application.create({
        data: {
          title: `${department.abbreviation} Application`,
          description: `Apply to join ${department.name}. Tell us about your experience and approach to realistic roleplay.`,
          departmentId: department.id,
          requiredRoles: [],
          questions: {
            create: [
              {
                label: "Why do you want to join this department?",
                type: "LONG",
                options: [],
                position: 0,
              },
              {
                label: "Describe your previous roleplay experience.",
                type: "LONG",
                options: [],
                position: 1,
              },
              {
                label: "Can you follow department activity requirements?",
                type: "YESNO",
                options: [],
                position: 2,
              },
            ],
          },
        },
      });
  }
  if (!(await db.application.findFirst({ where: { kind: "STAFF" } })))
    await db.application.create({
      data: {
        title: "Staff Application",
        description:
          "Help make Florida a welcoming, fair, and well-moderated community.",
        kind: "STAFF",
        minimumAccountDays: 30,
        requiredRoles: [],
        acceptedRoleId: (await db.role.findUnique({
          where: { name: "Trial Moderator" },
        }))!.id,
        questions: {
          create: [
            {
              label: "Why would you like to join the staff team?",
              type: "LONG",
              options: [],
            },
            {
              label: "How would you handle a disputed moderation?",
              type: "LONG",
              options: [],
              position: 1,
            },
          ],
        },
      },
    });
  if (!(await db.rule.count())) {
    const rules = await readFile("reference/Game Regulations.md", "utf8");
    for (const match of rules.matchAll(
      /Rule (\d+) \| ([^\r\n]+)\r?\n([\s\S]*?)(?=Rule \d+ \||$)/g,
    ))
      await db.rule.create({
        data: {
          title: match[2].replaceAll("\\&", "&"),
          description: match[3].trim().replaceAll("\\&", "&"),
          category: "Game Regulations",
          position: Number(match[1]),
        },
      });
    const handbook = await readFile(
      "reference/Unwhitelisted Regulations.md",
      "utf8",
    );
    await db.rule.create({
      data: {
        title: "Unwhitelisted law enforcement",
        description: handbook.replaceAll("**", ""),
        category: "Department Regulations",
        position: 16,
      },
    });
    await db.rule.create({
      data: {
        title: "Safezones",
        description:
          "Civilian Spawn, Sheriff's Office, Police Station, Fire Departments, and DOT Station. Do not commit crimes, flee to, or start mass roleplay in these areas.",
        category: "Safezones",
        position: 17,
      },
    });
  }
  if (!(await db.restrictedItem.count())) {
    const groups = [
      [
        "Vehicles",
        "Server Booster (1 time) and Active Roleplayer",
        [
          "Navara Horizon (GTR)",
          "Truckatron (Cybertruck)",
          "Bullhorn Determinator SFP Fury",
        ],
      ],
      [
        "Vehicles",
        "Server Booster (2 times) and Active Roleplayer",
        [
          "Chevlon Corbeta",
          "Takeo Experience",
          "Leland LTS5 V Blackwing",
          "Averon Anodic",
        ],
      ],
      ["Vehicles", "Ownership approval", ["Pea Car", "Heavy Wreckers"]],
      [
        "Weapons",
        "Directive",
        ["Remington MSR", "Remington 700", "Orsis T-5000", "M249"],
      ],
      ["Weapons", "VIP or Server Booster", ["M14", "TEC-9"]],
      ["Weapons", "Server Booster (2 times)", ["PPSH-41"]],
    ] as const;
    for (const [category, requiredRole, items] of groups)
      for (const name of items)
        await db.restrictedItem.create({
          data: { name, category, requiredRole, restriction: "Restricted" },
        });
  }
  if (!(await db.shopProduct.count())) {
    const shop = await readFile("reference/Shop Info.md", "utf8");
    let category = "Memberships";
    let buffer: string[] = [];
    let position = 0;
    for (const line of shop.split(/\r?\n/)) {
      if (line.startsWith("***")) {
        category = line.replaceAll("*", "").replaceAll("\\&", "&");
        buffer = [];
      } else if (line.startsWith("https://www.roblox.com/catalog/")) {
        const [name, ...description] = buffer;
        if (name)
          await db.shopProduct.create({
            data: {
              name,
              description:
                description.join(" ") ||
                "Support the community through Roblox.",
              category,
              purchaseUrl: line.trim(),
              position: position++,
            },
          });
        buffer = [];
      } else if (
        line.trim() &&
        !line.startsWith("Welcome") &&
        !line.startsWith("Memberships are") &&
        !line.startsWith("Check out") &&
        !line.startsWith("Purchase ") &&
        !line.startsWith("Support FSRP")
      )
        buffer.push(line.trim().replaceAll("\\&", "&"));
      if (line.startsWith("Full breakdown")) buffer = [];
    }
  }
  for (const [position, name] of [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Platinum+",
  ].entries())
    await db.membership.upsert({
      where: { name },
      create: {
        name,
        position,
        benefits: [
          "Supporter role",
          "Exclusive community chats",
          "Confirm the current benefits with community support before purchasing.",
        ],
      },
      update: {},
    });
  console.log(
    `Seeded ${community.name}. No development users or administrative credentials were created.`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
