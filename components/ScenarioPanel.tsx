"use client";
// The panel at the top: pick a scenario, a game speed, and whether to draw orbits.
import type { ReactNode } from "react";
import { SCENARIOS, SPEEDS } from "@/game/scenarios";
import { setScenario, setSpeed, toggleOrbits, type Snapshot } from "@/game/store";

type Props = Pick<Snapshot, "scenario" | "speed" | "showOrbits">;

export default function ScenarioPanel({ scenario, speed, showOrbits }: Props) {
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-card p-3 text-sm">
      <Group label="Scenario">
        {SCENARIOS.map((s) => (
          <Chip key={s.id} active={s.id === scenario} title={s.hint} onClick={() => setScenario(s.id)}>
            {s.label}
          </Chip>
        ))}
      </Group>
      <Group label="Speed">
        {SPEEDS.map((v) => (
          <Chip key={v} active={v === speed} onClick={() => setSpeed(v)}>
            {v}×
          </Chip>
        ))}
      </Group>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={showOrbits} onChange={toggleOrbits} className="size-4 accent-foreground" />
        Show orbits
      </label>
    </section>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-muted">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, children, ...props }: { active: boolean; children: ReactNode; title?: string; onClick: () => void }) {
  return (
    <button
      {...props}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active ? "border-accent bg-accent text-accent-text" : "border-line hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
