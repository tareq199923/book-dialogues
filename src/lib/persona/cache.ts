import fs from "fs/promises";
import path from "path";
import { PersonaCache } from "./types";
import { CURRENT_PROMPT_VERSION } from "./derive";
import { DATA_DIR } from "@/lib/data-path";

const CACHE_DIR = path.join(DATA_DIR, "personas");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function loadCachedPersona(title: string): Promise<PersonaCache | null> {
  const slug = slugify(title);
  const filePath = path.join(CACHE_DIR, `${slug}.json`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const cached = JSON.parse(raw) as PersonaCache;

    // Bust cache if derivation prompts have changed since this was cached.
    // Old caches without promptVersion (undefined !== number) will also bust.
    if (cached.promptVersion !== CURRENT_PROMPT_VERSION) {
      return null;
    }

    return cached;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function savePersona(persona: PersonaCache): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${persona.slug}.json`);
  await fs.writeFile(filePath, JSON.stringify(persona, null, 2), "utf-8");
}

export { slugify };
