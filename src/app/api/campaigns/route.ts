import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import {
  createCampaign,
  getUserCampaigns,
  CampaignServiceError,
} from "@/lib/services/campaign.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const campaigns = await getUserCampaigns(user.userId);
    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Campaigns GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }
    const { name, description } = body || {};

    const campaign = await createCampaign(user.userId, {
      name,
      description,
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CampaignServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Campaigns POST] Error:", error);
    return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });
  }
}
