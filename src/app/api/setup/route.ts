import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { communitySchema } from "@/lib/admin";
import { AppError, assertOrigin } from "@/lib/policy";
import { errorResponse, json, rateLimit, readBody } from "@/lib/http";
export async function POST(request: Request) {
  try {
    assertOrigin(request.headers.get("origin"), process.env.APP_URL!);
    await rateLimit("setup", 5, 600);
    const body = z
      .object({ token: z.string() })
      .passthrough()
      .parse(await readBody(request));
    const expected = process.env.SETUP_TOKEN;
    if (!expected || expected.length < 32)
      throw new AppError(
        "NOT_CONFIGURED",
        "Configure a random SETUP_TOKEN of at least 32 characters.",
        503,
      );
    if (
      Buffer.byteLength(body.token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(body.token), Buffer.from(expected))
    )
      throw new AppError("FORBIDDEN", "Invalid setup token.", 403);
    const data = communitySchema.parse(body);
    await db.$transaction(
      async (tx) => {
        if (
          (await tx.community.findUnique({ where: { id: "community" } }))
            ?.setupComplete
        )
          throw new AppError(
            "SETUP_COMPLETE",
            "Setup has already been completed.",
            409,
          );
        await tx.community.upsert({
          where: { id: "community" },
          create: { ...data, setupComplete: true },
          update: { ...data, setupComplete: true },
        });
        await tx.auditLog.create({
          data: { action: "SETUP_COMPLETED", target: "community" },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
