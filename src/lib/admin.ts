import { z } from "zod";
import { db } from "./db";
import { audit } from "./services";
import {
  AppError,
  type Actor,
  requirePermission,
  requireDepartment,
} from "./policy";
import { id, short, text, url } from "./validation";
export const adminSchemas = {
  departments: z.object({
    name: short,
    abbreviation: z.string().regex(/^[A-Z0-9-]{2,12}$/),
    description: text,
    discordInvite: url.optional(),
    handbook: z.string().max(50000).default(""),
    callsignFormat: short.default("1A-###"),
    activityRequirements: z.string().max(10000).default(""),
    applicationsOpen: z.boolean().default(true),
  }),
  rules: z.object({
    title: short,
    description: text,
    category: short,
    examples: z.string().max(10000).default(""),
    punishment: z.string().max(10000).default(""),
    position: z.number().int().min(0).default(0),
  }),
  restrictions: z.object({
    name: short,
    category: z.enum(["Vehicles", "Weapons", "Other"]),
    restriction: short,
    requiredRole: short,
    notes: z.string().max(10000).default(""),
  }),
  products: z.object({
    name: short,
    description: text,
    category: short,
    price: short,
    purchaseUrl: url,
    available: z.boolean().default(true),
    position: z.number().int().min(0).default(0),
  }),
  memberships: z.object({
    name: short,
    benefits: z.array(short).max(50),
    discordRoleId: z
      .string()
      .regex(/^\d{17,20}$/)
      .optional(),
    position: z.number().int().min(0).default(0),
  }),
  roles: z.object({
    name: short,
    permissions: z.array(short).max(100),
    position: z.number().int().min(0).default(0),
    discordRoleId: z
      .string()
      .regex(/^\d{17,20}$/)
      .optional(),
  }),
  announcements: z.object({
    title: short,
    body: text,
    category: short.default("COMMUNITY"),
    pinned: z.boolean().default(false),
    expiresAt: z.iso.datetime().optional(),
  }),
};
export async function saveAdmin(
  actor: Actor,
  resource: string,
  input: unknown,
) {
  const envelope = z
    .object({ id: id.optional(), data: z.unknown() })
    .parse(input);
  const permissions: Record<string, string> = {
    departments: "manageDepartments",
    rules: "manageCommunitySettings",
    restrictions: "manageCommunitySettings",
    products: "manageShop",
    memberships: "manageShop",
    roles: "managePermissions",
    announcements: "manageAnnouncements",
  };
  if (!(resource in adminSchemas))
    throw new AppError("NOT_FOUND", "Unknown resource.", 404);
  requirePermission(actor, permissions[resource]);
  return db.$transaction(async (tx) => {
    let result: { id: string };
    switch (resource) {
      case "departments": {
        const data = adminSchemas.departments.parse(envelope.data);
        result = envelope.id
          ? await tx.department.update({ where: { id: envelope.id }, data })
          : await tx.department.create({ data });
        break;
      }
      case "rules": {
        const data = adminSchemas.rules.parse(envelope.data);
        result = envelope.id
          ? await tx.rule.update({ where: { id: envelope.id }, data })
          : await tx.rule.create({ data });
        break;
      }
      case "restrictions": {
        const data = adminSchemas.restrictions.parse(envelope.data);
        result = envelope.id
          ? await tx.restrictedItem.update({ where: { id: envelope.id }, data })
          : await tx.restrictedItem.create({ data });
        break;
      }
      case "products": {
        const data = adminSchemas.products.parse(envelope.data);
        result = envelope.id
          ? await tx.shopProduct.update({ where: { id: envelope.id }, data })
          : await tx.shopProduct.create({ data });
        break;
      }
      case "memberships": {
        const data = adminSchemas.memberships.parse(envelope.data);
        result = envelope.id
          ? await tx.membership.update({ where: { id: envelope.id }, data })
          : await tx.membership.create({ data });
        break;
      }
      case "roles": {
        const data = adminSchemas.roles.parse(envelope.data);
        if (data.permissions.includes("*") && !actor.permissions.includes("*"))
          throw new AppError(
            "FORBIDDEN",
            "Only ownership can grant full access.",
            403,
          );
        if (
          data.permissions.some(
            (p) =>
              !actor.permissions.includes("*") &&
              !actor.permissions.includes(p),
          )
        )
          throw new AppError(
            "FORBIDDEN",
            "You cannot grant permissions you do not have.",
            403,
          );
        if (
          envelope.id &&
          (
            await tx.role.findUnique({ where: { id: envelope.id } })
          )?.permissions.includes("*")
        )
          throw new AppError(
            "PROTECTED",
            "Ownership is managed with the bootstrap command.",
            403,
          );
        result = envelope.id
          ? await tx.role.update({ where: { id: envelope.id }, data })
          : await tx.role.create({ data });
        break;
      }
      default: {
        const data = adminSchemas.announcements.parse(envelope.data);
        result = envelope.id
          ? await tx.announcement.update({ where: { id: envelope.id }, data })
          : await tx.announcement.create({
              data: { ...data, authorId: actor.id },
            });
      }
    }
    await audit(
      tx,
      actor,
      `${resource.toUpperCase()}_SAVED`,
      result.id,
      undefined,
      result,
    );
    return result;
  });
}
export const communitySchema = z.object({
  name: short,
  abbreviation: z.string().regex(/^[A-Z0-9]{2,12}$/),
  description: text,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  discordInvite: url,
  robloxGroupUrl: url,
  serverUrl: url.optional(),
  schedule: short,
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }),
  logo: z
    .string()
    .regex(/^\/brand\/[a-z0-9.-]+$/)
    .default("/brand/logo.gif"),
  banner: z
    .string()
    .regex(/^\/brand\/[a-z0-9.-]+$/)
    .default("/brand/dashboard.png"),
});
export async function saveCommunity(actor: Actor, input: unknown) {
  requirePermission(actor, "manageCommunitySettings");
  const data = communitySchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.community.findUnique({
      where: { id: "community" },
    });
    const result = await tx.community.upsert({
      where: { id: "community" },
      create: data,
      update: data,
    });
    await audit(tx, actor, "SETTINGS_CHANGED", result.id, before, result);
    return result;
  });
}
export async function assignRole(actor: Actor, input: unknown) {
  requirePermission(actor, "manageStaff");
  requirePermission(actor, "managePermissions");
  const data = z
    .object({ userId: id, roleId: id, remove: z.boolean().default(false) })
    .parse(input);
  return db.$transaction(async (tx) => {
    const role = await tx.role.findUniqueOrThrow({
      where: { id: data.roleId },
    });
    if (role.permissions.includes("*"))
      throw new AppError(
        "PROTECTED",
        "Ownership is managed with the bootstrap command.",
        403,
      );
    if (
      !actor.permissions.includes("*") &&
      role.permissions.some((p) => !actor.permissions.includes(p))
    )
      throw new AppError(
        "FORBIDDEN",
        "You cannot grant permissions you do not hold.",
        403,
      );
    if (data.remove)
      await tx.userRole.deleteMany({
        where: { userId: data.userId, roleId: data.roleId },
      });
    else
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: data.userId, roleId: data.roleId } },
        create: { userId: data.userId, roleId: data.roleId },
        update: {},
      });
    await audit(tx, actor, "ROLE_CHANGED", data.userId, undefined, data);
    await tx.outbox.create({
      data: { type: "ROLE_SYNC", payload: { userId: data.userId } },
    });
    return { updated: true };
  });
}
export async function departmentAction(actor: Actor, input: unknown) {
  const data = z
    .discriminatedUnion("action", [
      z.object({
        action: z.literal("MEMBER"),
        departmentId: id,
        userId: id,
        rankId: id.optional(),
        callsign: z.string().max(30).optional(),
        status: z.enum(["ACTIVE", "SUSPENDED", "REMOVED"]).default("ACTIVE"),
        strikes: z.number().int().min(0).max(100).default(0),
      }),
      z.object({
        action: z.literal("RANK"),
        departmentId: id,
        id: id.optional(),
        name: short,
        position: z.number().int().min(0),
        permissions: z.array(short),
        discordRoleId: z
          .string()
          .regex(/^\d{17,20}$/)
          .optional(),
      }),
      z.object({
        action: z.literal("DIVISION"),
        departmentId: id,
        name: short,
        description: text,
      }),
    ])
    .parse(input);
  requireDepartment(
    actor,
    data.departmentId,
    data.action === "DIVISION" ? "manageDivisions" : "manageMembers",
  );
  return db.$transaction(async (tx) => {
    if (data.action === "MEMBER") {
      const department = await tx.department.findUniqueOrThrow({
        where: { id: data.departmentId },
      });
      if (data.rankId) {
        const rank = await tx.departmentRank.findUniqueOrThrow({
          where: { id: data.rankId },
        });
        if (rank.departmentId !== data.departmentId)
          throw new AppError(
            "INVALID_RANK",
            "Rank does not belong to this department.",
          );
      }
      if (data.callsign) {
        const pattern = department.callsignFormat
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace("###", "[1-9][0-9]{2}");
        if (!new RegExp(`^${pattern}$`).test(data.callsign))
          throw new AppError(
            "INVALID_CALLSIGN",
            `Use ${department.callsignFormat}.`,
          );
      }
      const { action: _a, ...fields } = data;
      const result = await tx.departmentMember.upsert({
        where: {
          userId_departmentId: {
            userId: data.userId,
            departmentId: data.departmentId,
          },
        },
        create: fields,
        update: {
          ...fields,
          callsign: data.status === "REMOVED" ? null : fields.callsign,
        },
      });
      await audit(
        tx,
        actor,
        "DEPARTMENT_MEMBER_CHANGED",
        result.id,
        undefined,
        result,
      );
      await tx.outbox.create({
        data: { type: "ROLE_SYNC", payload: { userId: data.userId } },
      });
      return result;
    }
    if (data.action === "RANK") {
      requirePermission(actor, "manageDepartments");
      if (
        data.id &&
        (await tx.departmentRank.findUniqueOrThrow({ where: { id: data.id } }))
          .departmentId !== data.departmentId
      )
        throw new AppError(
          "INVALID_RANK",
          "Rank belongs to another department.",
        );
      const { action: _a, id: rankId, ...fields } = data;
      const result = rankId
        ? await tx.departmentRank.update({
            where: { id: rankId },
            data: fields,
          })
        : await tx.departmentRank.create({ data: fields });
      await audit(
        tx,
        actor,
        "DEPARTMENT_RANK_CHANGED",
        result.id,
        undefined,
        result,
      );
      return result;
    }
    const result = await tx.division.create({
      data: {
        departmentId: data.departmentId,
        name: data.name,
        description: data.description,
      },
    });
    await audit(tx, actor, "DIVISION_CREATED", result.id);
    return result;
  });
}
