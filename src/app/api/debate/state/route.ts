import { NextRequest, NextResponse } from "next/server";
import { debates } from "@/lib/debate/orchestrator";
import { loadDebate } from "@/lib/debate/persistence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing debate id" }, { status: 400 });
  }

  // Check in-memory map first (active debates)
  const active = debates.get(id);
  if (active) {
    return NextResponse.json({
      id: active.id,
      topic: active.topic,
      personaA: { name: active.personaA.name, slug: active.personaA.slug },
      personaB: { name: active.personaB.name, slug: active.personaB.slug },
      maxTurns: active.maxTurns,
      turns: active.turns,
      status: active.status,
      createdAt: active.createdAt,
    });
  }

  // Fall back to disk (completed debates)
  const saved = await loadDebate(id);
  if (saved) {
    return NextResponse.json({
      id: saved.id,
      topic: saved.topic,
      personaA: { name: saved.personaA.name, slug: saved.personaA.slug },
      personaB: { name: saved.personaB.name, slug: saved.personaB.slug },
      maxTurns: saved.maxTurns,
      turns: saved.turns,
      status: saved.status,
      createdAt: saved.createdAt,
    });
  }

  return NextResponse.json({ error: "Debate not found" }, { status: 404 });
}
