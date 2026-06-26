/**
 * Retry wrapper with exponential backoff and jitter.
 *
 * @param fn - The async function to call
 * @param maxRetries - Maximum number of retry attempts (default 3)
 * @param baseDelayMs - Base delay in ms, doubles each attempt (default 1000)
 * @returns The result of fn()
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) break;

      const delay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs;
      const waitMs = delay + jitter;

      console.warn(
        `Retry ${attempt + 1}/${maxRetries} after ${Math.round(waitMs)}ms:`,
        err instanceof Error ? err.message : err
      );

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}
