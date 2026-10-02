import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { AppError, type Actor } from "./policy";
export const sessionCookie = "fsrp_session";
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
export const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new AppError("NOT_CONFIGURED", "Sign-in is not configured yet.", 503);
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}
export async function signState(data: Record<string, string>) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .setAudience("oauth-state")
    .sign(secret());
}
export async function readState(token: string) {
  try {
    return (
      await jwtVerify(token, secret(), {
        algorithms: ["HS256"],
        audience: "oauth-state",
      })
    ).payload;
  } catch {
    throw new AppError(
      "INVALID_OAUTH_STATE",
      "Sign-in expired. Please try again.",
      403,
    );
  }
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await db.authSession.create({
    data: { id: digest(token), userId, expiresAt },
  });
  (await cookies()).set(sessionCookie, token, {
    ...cookieOptions,
    expires: expiresAt,
  });
}
export async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const session = await db.authSession.findUnique({
    where: { id: digest(token) },
    include: {
      user: {
        include: {
          roles: { include: { role: true } },
          departments: { include: { rank: true, department: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabled)
    return null;
  return session.user;
}
export async function actorFromUser(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): Promise<Actor> {
  return {
    id: user.id,
    discordId: user.discordId,
    createdAt: user.createdAt,
    roleIds: user.roles.map((r) => r.roleId),
    permissions: [...new Set(user.roles.flatMap((r) => r.role.permissions))],
    departments: user.departments
      .filter(
        (d) =>
          d.status === "ACTIVE" &&
          (!d.suspensionUntil || d.suspensionUntil < new Date()),
      )
      .map((d) => ({
        departmentId: d.departmentId,
        permissions: d.rank?.permissions ?? [],
      })),
  };
}
export async function requireActor() {
  const user = await currentUser();
  if (!user)
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401);
  return actorFromUser(user);
}
