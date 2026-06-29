"use client";

import { useEffect, useReducer, useRef, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Markdown from "@/components/Markdown";
import RateIndicator from "@/components/RateIndicator";
import TurnLedger from "@/components/TurnLedger";
import { formatDebateAsMarkdown, formatDebateAsJson } from "@/lib/export";

type Turn = {
  id: string;
  speakerName: string;
  content: string;
  turnType: "intro" | "debate" | "reflection";
  isStreaming: boolean;
};

type PersonaInfo = {
  name: string;
  slug: string;
  coherence: string;
};

type StreamingState = {
  turns: Turn[];
  activeTurnIndex: number;
  topic: string;
  personaA: PersonaInfo | null;
  personaB: PersonaInfo | null;
  maxTurns: number;
  debateComplete: boolean;
  errorBanner: string | null;
};

type StreamingAction =
  | { type: "SET_META"; topic: string; personaA: PersonaInfo; personaB: PersonaInfo; maxTurns: number }
  | { type: "ADD_TURN"; speakerName: string; turnType: "intro" | "debate" | "reflection" }
  | { type: "APPEND_CHUNK"; text: string }
  | { type: "COMPLETE_TURN" }
  | { type: "SET_ERROR"; message: string }
  | { type: "SET_COMPLETE" }
  | { type: "RESET" };

function streamingReducer(state: StreamingState, action: StreamingAction): StreamingState {
  switch (action.type) {
    case "RESET":
      return { ...initialState };
    case "SET_META":
      return {
        ...state,
        topic: action.topic,
        personaA: action.personaA,
        personaB: action.personaB,
        maxTurns: action.maxTurns,
      };
    case "ADD_TURN": {
      if (
        state.activeTurnIndex >= 0 &&
        state.activeTurnIndex < state.turns.length
      ) {
        const active = state.turns[state.activeTurnIndex];
        if (active.speakerName === action.speakerName && active.isStreaming) {
          return state;
        }
      }
      const newTurn: Turn = {
        id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        speakerName: action.speakerName,
        content: "",
        turnType: action.turnType,
        isStreaming: true,
      };
      return {
        ...state,
        turns: [...state.turns, newTurn],
        activeTurnIndex: state.turns.length,
      };
    }
    case "APPEND_CHUNK": {
      if (state.activeTurnIndex < 0) return state;
      const turns = state.turns.map((t, i) =>
        i === state.activeTurnIndex
          ? { ...t, content: t.content + action.text }
          : t
      );
      return { ...state, turns };
    }
    case "COMPLETE_TURN": {
      if (state.activeTurnIndex < 0) return state;
      const turns = state.turns.map((t, i) =>
        i === state.activeTurnIndex ? { ...t, isStreaming: false } : t
      );
      return { ...state, turns };
    }
    case "SET_ERROR":
      return { ...state, errorBanner: action.message };
    case "SET_COMPLETE":
      return { ...state, debateComplete: true };
    default:
      return state;
  }
}

const initialState: StreamingState = {
  turns: [],
  activeTurnIndex: -1,
  topic: "",
  personaA: null,
  personaB: null,
  maxTurns: 12,
  debateComplete: false,
  errorBanner: null,
};

function toRoman(n: number): string {
  const map: [number, string][] = [
    [20, "XX"], [19, "XIX"], [18, "XVIII"], [17, "XVII"], [16, "XVI"],
    [15, "XV"], [14, "XIV"], [13, "XIII"], [12, "XII"], [11, "XI"],
    [10, "X"], [9, "IX"], [8, "VIII"], [7, "VII"], [6, "VI"],
    [5, "V"], [4, "IV"], [3, "III"], [2, "II"], [1, "I"],
  ];
  for (const [value, numeral] of map) {
    if (n >= value) return numeral;
  }
  return "";
}

function TurnTag({ turnType }: { turnType: Turn["turnType"] }) {
  if (turnType === "debate") return null;
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none ${
        turnType === "intro"
          ? "bg-rule/50 text-muted"
          : "bg-mark/10 text-mark"
      }`}
    >
      {turnType}
    </span>
  );
}

function PersonaColors({ isPersonaA }: { isPersonaA: boolean }) {
  if (isPersonaA) {
    return {
      headerBg: "bg-paper",
      headerText: "text-ink",
      bubbleBg: "bg-surface",
      border: "border-rule",
      nameWeight: "font-semibold",
    };
  }
  return {
    headerBg: "bg-[#F0F2F0]",
    headerText: "text-ink",
    bubbleBg: "bg-surface",
    border: "border-rule",
    nameWeight: "font-normal",
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-12 animate-pulse rounded-lg bg-rule/30" />

      <div className="flex justify-start">
        <div className="max-w-[90%] sm:max-w-[75%] animate-pulse rounded-xl border border-rule bg-surface shadow-sm">
          <div className="flex items-center rounded-t-xl bg-paper px-4 py-2">
            <div className="h-3 w-20 rounded bg-rule/50" />
          </div>
          <div className="space-y-2.5 px-4 py-3">
            <div className="h-3 w-full rounded bg-rule/30" />
            <div className="h-3 w-4/5 rounded bg-rule/30" />
            <div className="h-3 w-3/5 rounded bg-rule/30" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="max-w-[90%] sm:max-w-[75%] animate-pulse rounded-xl border border-rule bg-surface shadow-sm">
          <div className="flex items-center rounded-t-xl bg-[#F0F2F0] px-4 py-2">
            <div className="h-3 w-24 rounded bg-rule/50" />
          </div>
          <div className="space-y-2.5 px-4 py-3">
            <div className="h-3 w-full rounded bg-rule/30" />
            <div className="h-3 w-3/4 rounded bg-rule/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

type ApiDebateTurn = {
  id: string;
  speakerName: string;
  content: string;
  sequenceNumber: number;
};

type ApiDebateState = {
  id: string;
  topic: string;
  personaA: PersonaInfo;
  personaB: PersonaInfo;
  maxTurns: number;
  turns: ApiDebateTurn[];
  status: string;
};

function inferTurnType(seq: number, maxTurns: number): "intro" | "debate" | "reflection" {
  if (seq < 2) return "intro";
  if (seq >= maxTurns - 2) return "reflection";
  return "debate";
}

export default function DebatePage() {
  const router = useRouter();
  const pathname = usePathname();
  const debateId = pathname.split("/").pop();

  const [streamState, dispatch] = useReducer(streamingReducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const safeStreamState = streamState ?? initialState;
  const { turns, topic, personaA, personaB, maxTurns, debateComplete, errorBanner } = safeStreamState;

  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const completedTurns = useMemo(
    () => turns.filter((t) => !t.isStreaming).length,
    [turns]
  );

  const lastActiveContent = useMemo(
    () => turns[safeStreamState.activeTurnIndex]?.content,
    [safeStreamState.activeTurnIndex, turns]
  );

  const currentTurnNumber = useMemo(
    () => turns.length > 0 ? turns.length : 1,
    [turns.length]
  );

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildExportData() {
    return {
      id: debateId!,
      topic,
      personaA: { name: personaA?.name ?? "Person A" },
      personaB: { name: personaB?.name ?? "Person B" },
      maxTurns,
      turns: turns.map((t, i) => ({
        speakerName: t.speakerName,
        content: t.content,
        sequenceNumber: i,
      })),
    };
  }

  function handleDownloadMarkdown() {
    const data = buildExportData();
    const md = formatDebateAsMarkdown(data);
    const slugA = personaA?.slug ?? "person-a";
    const slugB = personaB?.slug ?? "person-b";
    download(md, `debate-${slugA}-vs-${slugB}.md`, "text/markdown");
  }

  function handleDownloadJson() {
    const data = buildExportData();
    const json = formatDebateAsJson(data);
    const slugA = personaA?.slug ?? "person-a";
    const slugB = personaB?.slug ?? "person-b";
    download(json, `debate-${slugA}-vs-${slugB}.json`, "application/json");
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

  useEffect(() => {
    if (!debateId) return;

    let cancelled = false;

    async function connect() {
      dispatch({ type: "RESET" });

      try {
        const stateRes = await fetch(`/api/debate/state?id=${encodeURIComponent(debateId!)}`);
        if (stateRes.ok) {
          const existing: ApiDebateState = await stateRes.json();
          if (!cancelled) {
            dispatch({ type: "SET_META", topic: existing.topic, personaA: existing.personaA, personaB: existing.personaB, maxTurns: existing.maxTurns });

            for (const turn of existing.turns) {
              const turnType = inferTurnType(turn.sequenceNumber, existing.maxTurns);
              dispatch({ type: "ADD_TURN", speakerName: turn.speakerName, turnType });
              dispatch({ type: "APPEND_CHUNK", text: turn.content });
              dispatch({ type: "COMPLETE_TURN" });
            }

            if (existing.status === "completed") {
              dispatch({ type: "SET_COMPLETE" });
              return;
            }
          }
        }
      } catch {
        // No existing state — treat as a fresh debate
      }

      const url = new URL("/api/debate/stream", window.location.origin);
      url.searchParams.set("id", debateId!);
      const evtSource = new EventSource(url.toString());
      eventSourceRef.current = evtSource;

      evtSource.addEventListener("debate-meta", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            topic: string;
            personaA: PersonaInfo;
            personaB: PersonaInfo;
            maxTurns: number;
          };
          dispatch({ type: "SET_META", topic: data.topic, personaA: data.personaA, personaB: data.personaB, maxTurns: data.maxTurns });
        } catch (e) {
          console.error("Failed to parse debate-meta event:", e);
        }
      });

      evtSource.addEventListener("chunk", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            speakerSlug: string;
            speakerName: string;
            text: string;
            turnType: "intro" | "debate" | "reflection";
          };
          dispatch({ type: "ADD_TURN", speakerName: data.speakerName, turnType: data.turnType });
          dispatch({ type: "APPEND_CHUNK", text: data.text });
        } catch (e) {
          console.error("Failed to parse chunk event:", e);
        }
      });

      evtSource.addEventListener("turn-complete", () => {
        dispatch({ type: "COMPLETE_TURN" });
      });

      evtSource.addEventListener("error", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { message: string };
          dispatch({ type: "SET_ERROR", message: data.message });
        } catch {
          dispatch({ type: "SET_ERROR", message: "Connection error" });
        }
      });

      evtSource.addEventListener("debate-complete", () => {
        dispatch({ type: "SET_COMPLETE" });
        evtSource.close();
      });

      return evtSource;
    }

    const evtSourcePromise = connect();

    return () => {
      cancelled = true;
      evtSourcePromise.then((evtSource) => {
        if (evtSource) evtSource.close();
        eventSourceRef.current = null;
      });
    };
  }, [debateId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, lastActiveContent]);

  if (debateComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4 sm:p-6 text-ink">
        <h2 className="mb-4 text-2xl font-bold tracking-tight font-serif">Debate complete</h2>
        <p className="mb-6 max-w-md text-center text-muted">
          {personaA?.name ?? "Person A"} and {personaB?.name ?? "Person B"} have shared their
          reflections. The conversation has ended.
        </p>
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleDownloadMarkdown}
            className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-paper"
          >
            Download Markdown
          </button>
          <button
            onClick={handleDownloadJson}
            className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-paper"
          >
            Download JSON
          </button>
          <button
            onClick={handleCopyLink}
            className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-paper"
          >
            Copy Link
          </button>
        </div>
        {showCopiedToast && (
          <p className="mb-6 text-xs text-mark">Link copied to clipboard</p>
        )}
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-ink px-6 py-3 text-sm font-medium text-surface transition-colors hover:opacity-90"
        >
          New Debate
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-rule bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3">
          <span className="text-sm font-medium text-ink font-serif">Book Dialogues</span>
          <div className="flex items-center gap-2">
            <RateIndicator />
            {turns.length > 0 && (
              <span className="text-xs text-muted font-serif hidden sm:inline">
                {toRoman(completedTurns)} / {toRoman(maxTurns)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6">
        {topic && (
          <div className="mb-1 rounded-lg bg-surface px-3 py-3 sm:px-4 sm:py-4 text-center text-ink font-serif text-sm sm:text-base">
            &ldquo;{topic}&rdquo;
          </div>
        )}

        {turns.length > 0 && (
          <TurnLedger
            maxTurns={maxTurns}
            completedTurns={completedTurns}
            currentTurnNumber={currentTurnNumber}
          />
        )}

        {(personaA?.coherence === "moderate" || personaB?.coherence === "moderate") && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-mark/20 bg-mark/5 p-3 text-sm text-mark">
            <span className="flex-shrink-0">&#9888;</span>
            <span>
              {[
                personaA?.coherence === "moderate" && `${personaA.name}'s voice is limited in emotional depth.`,
                personaB?.coherence === "moderate" && `${personaB.name}'s voice is limited in emotional depth.`,
              ]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        )}

        {errorBanner && (
          <div className="mb-4 animate-error-banner rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorBanner}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto">
          {turns.length === 0 ? (
            <LoadingSkeleton />
          ) : turns.map((turn) => {
            const isPersonaA = personaA ? turn.speakerName === personaA.name : true;
            const colors = PersonaColors({ isPersonaA });

            return (
              <div
                key={turn.id}
                className={`flex animate-bubble-in ${isPersonaA ? "justify-start" : "justify-end"}`}
              >
                <div className={`max-w-[90%] sm:max-w-[75%] rounded-xl border shadow-sm ${colors.bubbleBg} ${colors.border}`}>
                  <div className={`flex items-center rounded-t-xl px-5 py-2 text-xs ${colors.headerBg} ${colors.headerText} ${colors.nameWeight} font-serif`}>
                    {turn.isStreaming && (
                      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-mark" />
                    )}
                    {turn.speakerName}
                    <TurnTag turnType={turn.turnType} />
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
