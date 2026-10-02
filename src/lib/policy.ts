export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type Actor = {
  id: string;
  permissions: string[];
  roleIds: string[];
  discordId: string;
  createdAt: Date;
  departments: { departmentId: string; permissions: string[] }[];
};
export function can(actor: Actor | null, permission: string) {
  return Boolean(
    actor &&
      (actor.permissions.includes("*") ||
        actor.permissions.includes(permission)),
  );
}
export function requirePermission(actor: Actor | null, permission: string) {
  if (!actor)
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401);
  if (!can(actor, permission))
    throw new AppError(
      "INSUFFICIENT_PERMISSION",
      "You do not have permission to perform this action.",
      403,
    );
}
export function requireDepartment(
  actor: Actor,
  id: string,
  permission: string,
) {
  if (can(actor, "manageDepartments")) return;
  if (
    !actor.departments.some(
      (d) => d.departmentId === id && d.permissions.includes(permission),
    )
  )
    throw new AppError(
      "INSUFFICIENT_PERMISSION",
      "You do not have this department permission.",
      403,
    );
}
export function ownOrPermission(
  actor: Actor,
  ownerId: string,
  permission: string,
) {
  if (actor.id !== ownerId) requirePermission(actor, permission);
}
export function assertTransition(
  current: string,
  next: string,
  transitions: Record<string, readonly string[]>,
) {
  if (!transitions[current]?.includes(next))
    throw new AppError(
      "INVALID_TRANSITION",
      `Cannot change ${current} to ${next}.`,
      409,
    );
}
export const sessionTransitions = {
  SCHEDULED: ["STARTING_SOON", "ACTIVE", "CANCELLED"],
  STARTING_SOON: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["FULL", "ENDED"],
  FULL: ["ACTIVE", "ENDED"],
  ENDED: [],
  CANCELLED: [],
};
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
export function assertOrigin(origin: string | null, expected: string) {
  if (!origin || origin !== new URL(expected).origin)
    throw new AppError(
      "INVALID_ORIGIN",
      "Request origin could not be verified.",
      403,
    );
}
