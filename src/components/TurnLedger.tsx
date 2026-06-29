"use client";

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

type TurnLedgerProps = {
  maxTurns: number;
  completedTurns: number;
  currentTurnNumber: number;
};

export default function TurnLedger({
  maxTurns,
  completedTurns,
  currentTurnNumber,
}: TurnLedgerProps) {
  const ticks = Array.from({ length: maxTurns }, (_, i) => i + 1);

  return (
    <>
      <div className="hidden sm:block relative px-1 mb-6">
        <div className="absolute inset-x-0 top-1/2 h-px bg-rule -translate-y-1/2" />
        <div className="flex justify-between relative">
          {ticks.map((num) => {
            const isCompleted = num <= completedTurns;
            const isCurrent = num === currentTurnNumber;

            return (
              <div key={num} className="flex flex-col items-center relative" style={{ width: `${100 / maxTurns}%` }}>
                {isCurrent && (
                  <span className="text-xs font-serif text-ink mb-1 leading-none">
                    {toRoman(num)}
                  </span>
                )}
                <div
                  className={`w-[3px] h-5 transition-[transform,background-color] duration-300 ease-out ${
                    isCompleted
                      ? "bg-mark scale-y-100"
                      : "bg-rule scale-y-[0.3]"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="sm:hidden mb-6 text-center">
        <span className="text-sm font-serif text-ink">
          Turn {toRoman(currentTurnNumber)} / {toRoman(maxTurns)}
        </span>
      </div>
    </>
  );
}
