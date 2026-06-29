"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PersonaListItem = {
  name: string;
  title: string;
  slug: string;
  coherence: {
    level: "deep" | "moderate" | "shallow";
    why: string;
    caveat: string | null;
  };
  personaType: "character-driven" | "voice-driven";
  cachedAt: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  if (minutes > 0) return `${minutes} minutes ago`;
  return "just now";
}

function coherenceBadge(level: string) {
  if (level === "deep") {
    return { dot: "bg-emerald-500", label: "Deep", text: "text-emerald-800", bg: "bg-emerald-100" };
  }
  if (level === "moderate") {
    return { dot: "bg-amber-500", label: "Moderate", text: "text-amber-800", bg: "bg-amber-100" };
  }
  return { dot: "bg-zinc-400", label: "Shallow", text: "text-zinc-600", bg: "bg-zinc-100" };
}

export default function PersonaGallery() {
  const [personas, setPersonas] = useState<PersonaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function fetchPersonas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/persona/list");
      if (!res.ok) throw new Error("Failed to load personas");
      const data = await res.json();
      setPersonas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load personas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPersonas();
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif">
              Persona Gallery
            </h1>
            <p className="mt-1 text-sm text-muted">
              Browse cached personas and use them in a debate.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-rule bg-surface p-5 animate-pulse"
              >
                <div className="h-5 bg-rule/50 rounded w-3/4 mb-2" />
                <div className="h-4 bg-rule/30 rounded w-1/2 mb-4" />
                <div className="h-4 bg-rule/30 rounded w-1/3 mb-3" />
                <div className="h-4 bg-rule/30 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              onClick={fetchPersonas}
              className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && personas.length === 0 && (
          <div className="rounded-xl border border-rule bg-surface p-10 text-center">
            <p className="text-muted">
              No personas cached yet. Start a debate to generate one.
            </p>
            <Link
              href="/"
              className="mt-2 inline-block text-sm font-medium text-ink underline hover:no-underline"
            >
              Start a debate
            </Link>
          </div>
        )}

        {!loading && !error && personas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((p) => {
              const badge = coherenceBadge(p.coherence.level);
              return (
                <div
                  key={p.slug}
                  className="rounded-xl border border-rule bg-surface p-5 flex flex-col"
                >
                  <h3 className="text-lg font-bold text-ink font-serif">{p.name}</h3>
                  <p className="text-sm text-muted mb-3 line-clamp-1">
                    {p.title}
                  </p>

                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${badge.dot}`}
                    />
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    <span className="inline-block rounded-full bg-rule/30 px-2 py-0.5 text-xs font-medium text-muted">
                      {p.personaType === "character-driven"
                        ? "Character-driven"
                        : "Voice-driven"}
                    </span>
                  </div>

                  <p className="text-xs text-muted mt-auto mb-4">
                    {relativeTime(p.cachedAt)}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(`/?select=${p.slug}&side=a`)
                      }
                      className="flex-1 rounded-lg border border-rule px-3 py-2 text-xs font-medium text-muted hover:bg-paper transition-colors"
                    >
                      Use as Book 1
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/?select=${p.slug}&side=b`)
                      }
                      className="flex-1 rounded-lg border border-rule px-3 py-2 text-xs font-medium text-muted hover:bg-paper transition-colors"
                    >
                      Use as Book 2
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
