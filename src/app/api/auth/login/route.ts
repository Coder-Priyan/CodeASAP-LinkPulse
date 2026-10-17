import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, UserValidationError } from "@/lib/services/user.service";
import { setSessionCookie } from "@/lib/auth/session";
import { checkLoginRateLimit, RateLimitError } from "@/lib/services/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    await checkLoginRateLimit(ip);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const sessionPayload = await authenticateUser(email, password);
    await setSessionCookie(sessionPayload);

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        }
      );
    }
    if (error instanceof UserValidationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[API Login] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during login." },
      { status: 500 }
    );
  }
}
