import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, UserValidationError } from "@/lib/services/user.service";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

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
