"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Markdown from "@/components/Markdown";
import { DebateState } from "@/lib/debate/types";

export default function HistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const debateId = pathname.split("/").pop();

  const [debate, setDebate] = useState<DebateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3">
            <span className="text-sm font-medium text-zinc-800">Book Dialogues</span>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-5">
            <div className="h-12 animate-pulse rounded-lg bg-zinc-200" />
            <div className="flex justify-start">
              <div className="max-w-[90%] sm:max-w-[75%] animate-pulse rounded-xl border bg-zinc-50 shadow-sm">
                <div className="h-8 rounded-t-xl bg-amber-100/50 px-4 py-2" />
                <div className="space-y-2.5 px-4 py-3">
                  <div className="h-3 w-full rounded bg-zinc-200" />
                  <div className="h-3 w-4/5 rounded bg-zinc-200" />
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 sm:p-6 text-zinc-900">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Debate not found</h2>
        <p className="mb-6 text-zinc-600">{error ?? "This debate does not exist."}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-zinc-950 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const isPersonaA = (name: string) => name === debate.personaA.name;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            &larr; Back
          </button>
          <span className="text-xs text-zinc-500">
            {debate.turns.length} turns
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 rounded-lg bg-zinc-100 px-3 py-3 sm:px-4 sm:py-4 text-center text-zinc-700 italic text-sm sm:text-base">
          Topic: &ldquo;{debate.topic}&rdquo;
        </div>

        <div className="mb-4 text-center">
          <span className="text-xs text-zinc-500">
            {debate.personaA.name} &middot; {debate.personaB.name} &middot;{" "}
            {new Date(debate.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto">
          {debate.turns.map((turn) => {
            const aSide = isPersonaA(turn.speakerName);
            const isReflection = turn.sequenceNumber >= debate.maxTurns - 2;

            return (
              <div
                key={turn.id}
                className={`flex ${aSide ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[75%] rounded-xl border shadow-sm ${
                    isReflection
                      ? aSide ? "bg-amber-50/80 border-amber-200" : "bg-sky-50/80 border-sky-200"
                      : aSide ? "bg-amber-50 border-amber-100" : "bg-sky-50 border-sky-100"
                  }`}
                >
                  <div
                    className={`flex items-center rounded-t-xl px-4 py-2 text-xs font-medium ${
                      isReflection
                        ? aSide ? "bg-amber-200 text-amber-900" : "bg-sky-200 text-sky-900"
                        : aSide ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900"
                    }`}
                  >
                    {turn.speakerName}
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none ${
                        turn.sequenceNumber < 2
                          ? "bg-zinc-200 text-zinc-600"
                          : isReflection
                            ? "bg-amber-200/60 text-amber-800"
                            : "hidden"
                      }`}
                    >
                      {turn.sequenceNumber < 2 ? "intro" : isReflection ? "reflection" : "debate"}
                    </span>
                  </div>
                  <div className="px-4 py-3 leading-relaxed">
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
