"use client";

import { useState } from "react";
import { PersonaCache } from "@/lib/persona/types";

export default function Home() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    persona: PersonaCache;
    fromCache: boolean;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/persona/derive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unknown error");
        return;
      }

      setResult({ persona: data.persona, fromCache: data.fromCache });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to derive persona");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-950">
          Book Dialogues
        </h1>
        <p className="mb-8 text-zinc-600">
          Phase 1: Extract the living mind from a book.
        </p>

        <form onSubmit={handleSubmit} className="mb-10 flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a book title (e.g., The Brothers Karamazov)"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="rounded-lg bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Deriving..." : "Derive"}
          </button>
        </form>

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-zinc-950">
                {result.persona.name}
              </h2>
              {result.fromCache && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  from cache
                </span>
              )}
            </div>

            {/* Coherence assessment */}
            <div
              className={`rounded-lg border p-4 ${
                result.persona.coherence.level === "deep"
                  ? "border-green-200 bg-green-50"
                  : result.persona.coherence.level === "moderate"
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-sm font-medium">
                Coherence: {result.persona.coherence.level}
              </p>
              <p className="text-sm">{result.persona.coherence.why}</p>
              {result.persona.coherence.caveat && (
                <p className="mt-1 text-sm italic">
                  {result.persona.coherence.caveat}
                </p>
              )}
            </div>

            {/* Raw JSON display */}
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 uppercase tracking-wide">
                Raw Persona JSON
              </div>
              <pre className="max-h-[70vh] overflow-auto p-4 text-xs leading-relaxed">
                {JSON.stringify(result.persona, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
