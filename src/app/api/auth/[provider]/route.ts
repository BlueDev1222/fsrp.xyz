import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, requireActor, signState } from "@/lib/auth";
import { AppError } from "@/lib/policy";
import { errorResponse, rateLimit } from "@/lib/http";
export async function GET(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    if (!["discord", "roblox"].includes(provider))
      throw new AppError("NOT_FOUND", "Unknown provider.", 404);
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    if (!clientId || !process.env[`${provider.toUpperCase()}_CLIENT_SECRET`])
      throw new AppError(
        "NOT_CONFIGURED",
        `${provider} sign-in has not been configured by the community administrator.`,
        503,
      );
    const actor = provider === "roblox" ? await requireActor() : null;
    await rateLimit(`oauth:${actor?.id ?? "public"}`, 100, 60);
    const nonce = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const state = await signState({
      nonce,
      provider,
      verifier,
      userId: actor?.id ?? "",
    });
    (await cookies()).set(`oauth_${provider}`, state, {
      ...cookieOptions,
      maxAge: 600,
    });
    const url = new URL(
      provider === "discord"
        ? "https://discord.com/oauth2/authorize"
        : "https://apis.roblox.com/oauth/v1/authorize",
    );
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${process.env.APP_URL}/api/auth/${provider}/callback`,
      response_type: "code",
      scope: provider === "discord" ? "identify" : "openid profile",
      state: nonce,
      ...(provider === "roblox"
        ? {
            code_challenge: createHash("sha256")
              .update(verifier)
              .digest("base64url"),
            code_challenge_method: "S256",
          }
        : {}),
    }).toString();
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error);
  }
}
