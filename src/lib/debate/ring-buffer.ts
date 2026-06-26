import { DebateTurn } from "./types";

/**
 * Returns a windowed slice of the conversation for the model's context.
 *
 * Always includes:
 *   - All intro turns (sequence 0 and 1) — they're short and set the stage
 *   - All reflection turns (last 2 turns) — they need full context
 *
 * Then includes the most recent `windowSize` debate turns,
 * dropping the oldest if the total exceeds the window.
 */
export function sliceTranscript(
  turns: DebateTurn[],
  windowSize: number = 6
): DebateTurn[] {
  if (turns.length === 0) return [];

  const intros = turns.filter((t) => t.sequenceNumber <= 1);

  // Reflections are the last two turns in a completed debate
  const reflections = turns.filter(
    (t) => t.sequenceNumber >= turns.length - 2 && turns.length > 4
  );

  // Debate turns are everything between intros and reflections
  const debateTurns = turns.filter(
    (t) => !intros.includes(t) && !reflections.includes(t)
  );

  // Keep only the most recent `windowSize` debate turns
  const windowedDebate = debateTurns.slice(-windowSize);

  return [...intros, ...windowedDebate, ...reflections];
}
