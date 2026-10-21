import { NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { recordEmailTriage } from "@/lib/email-triage";

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return recordEmailTriage(await request.json());
}
