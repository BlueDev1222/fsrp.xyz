import { cookies } from "next/headers";
import { digest, sessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOrigin } from "@/lib/policy";
import { errorResponse, json } from "@/lib/http";
export async function POST(request: Request) {
  try {
    assertOrigin(request.headers.get("origin"), process.env.APP_URL!);
    const jar = await cookies();
    const token = jar.get(sessionCookie)?.value;
    if (token)
      await db.authSession.deleteMany({ where: { id: digest(token) } });
    jar.delete(sessionCookie);
    return json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
