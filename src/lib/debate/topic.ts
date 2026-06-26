import { genAI, DEFAULT_MODEL } from "@/lib/gemini";
import { PersonaCache } from "@/lib/persona/types";
import { withRetry } from "@/lib/utils/retry";
import { trackCall } from "@/lib/api-tracker";

/**
 * Generate a debate topic from two personas.
 *
 * Not a generic debate topic — something specific to who THEY are,
 * that would force these two to collide at the deepest level
 * of their convictions.
 */
export async function generateTopic(
  personaA: PersonaCache,
  personaB: PersonaCache
): Promise<string> {
  return withRetry(async () => {
    trackCall("generate", DEFAULT_MODEL);
    const result = await genAI.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `You are about to introduce two people who have never met.

Person A: ${personaA.name} — ${personaA.whatTheyCantLetGoOf}

Person B: ${personaB.name} — ${personaB.whatTheyCantLetGoOf}

Propose ONE topic or question that would force these two to collide at the deepest level of their convictions. Not a generic debate topic — something specific to who THEY are. One sentence. Only the topic, nothing else.`,
    });

    return (result.text ?? "").trim();
  });
}
