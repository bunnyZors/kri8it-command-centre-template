import { NextResponse } from "next/server";
import { BOARD_OWNER_ID } from "@/lib/board-scope";
import { recordCommandUpdate } from "@/lib/command-update";
import { loadBoardData } from "@/lib/task-data";

// Service access is enforced by Sites dispatch. This Site must remain owner-private.
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await loadBoardData(BOARD_OWNER_ID)); }
export async function POST(request: Request) {
  let data: unknown;
  try { data = await request.json(); }
  catch { return NextResponse.json({ error: "Malformed or truncated JSON. Serialize and verify the complete UTF-8 payload before sending; avoid canonical TTY line limits. No update was recorded." }, { status: 400 }); }
  return recordCommandUpdate(data);
}
