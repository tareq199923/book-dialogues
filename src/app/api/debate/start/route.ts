import { NextRequest, NextResponse } from "next/server";
import { loadCachedPersona, savePersona, slugify } from "@/lib/persona/cache";
import { derivePersona } from "@/lib/persona/derive";
import { runDebate, debates } from "@/lib/debate/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const {
      personaA: titleA,
      personaB: titleB,
      maxTurns,
    }: {
      personaA?: string;
      personaB?: string;
      maxTurns?: number;
    } = await req.json();

    if (!titleA || !titleB) {
      return NextResponse.json(
        { error: "Both personaA and personaB titles are required" },
        { status: 400 }
      );
    }

    const cleanA = titleA.trim();
    const cleanB = titleB.trim();

    if (!cleanA || !cleanB) {
      return NextResponse.json(
        { error: "Titles cannot be empty" },
        { status: 400 }
      );
    }

    if (slugify(cleanA) === slugify(cleanB)) {
      return NextResponse.json(
        { error: "Cannot start a debate between the same book" },
        { status: 422 }
      );
    }

    // Resolve both personas — derive from Gemini if not cached
    async function resolvePersona(title: string) {
      const cached = await loadCachedPersona(title);
      if (cached) return cached;

      const persona = await derivePersona(title);
      await savePersona(persona);
      return persona;
    }

    const [personaA, personaB] = await Promise.all([
      resolvePersona(cleanA),
      resolvePersona(cleanB),
    ]);

    // Check coherence — reject shallow personas outright
    if (personaA.coherence.level === "shallow") {
      return NextResponse.json(
        {
          error: `"${cleanA}" cannot produce a single coherent persona: ${personaA.coherence.why}`,
          coherence: personaA.coherence,
        },
        { status: 422 }
      );
    }
    if (personaB.coherence.level === "shallow") {
      return NextResponse.json(
        {
          error: `"${cleanB}" cannot produce a single coherent persona: ${personaB.coherence.why}`,
          coherence: personaB.coherence,
        },
        { status: 422 }
      );
    }

    // Cap maxTurns: 2 intro + N debate + 2 reflection = total
    // Default 12 = 2 intro + 8 debate + 2 reflection (~7 min read)
    const totalTurns = Math.min(Math.max(maxTurns ?? 12, 6), 20);

    // Kick off the debate to create the state (but don't stream yet)
    // We need the state object with its ID before the stream route can find it
    // So we create a simple "seed" state here
    const debateId = `debate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Store minimal info so the stream route knows this debate exists
    // The orchestrator will populate the full state when streaming begins
    debates.set(debateId, {
      id: debateId,
      topic: "", // will be set by orchestrator
      personaA,
      personaB,
      turns: [],
      maxTurns: totalTurns,
      status: "intro",
      currentSpeaker: "A",
      firstSpeaker: "A",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        debateId,
        personaA: { name: personaA.name, slug: personaA.slug, coherence: personaA.coherence.level },
        personaB: { name: personaB.name, slug: personaB.slug, coherence: personaB.coherence.level },
        maxTurns: totalTurns,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
