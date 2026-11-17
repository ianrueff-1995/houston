"use client";
// Every satellite with its status and a Check button. The game is fully
// playable from here, without the canvas. On phones the list starts collapsed.
import { useState } from "react";
import { STATUS_LABELS } from "@/game/satellite";
import { check, type SatelliteView } from "@/game/store";

const DOT = {
  launching: "bg-ok/40",
  ok: "bg-ok",
  warn: "bg-warn animate-pulse",
  critical: "bg-critical",
  falling: "bg-falling",
};

export default function SatelliteList({ satellites }: { satellites: SatelliteView[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex min-h-0 flex-col rounded-xl cel bg-card text-sm">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center justify-between p-3 font-medium md:pointer-events-none"
      >
        Satellites ({satellites.length})
        <span className="text-muted md:hidden">{open ? "Hide" : "Show"}</span>
      </button>
      <ul className={`${open ? "block" : "hidden"} min-h-0 overflow-y-auto border-t-2 border-foreground md:block`}>
        {satellites.length === 0 && <li className="p-3 text-muted">Nothing up there yet.</li>}
        {satellites.map((s) => {
          const needsCheck = s.status === "warn" || s.status === "critical";
          return (
            <li key={s.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0">
              <span className={`cel-dot size-3 shrink-0 rounded-full ${DOT[s.status]}`} />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-xs text-muted">
                {STATUS_LABELS[s.status]}
                {needsCheck && ` · ${Math.ceil(s.timeLeft)}s`}
              </span>
              <button
                disabled={!needsCheck}
                onClick={() => check(s.id)}
                className="cel-button rounded-md px-2.5 py-1 text-xs font-semibold enabled:hover:bg-black/5 disabled:opacity-30 dark:enabled:hover:bg-white/10"
              >
                Check
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
