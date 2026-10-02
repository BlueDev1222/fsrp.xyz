import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./policy";
export function json(data: unknown, status = 200) {
  return new NextResponse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return json(
      { success: false, error: { code: error.code, message: error.message } },
      error.status,
    );
  if (error instanceof ZodError)
    return json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
      },
      400,
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2034"].includes(error.code)
  )
    return json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message:
            "The record changed or already exists. Refresh and try again.",
        },
      },
      409,
    );
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Unable to complete the request. Please try again.",
      },
    },
    500,
  );
}
export async function rateLimit(key: string, limit = 40, seconds = 60) {
  const window = new Date(
    Math.floor(Date.now() / (seconds * 1000)) * seconds * 1000,
  );
  const id = `${key}:${window.getTime()}`;
  const result = await db.rateLimit.upsert({
    where: { key: id },
    create: { key: id, window },
    update: { count: { increment: 1 } },
  });
  if (result.count > limit)
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please wait and try again.",
      429,
    );
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 65536)
    throw new AppError("TOO_LARGE", "Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_JSON", "Request body is required.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 65536) {
      await reader.cancel();
      throw new AppError("TOO_LARGE", "Request is too large.", 413);
    }
    text += decoder.decode(part.value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("INVALID_JSON", "Send a valid JSON request.");
  }
}
