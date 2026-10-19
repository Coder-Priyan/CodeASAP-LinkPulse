import { NextRequest, NextResponse } from "next/server";
import { registerUser, UserValidationError } from "@/lib/services/user.service";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRegisterRateLimit, RateLimitError } from "@/lib/services/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    await checkRegisterRateLimit(ip);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const { email, password, name } = body || {};

    const sessionPayload = await registerUser({
      email,
      password,
      name,
    });

    await setSessionCookie(sessionPayload);

    return NextResponse.json(
      { success: true, user: sessionPayload },
      { status: 201 }
    );
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[API Register] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
