type CallRecord = {
  timestamp: number;
  type: "generate" | "stream_start" | "retry" | "rate_limited";
  model: string;
};

const WINDOW_MS = 60_000;
const callLog: CallRecord[] = [];

function prune(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (callLog.length > 0 && callLog[0].timestamp < cutoff) {
    callLog.shift();
  }
}

export function trackCall(type: CallRecord["type"], model: string): void {
  callLog.push({ timestamp: Date.now(), type, model });
}

export function getStats(): {
  totalCalls: number;
  recentCalls: number;
  rateLimited: number;
  retries: number;
} {
  prune();
  return {
    totalCalls: callLog.length,
    recentCalls: callLog.filter(
      (r) => r.type === "generate" || r.type === "stream_start"
    ).length,
    rateLimited: callLog.filter((r) => r.type === "rate_limited").length,
    retries: callLog.filter((r) => r.type === "retry").length,
  };
}
