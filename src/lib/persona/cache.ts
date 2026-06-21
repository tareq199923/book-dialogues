import fs from "fs/promises";
import path from "path";
import { PersonaCache } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "personas");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function loadCachedPersona(title: string): Promise<PersonaCache | null> {
  const slug = slugify(title);
  const filePath = path.join(DATA_DIR, `${slug}.json`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as PersonaCache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function savePersona(persona: PersonaCache): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, `${persona.slug}.json`);
  await fs.writeFile(filePath, JSON.stringify(persona, null, 2), "utf-8");
}

export { slugify };
