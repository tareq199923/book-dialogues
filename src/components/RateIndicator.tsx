"use client";

import { useEffect, useState } from "react";

type UsageStats = {
  totalCalls: number;
  recentCalls: number;
  rateLimited: number;
  retries: number;
};

function getLevel(stats: UsageStats): "green" | "yellow" | "red" {
  if (stats.rateLimited > 0) return "red";
  if (stats.recentCalls >= 25) return "red";
  if (stats.recentCalls >= 15) return "yellow";
  return "green";
}

const colorMap = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

const dotMap = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export default function RateIndicator() {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/debate/usage");
        if (res.ok) {
          const data: UsageStats = await res.json();
          if (!cancelled) setStats(data);
        }
      } catch {
        // ignore poll errors
      }
    }

    // Fetch immediately, then every 10s
    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!stats || stats.totalCalls === 0) return null;

  const level = getLevel(stats);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none ${colorMap[level]}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotMap[level]}`} />
      API: {stats.recentCalls}/min
    </span>
  );
}
