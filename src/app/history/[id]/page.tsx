"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Markdown from "@/components/Markdown";
import { DebateState } from "@/lib/debate/types";
import { formatDebateAsMarkdown, formatDebateAsJson } from "@/lib/export";

export default function HistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const debateId = pathname.split("/").pop();

  const [debate, setDebate] = useState<DebateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  useEffect(() => {
    if (!debateId) return;

    fetch(`/api/debate/history?id=${encodeURIComponent(debateId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Debate not found");
        return res.json();
      })
      .then((data) => {
        setDebate(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [debateId]);

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadMarkdown() {
    if (!debate) return;
    const md = formatDebateAsMarkdown({
      id: debate.id,
      topic: debate.topic,
      personaA: { name: debate.personaA.name },
      personaB: { name: debate.personaB.name },
      maxTurns: debate.maxTurns,
      turns: debate.turns.map((t) => ({
        speakerName: t.speakerName,
        content: t.content,
        sequenceNumber: t.sequenceNumber,
      })),
      createdAt: debate.createdAt,
    });
    download(md, `debate-${debate.personaA.slug}-vs-${debate.personaB.slug}.md`, "text/markdown");
  }

  function handleDownloadJson() {
    if (!debate) return;
    const json = formatDebateAsJson({
      id: debate.id,
      topic: debate.topic,
      personaA: { name: debate.personaA.name },
      personaB: { name: debate.personaB.name },
      maxTurns: debate.maxTurns,
      turns: debate.turns.map((t) => ({
        speakerName: t.speakerName,
        content: t.content,
        sequenceNumber: t.sequenceNumber,
      })),
      createdAt: debate.createdAt,
    });
    download(json, `debate-${debate.personaA.slug}-vs-${debate.personaB.slug}.json`, "application/json");
  }

  async function handleCopyLink() {
    const shareUrl = `${window.location.origin}/history/${debateId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("textarea");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setShowCopiedToast(true);
  }

  useEffect(() => {
    if (!showCopiedToast) return;
    const id = setTimeout(() => setShowCopiedToast(false), 2000);
    return () => clearTimeout(id);
  }, [showCopiedToast]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <header className="sticky top-0 z-10 border-b border-rule bg-surface/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3">
            <span className="text-sm font-medium text-ink">Book Dialogues</span>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-5">
            <div className="h-12 animate-pulse rounded-lg bg-rule/30" />
            <div className="flex justify-start">
              <div className="max-w-[90%] sm:max-w-[75%] animate-pulse rounded-xl border border-rule bg-surface shadow-sm">
                <div className="h-8 rounded-t-xl bg-paper px-4 py-2" />
                <div className="space-y-2.5 px-4 py-3">
                  <div className="h-3 w-full rounded bg-rule/30" />
                  <div className="h-3 w-4/5 rounded bg-rule/30" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !debate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4 sm:p-6 text-ink">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Debate not found</h2>
        <p className="mb-6 text-muted">{error ?? "This debate does not exist."}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-ink px-6 py-3 text-sm font-medium text-surface hover:opacity-90"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const isPersonaA = (name: string) => name === debate.personaA.name;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-rule bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted hover:text-ink"
          >
            &larr; Back
          </button>
          <span className="text-xs text-muted">Viewing completed debate</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMarkdown}
              className="rounded border border-rule px-2 py-1 text-xs font-medium text-muted hover:bg-paper transition-colors"
            >
              MD
            </button>
            <button
              onClick={handleDownloadJson}
              className="rounded border border-rule px-2 py-1 text-xs font-medium text-muted hover:bg-paper transition-colors"
            >
              JSON
            </button>
            <button
              onClick={handleCopyLink}
              className="rounded border border-rule px-2 py-1 text-xs font-medium text-muted hover:bg-paper transition-colors"
            >
              Copy
            </button>
            {showCopiedToast && (
              <span className="text-xs text-mark">Copied!</span>
            )}
            <span className="text-xs text-muted">
              {debate.turns.length} turns
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-1 rounded-lg bg-surface px-3 py-3 sm:px-4 sm:py-4 text-center text-ink font-serif text-sm sm:text-base">
          &ldquo;{debate.topic}&rdquo;
        </div>

        <div className="mb-4 text-center">
          <span className="text-xs text-muted font-serif">
            {debate.personaA.name} &middot; {debate.personaB.name} &middot;{" "}
            {new Date(debate.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto">
          {debate.turns.map((turn) => {
            const aSide = isPersonaA(turn.speakerName);

            return (
              <div
                key={turn.id}
                className={`flex ${aSide ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[75%] rounded-xl border shadow-sm ${
                    aSide ? "bg-surface border-rule" : "bg-surface border-rule"
                  }`}
                >
                  <div
                    className={`flex items-center rounded-t-xl px-5 py-2 text-xs font-serif ${
                      aSide ? "bg-paper font-semibold" : "bg-[#F0F2F0] font-normal"
                    } text-ink`}
                  >
                    {turn.speakerName}
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none ${
                        turn.sequenceNumber < 2
                          ? "bg-rule/50 text-muted"
                          : turn.sequenceNumber >= debate.maxTurns - 2
                            ? "bg-mark/10 text-mark"
                            : "hidden"
                      }`}
                    >
                      {turn.sequenceNumber < 2 ? "intro" : turn.sequenceNumber >= debate.maxTurns - 2 ? "reflection" : "debate"}
                    </span>
                  </div>
                  <div className="px-5 py-3.5 leading-relaxed">
                    <Markdown>{turn.content}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
