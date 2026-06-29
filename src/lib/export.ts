export type ExportTurn = {
  speakerName: string;
  content: string;
  sequenceNumber: number;
};

export type ExportData = {
  id: string;
  topic: string;
  personaA: { name: string };
  personaB: { name: string };
  turns: ExportTurn[];
  maxTurns: number;
  createdAt?: string;
};

function turnLabel(seq: number, maxTurns: number): string {
  if (seq < 2) return " — Intro";
  if (seq >= maxTurns - 2) return " — Reflection";
  return "";
}

export function formatDebateAsMarkdown(data: ExportData): string {
  const lines: string[] = [];

  lines.push(`# Book Dialogues: ${data.personaA.name} vs ${data.personaB.name}`);
  lines.push("");
  lines.push(`**Topic:** "${data.topic}"`);
  lines.push(`**Date:** ${data.createdAt ?? new Date().toISOString()}`);
  lines.push(`**Turns:** ${data.turns.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const turn of data.turns) {
    const label = turnLabel(turn.sequenceNumber, data.maxTurns);
    lines.push(`## ${turn.speakerName}${label}`);
    lines.push("");
    lines.push(turn.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function formatDebateAsJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}
