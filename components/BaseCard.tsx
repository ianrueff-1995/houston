"use client";
// One launch base: its status, fuel, progress, and the Launch / Refuel buttons.
// `compact` is the phone version that sits in the bottom bar.
import { launchFrom, refuelBase, type BaseView } from "@/game/store";

const LIGHT = { ready: "bg-ok", launching: "bg-warn", cooldown: "bg-muted", empty: "bg-critical", refueling: "bg-warn" };

export default function BaseCard({ base, compact = false }: { base: BaseView; compact?: boolean }) {
  const key = base.id + 1;
  const progress = (
    <div className="h-2 cel-dot overflow-hidden rounded-full bg-line">
      <div
        className="h-full bg-foreground transition-[width] duration-200 ease-linear"
        style={{ width: `${base.progress * 100}%` }}
      />
    </div>
  );

  if (compact) {
    const refuel = base.status === "empty";
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 truncate text-xs text-muted">
          <span className={`cel-dot size-2 shrink-0 rounded-full ${LIGHT[base.status]}`} />
          {base.name} · {base.label}
        </span>
        <button
          disabled={refuel ? !base.canRefuel : !base.canLaunch}
          onClick={() => (refuel ? refuelBase(base.id) : launchFrom(base.id))}
          className="cel-button rounded-lg bg-accent px-2 py-2 text-sm font-medium text-accent-text disabled:opacity-40"
        >
          {refuel ? "Refuel" : "Launch"}
        </button>
        {progress}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl cel bg-card p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {base.name} <kbd className="ml-1 rounded border border-line px-1.5 text-xs text-muted">{key}</kbd>
        </span>
        <span className="flex gap-1" aria-label={`Fuel: ${base.fuel} of ${base.maxFuel}`}>
          {Array.from({ length: base.maxFuel }, (_, i) => (
            <span key={i} className={`cel-dot h-3 w-2 rounded-sm ${i < base.fuel ? "bg-foreground" : "bg-line"}`} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2 text-muted">
        <span className={`size-2 rounded-full ${LIGHT[base.status]}`} />
        {base.label}
      </div>
      {progress}
      <div className="flex gap-2">
        <button
          disabled={!base.canLaunch}
          onClick={() => launchFrom(base.id)}
          className="flex-1 cel-button rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-text disabled:opacity-40"
        >
          Launch
        </button>
        <button
          disabled={!base.canRefuel}
          onClick={() => refuelBase(base.id)}
          className="cel-button rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Refuel
        </button>
      </div>
    </div>
  );
}
