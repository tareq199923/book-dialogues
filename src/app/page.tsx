"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type DebateSummary = {
  id: string;
  personaA: string;
  personaB: string;
  topic: string;
  turnCount: number;
  createdAt: string;
};

type LoadingPhase = "idle" | "starting" | "deriving";

export default function Home() {
  const [titleA, setTitleA] = useState("");
  const [titleB, setTitleB] = useState("");
  const [maxTurns, setMaxTurns] = useState(12);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ a?: string; b?: string }>({});
  const [history, setHistory] = useState<DebateSummary[]>([]);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/debate/history")
      .then((res) => res.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  function clearFieldError(field: "a" | "b") {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleStartDebate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const cleanA = titleA.trim();
    const cleanB = titleB.trim();

    const newFieldErrors: { a?: string; b?: string } = {};
    if (!cleanA) newFieldErrors.a = "Title cannot be empty";
    if (!cleanB) newFieldErrors.b = "Title cannot be empty";
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setLoadingPhase("starting");

    loadingTimerRef.current = setTimeout(() => {
      setLoadingPhase("deriving");
    }, 2500);

    try {
      const res = await fetch("/api/debate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaA: cleanA,
          personaB: cleanB,
          maxTurns,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unknown error");
        return;
      }

      router.push(`/debate/${data.debateId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start debate");
    } finally {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setLoadingPhase("idle");
    }
  }

  const loadingLabel =
    loadingPhase === "deriving" ? "Deriving personas..." : "Starting debate...";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Book Dialogues
        </h1>
        <p className="mb-8 text-zinc-600">
          Two books debate each other, as if they were real people.
        </p>

        <form onSubmit={handleStartDebate} className="mb-10 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Book 1
            </label>
            <input
              type="text"
              value={titleA}
              onChange={(e) => {
                setTitleA(e.target.value);
                clearFieldError("a");
              }}
              placeholder="e.g., The Brothers Karamazov"
              className={`flex-1 rounded-lg border bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.a
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-zinc-300 focus:border-zinc-950 focus:ring-zinc-950"
              }`}
            />
            {fieldErrors.a && (
              <p className="text-xs text-red-600">{fieldErrors.a}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Book 2
            </label>
            <input
              type="text"
              value={titleB}
              onChange={(e) => {
                setTitleB(e.target.value);
                clearFieldError("b");
              }}
              placeholder="e.g., Beyond Good and Evil"
              className={`flex-1 rounded-lg border bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.b
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-zinc-300 focus:border-zinc-950 focus:ring-zinc-950"
              }`}
            />
            {fieldErrors.b && (
              <p className="text-xs text-red-600">{fieldErrors.b}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Max turns
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(Number(e.target.value))}
                min={6}
                max={20}
                step={2}
                className="w-20 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
              <span className="text-xs text-zinc-500">
                (default 12, range 6-20)
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingPhase !== "idle" || !titleA.trim() || !titleB.trim()}
            className="w-full rounded-lg bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {loadingPhase !== "idle" ? loadingLabel : "Start Debate"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                handleStartDebate({ preventDefault: () => {} } as React.FormEvent);
              }}
              className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {history.length > 0 && (
          <section className="mt-12 border-t border-zinc-200 pt-8">
            <h2 className="mb-4 text-sm font-medium text-zinc-700">Past debates</h2>
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/history/${entry.id}`)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">
                    {entry.personaA} vs {entry.personaB}
                  </span>
                  <span className="ml-2 text-zinc-500">
                    &middot; {entry.turnCount} turns
                  </span>
                  <div className="mt-0.5 truncate text-zinc-400 italic">
                    {entry.topic}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}