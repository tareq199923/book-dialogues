"use client";

type PersonaInfo = {
  name: string;
  slug: string;
  coherence: "deep" | "moderate" | "shallow";
};

type FormPhase = "idle" | "resolving" | "previewed" | "starting";

type PreviewModalProps = {
  personaA: PersonaInfo;
  personaB: PersonaInfo;
  topicGenerated: boolean;
  editTopic: string;
  onEditTopic: (val: string) => void;
  onRegenerate: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  formPhase: FormPhase;
  error: string | null;
};

function coherenceBadge(level: string) {
  if (level === "deep") {
    return { dot: "bg-emerald-500", label: "Deep", text: "text-emerald-800", bg: "bg-emerald-100" };
  }
  return { dot: "bg-amber-500", label: "Moderate", text: "text-amber-800", bg: "bg-amber-100" };
}

export default function PreviewModal({
  personaA,
  personaB,
  topicGenerated,
  editTopic,
  onEditTopic,
  onRegenerate,
  onCancel,
  onConfirm,
  formPhase,
  error,
}: PreviewModalProps) {
  const isDisabled = formPhase !== "previewed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-modal-backdrop"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl animate-modal-entry"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-ink font-serif">
          Preview &amp; Confirm
        </h2>

        <div className="mb-4 flex gap-4">
          <PersonaCard persona={personaA} side="a" />
          <PersonaCard persona={personaB} side="b" />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-muted">
            Debate topic
          </label>
          <textarea
            value={editTopic}
            onChange={(e) => onEditTopic(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-rule bg-surface px-4 py-3 text-sm text-ink shadow-sm placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        {error && (
          <p className="mb-3 animate-error-slide text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3">
          {topicGenerated && (
            <button
              onClick={onRegenerate}
              disabled={isDisabled}
              className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-paper disabled:opacity-50"
            >
              Regenerate
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isDisabled}
            className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-paper disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDisabled}
            className="ml-auto rounded-lg bg-ink px-6 py-2 text-sm font-medium text-surface transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {formPhase === "starting" ? "Starting debate..." : "Confirm & Start"}
          </button>
        </div>
      </div>


    </div>
  );
}

function PersonaCard({ persona, side }: { persona: PersonaInfo; side: "a" | "b" }) {
  const badge = coherenceBadge(persona.coherence);
  return (
    <div className={`flex-1 rounded-lg border border-rule bg-paper p-3 ${side === "a" ? "font-serif font-semibold" : "font-serif"}`}>
      <p className="text-sm text-ink">{persona.name}</p>
      <p className="text-xs text-muted">{persona.slug}</p>
      <span
        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    </div>
  );
}
