import { NextRequest, NextResponse } from "next/server";
import { listDebates, loadDebate } from "@/lib/debate/persistence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const debate = await loadDebate(id);
    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }
    return NextResponse.json(debate);
  }

  const debates = await listDebates();
  return NextResponse.json(debates);
}
