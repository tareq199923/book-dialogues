import { NextRequest, NextResponse } from "next/server";
import { derivePersona } from "@/lib/persona/derive";
import { loadCachedPersona, savePersona } from "@/lib/persona/cache";

export async function POST(req: NextRequest) {
  try {
    const { title }: { title?: string } = await req.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'title' field" },
        { status: 400 }
      );
    }

    const cleanedTitle = title.trim();
    if (cleanedTitle.length === 0) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    const existing = await loadCachedPersona(cleanedTitle);
    if (existing) {
      return NextResponse.json({ fromCache: true, persona: existing }, { status: 200 });
    }

    const persona = await derivePersona(cleanedTitle);
    await savePersona(persona);

    return NextResponse.json({ fromCache: false, persona }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
