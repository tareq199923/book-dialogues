import { GoogleGenAI } from "@google/genai";
import { trackCall } from "@/lib/api-tracker";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

export const genAI = new GoogleGenAI({ apiKey });

export const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Models to try, in order, when the primary model is overloaded or rate-limited.
 */
export const FALLBACK_MODELS = [
  "gemini-2.5-flash",
];

/**
 * Returns true for errors that may succeed with a different model or after a retry:
 * - HTTP 429 (rate limited), 503 (overloaded)
 * - RESOURCE_EXHAUSTED, UNAVAILABLE
 * - Network/timeout errors
 *
 * Fatal errors (invalid API key, bad request, model not found) return false.
 */
function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|429|RESOURCE_EXHAUSTED|UNAVAILABLE|rate limit|overloaded|too many requests|try again|econnreset|econnrefused|timeout/i.test(msg);
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|rate limit|too many requests|quota/i.test(msg);
}

/**
 * Stream a completion from Gemini, with per-model retries and cross-model fallback.
 *
 * For each model in the fallback list:
 *   The API call + first-chunk receipt is retried up to `maxRetries` times
 *   with exponential backoff + jitter. Once streaming has started, mid-stream
 *   errors are thrown directly (the caller handles those).
 *
 * If a model exhausts all retries with a retryable error, the next model
 * in FALLBACK_MODELS is tried. Fatal errors throw immediately.
 */
export async function* streamGenerateContent(
  systemPrompt: string,
  userMessage: string,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): AsyncGenerator<string> {
  let lastError: unknown;

  for (const model of FALLBACK_MODELS) {
    let attempt = 0;

    trackCall("stream_start", model);

    while (attempt <= maxRetries) {
      try {
        const response = await genAI.models.generateContentStream({
          model,
          contents: [
            { role: "user", parts: [{ text: userMessage }] },
          ],
          config: {
            systemInstruction: systemPrompt,
          },
        });

        for await (const chunk of response) {
          const text = chunk.text ?? "";
          if (text) {
            yield text;
          }
        }

        // Stream completed
        return;
      } catch (err) {
        lastError = err;

        trackCall("retry", model);
        if (isRateLimitError(err)) trackCall("rate_limited", model);

        // Fatal errors should not be retried or fallback'd
        if (!isRetryableError(err)) throw err;

        // Exhausted retries for this model — try next model
        if (attempt === maxRetries) {
          console.warn(
            `Model ${model} failed after ${maxRetries + 1} attempts, trying next model:`,
            err instanceof Error ? err.message : String(err)
          );
          break;
        }

        // Wait with exponential backoff + jitter
        const delay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelayMs;
        const waitMs = delay + jitter;

        console.warn(
          `Retry ${attempt + 1}/${maxRetries} on ${model} after ${Math.round(waitMs)}ms:`,
          err instanceof Error ? err.message : String(err)
        );

        await new Promise((resolve) => setTimeout(resolve, waitMs));
        attempt++;
      }
    }
  }

  throw lastError;
}

/**
 * Wraps a non-streaming Gemini call with model fallback.
 *
 * Used by persona derivation (structured output). Tries each model in
 * FALLBACK_MODELS, retrying up to `maxRetries` times per model before
 * advancing to the next.
 */
export async function generateContentWithFallback(
  params: Omit<Parameters<typeof genAI.models.generateContent>[0], "model"> & { model?: string },
  maxRetries: number = 2,
  baseDelayMs: number = 2000
): ReturnType<typeof genAI.models.generateContent> {
  let lastError: unknown;

  for (const model of FALLBACK_MODELS) {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        trackCall("generate", model);
        return await genAI.models.generateContent({
          ...params,
          model,
        });
      } catch (err) {
        lastError = err;

        trackCall("retry", model);
        if (isRateLimitError(err)) trackCall("rate_limited", model);

        if (!isRetryableError(err)) throw err;

        if (attempt === maxRetries) {
          console.warn(
            `Model ${model} failed after ${maxRetries + 1} attempts, trying next model:`,
            err instanceof Error ? err.message : String(err)
          );
          break;
        }

        const delay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelayMs;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        attempt++;
      }
    }
  }

  throw lastError;
}
