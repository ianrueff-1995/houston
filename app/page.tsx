"use client";
// The Houston screen: header with counters, the scenario panel, the sky, the
// launch bases and the satellite list. The game itself lives in game/store.ts.
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import BaseCard from "@/components/BaseCard";
import GameCanvas from "@/components/GameCanvas";
import SatelliteList from "@/components/SatelliteList";
import ScenarioPanel from "@/components/ScenarioPanel";
import { baseAction, checkMostUrgent, getServerSnapshot, getSnapshot, reset, start, stop, subscribe } from "@/game/store";

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Home() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    start();
    return stop;
  }, []);

  // Keys: 1–3 launch (or refuel an empty base), Space checks the most urgent satellite, R resets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement) return;
      if (getSnapshot().phase !== "playing") return;
      if (e.key >= "1" && e.key <= "9") baseAction(Number(e.key) - 1);
      else if (e.key === " ") {
        e.preventDefault();
        checkMostUrgent();
      } else if (e.key.toLowerCase() === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 pb-28 font-sans md:pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Houston</h1>
          <p className="text-muted">Houston, we have a problem.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Counter label="in orbit" value={state.inOrbit} />
          <Counter label="saved" value={state.saved} />
          <Counter label="crashed" value={state.crashed} />
          <Counter label="longest uptime" value={formatTime(state.longestUptime)} />
          <button
            onClick={() => reset()}
            className="rounded-full border border-line px-4 py-1.5 font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </header>

      <ScenarioPanel scenario={state.scenario} speed={state.speed} showOrbits={state.showOrbits} />

      <main className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="relative -mx-4 aspect-square overflow-hidden bg-space md:mx-0 md:aspect-auto md:h-[min(60vh,600px)] md:rounded-xl">
            {state.phase !== "error" && <GameCanvas />}
            {state.phase === "loading" && <Overlay>Warming up the planet…</Overlay>}
            {state.phase === "playing" && state.satellites.length === 0 && (
              <Overlay bottom>The sky is empty. Launch something.</Overlay>
            )}
            {state.phase === "error" && (
              <Overlay>
                <p className="text-lg font-medium">Houston, we have an actual problem.</p>
                <p className="text-white/70">Something went wrong while running the game. A reload usually fixes it.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="pointer-events-auto mt-2 rounded-full bg-white px-5 py-2 font-medium text-black"
                >
                  Reload
                </button>
              </Overlay>
            )}
          </div>
          <div className="hidden gap-3 md:grid md:auto-cols-fr md:grid-flow-col">
            {state.bases.map((base) => (
              <BaseCard key={base.id} base={base} />
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-col md:max-h-[min(60vh,600px)]">
          <SatelliteList satellites={state.satellites} />
        </div>
      </main>

      <p className="hidden text-xs text-muted md:block">
        Keys: 1–{state.bases.length || 3} launch · Space checks the most urgent satellite · R resets
      </p>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid auto-cols-fr grid-flow-col gap-2 border-t border-line bg-background/90 p-3 backdrop-blur md:hidden">
        {state.bases.map((base) => (
          <BaseCard key={base.id} base={base} compact />
        ))}
      </nav>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span>
      <span className="font-mono text-base font-semibold tabular-nums">{value}</span>{" "}
      <span className="text-muted">{label}</span>
    </span>
  );
}

function Overlay({ children, bottom = false }: { children: ReactNode; bottom?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col items-center gap-2 p-6 text-center text-white ${
        bottom ? "justify-end" : "justify-center"
      }`}
    >
      {children}
    </div>
  );
}
