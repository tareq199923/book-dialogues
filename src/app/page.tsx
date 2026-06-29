"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PreviewModal from "@/components/PreviewModal";

type DebateSummary = {
  id: string;
  personaA: string;
  personaB: string;
  topic: string;
  turnCount: number;
  createdAt: string;
};

type FormPhase = "idle" | "resolving" | "previewed" | "starting";

type PersonaInfo = {
  name: string;
  slug: string;
  coherence: "deep" | "moderate" | "shallow";
};

type PreviewData = {
  personaA: PersonaInfo;
  personaB: PersonaInfo;
  topic: string;
  topicGenerated: boolean;
};

export default function Home() {
  const [titleA, setTitleA] = useState("");
  const [titleB, setTitleB] = useState("");
  const [topic, setTopic] = useState("");
  const [maxTurns, setMaxTurns] = useState(12);
  const [formPhase, setFormPhase] = useState<FormPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ a?: string; b?: string }>({});
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [history, setHistory] = useState<DebateSummary[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/debate/history")
      .then((res) => res.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectA = params.get("selectA");
    const selectB = params.get("selectB");
    const select = params.get("select");
    const side = params.get("side");

    const slugA = selectA || (select && side === "a" ? select : null);
    const slugB = selectB || (select && side === "b" ? select : null);

    if (!slugA && !slugB) return;

    fetch("/api/persona/list")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        if (slugA) {
          const match = data.find((p: { slug: string; title: string }) => p.slug === slugA);
          if (match) setTitleA(match.title);
        }
        if (slugB) {
          const match = data.find((p: { slug: string; title: string }) => p.slug === slugB);
          if (match) setTitleB(match.title);
        }
      })
      .catch(() => {});

    router.replace("/");
  }, [router]);

  function clearFieldError(field: "a" | "b") {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPreviewError(null);
    setPreviewData(null);
    setFieldErrors({});

    const cleanA = titleA.trim();
    const cleanB = titleB.trim();
    const cleanTopic = topic.trim();

    const newFieldErrors: { a?: string; b?: string } = {};
    if (!cleanA) newFieldErrors.a = "Title cannot be empty";
    if (!cleanB) newFieldErrors.b = "Title cannot be empty";
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setFormPhase("resolving");

    try {
      const res = await fetch("/api/debate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaA: cleanA,
          personaB: cleanB,
          topic: cleanTopic || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          setPreviewError(data.error ?? "One of the books cannot produce a coherent persona");
        } else {
          setError(data.error ?? "Failed to preview debate");
        }
        setFormPhase("idle");
        return;
      }

      setPreviewData(data);
      setEditTopic(data.topic);
      setFormPhase("previewed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview debate");
      setFormPhase("idle");
    }
  }

  async function handleConfirmStart() {
    setPreviewError(null);
    setFormPhase("starting");

    try {
      const res = await fetch("/api/debate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaA: titleA.trim(),
          personaB: titleB.trim(),
          maxTurns,
          topic: editTopic.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPreviewError(data.error ?? "Unknown error");
        setFormPhase("previewed");
        return;
      }

      router.push(`/debate/${data.debateId}`);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to start debate");
      setFormPhase("previewed");
    }
  }

  function handleCancel() {
    setPreviewData(null);
    setPreviewError(null);
    setFormPhase("idle");
  }

  async function handleRegenerate() {
    if (!previewData) return;

    setPreviewError(null);

    try {
      const res = await fetch("/api/debate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaA: titleA.trim(),
          personaB: titleB.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPreviewError(data.error ?? "Failed to regenerate topic");
        return;
      }

      setPreviewData(data);
      setEditTopic(data.topic);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to regenerate topic");
    }
  }

  const buttonLabel =
    formPhase === "resolving" ? "Resolving personas..." :
    formPhase === "starting" ? "Starting debate..." :
    "Start Debate";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-ink font-serif">
          Book Dialogues
        </h1>
        <p className="mb-8 text-muted">
          Two books debate each other, as if they were real people.
        </p>

        <form onSubmit={handlePreview} className="mb-10 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">
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
              className={`w-full rounded-lg border bg-surface px-4 py-3 text-sm shadow-sm placeholder:text-muted focus:outline-none focus:ring-1 ${
                fieldErrors.a
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-rule focus:border-ink focus:ring-ink"
              }`}
            />
            {fieldErrors.a && (
              <p className="text-xs text-red-600">{fieldErrors.a}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">
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
              className={`w-full rounded-lg border bg-surface px-4 py-3 text-sm shadow-sm placeholder:text-muted focus:outline-none focus:ring-1 ${
                fieldErrors.b
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-rule focus:border-ink focus:ring-ink"
              }`}
            />
            {fieldErrors.b && (
              <p className="text-xs text-red-600">{fieldErrors.b}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">
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
                className="w-20 rounded-lg border border-rule bg-surface px-4 py-3 text-sm shadow-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <span className="text-xs text-muted">
                (default 12, range 6-20)
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">
              Topic (optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Can justice coexist with suffering?"
              className="w-full rounded-lg border border-rule bg-surface px-4 py-3 text-sm shadow-sm placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <button
            type="submit"
            disabled={formPhase !== "idle" || !titleA.trim() || !titleB.trim()}
            className="w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-surface transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {formPhase !== "idle" ? buttonLabel : "Start Debate"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                handlePreview({ preventDefault: () => {} } as React.FormEvent);
              }}
              className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {(formPhase === "previewed" || formPhase === "starting") && previewData && (
          <PreviewModal
            personaA={previewData.personaA}
            personaB={previewData.personaB}
            topicGenerated={previewData.topicGenerated}
            editTopic={editTopic}
            onEditTopic={setEditTopic}
            onRegenerate={handleRegenerate}
            onCancel={handleCancel}
            onConfirm={handleConfirmStart}
            formPhase={formPhase}
            error={previewError}
          />
        )}

        {history.length > 0 && (
          <section className="mt-12 border-t border-rule pt-8">
            <h2 className="mb-4 text-sm font-medium text-muted">Past debates</h2>
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/history/${entry.id}`)}
                  className="w-full rounded-lg border border-rule bg-surface px-4 py-3 text-left text-sm transition-colors hover:bg-paper"
                >
                  <span className="font-medium text-ink">
                    {entry.personaA} vs {entry.personaB}
                  </span>
                  <span className="ml-2 text-muted">
                    &middot; {entry.turnCount} turns
                  </span>
                  <div className="mt-0.5 truncate text-muted italic">
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
