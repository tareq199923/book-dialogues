import fs from "fs/promises";
import path from "path";
import { DebateState } from "./types";
import { DATA_DIR } from "@/lib/data-path";

const DEBATES_DIR = path.join(DATA_DIR, "debates");

export type DebateSummary = {
  id: string;
  personaA: string;
  personaB: string;
  topic: string;
  turnCount: number;
  createdAt: string;
};

export async function saveDebate(state: DebateState): Promise<void> {
  await fs.mkdir(DEBATES_DIR, { recursive: true });
  const filePath = path.join(DEBATES_DIR, `${state.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}

export async function loadDebate(id: string): Promise<DebateState | null> {
  const filePath = path.join(DEBATES_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as DebateState;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function listDebates(): Promise<DebateSummary[]> {
  try {
    const files = await fs.readdir(DEBATES_DIR);
    const debates: DebateSummary[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(DEBATES_DIR, file), "utf-8");
      const state = JSON.parse(raw) as DebateState;
      debates.push({
        id: state.id,
        personaA: state.personaA.name,
        personaB: state.personaB.name,
        topic: state.topic,
        turnCount: state.turns.length,
        createdAt: state.createdAt,
      });
    }

    debates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return debates;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}
