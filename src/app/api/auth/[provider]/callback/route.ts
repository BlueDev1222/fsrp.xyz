import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, readState, requireActor } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/policy";
import { errorResponse } from "@/lib/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    if (!["discord", "roblox"].includes(provider))
      throw new AppError("NOT_FOUND", "Unknown provider.", 404);
    const jar = await cookies();
    const stored = jar.get(`oauth_${provider}`)?.value;
    jar.delete(`oauth_${provider}`);
    if (!stored)
      throw new AppError(
        "INVALID_OAUTH_STATE",
        "Sign-in expired. Please try again.",
        403,
      );
    const state = await readState(stored);
    const query = new URL(request.url).searchParams;
    if (
      state.provider !== provider ||
      state.nonce !== query.get("state") ||
      !query.get("code")
    )
      throw new AppError(
        "INVALID_OAUTH_STATE",
        "Sign-in could not be verified.",
        403,
      );
    const base =
      provider === "discord"
        ? "https://discord.com/api/v10"
        : "https://apis.roblox.com/oauth/v1";
    const response = await fetch(
      `${base}/${provider === "discord" ? "oauth2/token" : "token"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
          client_secret:
            process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!,
          grant_type: "authorization_code",
          code: query.get("code")!,
          redirect_uri: `${process.env.APP_URL}/api/auth/${provider}/callback`,
          ...(provider === "roblox"
            ? { code_verifier: String(state.verifier) }
            : {}),
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new AppError(
        "OAUTH_FAILED",
        "The provider could not complete sign-in.",
        502,
      );
    const token = z
      .object({ access_token: z.string() })
      .parse(await response.json());
    const profileResponse = await fetch(
      `${base}/${provider === "discord" ? "users/@me" : "userinfo"}`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!profileResponse.ok)
      throw new AppError("OAUTH_FAILED", "Unable to verify your account.", 502);
    const profile = await profileResponse.json();
    if (provider === "discord") {
      const data = z
        .object({
          id: z.string().regex(/^\d+$/),
          username: z.string(),
          avatar: z.string().nullable(),
        })
        .parse(profile);
      const avatar = data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : null;
      const user = await db.user.upsert({
        where: { discordId: data.id },
        create: {
          discordId: data.id,
          username: data.username,
          avatar,
          economy: { create: {} },
          accounts: { create: { provider: "discord", providerId: data.id } },
        },
        update: { username: data.username, avatar, lastActiveAt: new Date() },
      });
      if (user.disabled)
        throw new AppError("DISABLED", "This account cannot sign in.", 403);
      await createSession(user.id);
    } else {
      const actor = await requireActor();
      if (actor.id !== state.userId)
        throw new AppError(
          "INVALID_OAUTH_STATE",
          "Please link from the same signed-in account.",
          403,
        );
      const data = z
        .object({
          sub: z.string().regex(/^\d+$/),
          preferred_username: z.string(),
        })
        .parse(profile);
      await db.$transaction(async (tx) => {
        await tx.linkedAccount.upsert({
          where: { userId_provider: { userId: actor.id, provider: "roblox" } },
          create: {
            userId: actor.id,
            provider: "roblox",
            providerId: data.sub,
          },
          update: { providerId: data.sub, verifiedAt: new Date() },
        });
        await tx.user.update({
          where: { id: actor.id },
          data: { robloxId: data.sub, robloxUsername: data.preferred_username },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "ROBLOX_LINKED",
            target: actor.id,
            after: { robloxId: data.sub },
          },
        });
      });
    }
    return NextResponse.redirect(new URL("/dashboard", process.env.APP_URL));
  } catch (error) {
    return errorResponse(error);
  }
}
