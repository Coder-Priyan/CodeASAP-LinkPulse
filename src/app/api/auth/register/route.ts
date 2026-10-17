import { NextRequest, NextResponse } from "next/server";
import { registerUser, UserValidationError } from "@/lib/services/user.service";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
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
