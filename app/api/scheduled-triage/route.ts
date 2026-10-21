import { NextResponse } from "next/server";
import { BOARD_OWNER_ID } from "@/lib/board-scope";
import { recordEmailTriage } from "@/lib/email-triage";
import { loadBoardData } from "@/lib/task-data";

// Sites dispatch authenticates service requests before reaching this endpoint.
// Deployment MUST remain owner-private. Never deploy this route publicly.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadBoardData(BOARD_OWNER_ID));
}

export async function POST(request: Request) {
  return recordEmailTriage(await request.json());
}
