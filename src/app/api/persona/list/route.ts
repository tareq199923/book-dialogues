import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { PersonaCache } from "@/lib/persona/types";

type PersonaListItem = {
  name: string;
  title: string;
  slug: string;
  coherence: PersonaCache["coherence"];
  personaType: PersonaCache["personaType"];
  cachedAt: string;
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dir = join(process.cwd(), "data", "personas");

    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return NextResponse.json([]);
    }

    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const personas: PersonaListItem[] = [];

    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        const data = JSON.parse(raw) as PersonaCache;
        personas.push({
          name: data.name,
          title: data.title,
          slug: data.slug,
          coherence: data.coherence,
          personaType: data.personaType,
          cachedAt: data.cachedAt,
        });
      } catch {
        console.warn(`Skipping corrupted persona file: ${file}`);
      }
    }

    personas.sort(
      (a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime(),
    );

    return NextResponse.json(personas);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
