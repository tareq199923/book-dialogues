import { NextRequest, NextResponse } from "next/server";
import { loadCachedPersona, savePersona, slugify } from "@/lib/persona/cache";
import { derivePersona } from "@/lib/persona/derive";
import { generateTopic } from "@/lib/debate/topic";

export async function POST(req: NextRequest) {
  try {
    const {
      personaA: titleA,
      personaB: titleB,
      topic,
    }: {
      personaA?: string;
      personaB?: string;
      topic?: string;
    } = await req.json();

    const cleanA = titleA?.trim();
    const cleanB = titleB?.trim();
    if (!cleanA || !cleanB) {
      return NextResponse.json(
        { error: "Both personaA and personaB titles are required" },
        { status: 400 }
      );
    }

    if (slugify(cleanA) === slugify(cleanB)) {
      return NextResponse.json(
        { error: "Cannot start a debate between the same book" },
        { status: 422 }
      );
    }

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

    const userProvidedTopic = topic?.trim();
    const resolvedTopic = userProvidedTopic || await generateTopic(personaA, personaB);

    return NextResponse.json(
      {
        personaA: { name: personaA.name, slug: personaA.slug, coherence: personaA.coherence.level },
        personaB: { name: personaB.name, slug: personaB.slug, coherence: personaB.coherence.level },
        topic: resolvedTopic,
        topicGenerated: !userProvidedTopic,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
