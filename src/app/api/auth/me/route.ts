import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}
