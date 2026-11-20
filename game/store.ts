// The game store: all game state, the game loop, and the actions the UI calls.
// It lives outside React. Components read a small snapshot about 5 times a
// second (useSyncExternalStore), so React never re-renders on every frame.
import { BASE_LABELS, baseProgress, canLaunch, canRefuel, createBases, launch, refuel, stepBase, type Base } from "./bases";
import { createParticles, type Particles } from "./particles";
import { createSatellite, fixSatellite, stepSatellite, urgency, type Satellite } from "./satellite";
import { getScenario, type ScenarioId } from "./scenarios";
import { readTokens, tokens } from "./tokens";
import { createWorld, type PhysicsWorld } from "./world";

const STEP = 1 / 60; // the game moves in fixed 60 Hz steps
const UI_EVERY = 200; // ms between UI updates (5×/s)
const TOKENS_EVERY = 500; // ms between re-reading globals.css

export type Phase = "loading" | "playing" | "error";
export type Label = { text: string; x: number; y: number; age: number };

/** Everything in the game. Only this file changes it; GameCanvas reads it every frame. */
export const game = {
  phase: "loading" as Phase,
  scenario: "calm" as ScenarioId,
  speed: 1,
  showOrbits: false,
  satellites: [] as Satellite[],
  bases: [] as Base[],
  labels: [] as Label[], // floating text like "close call!"
  saved: 0,
  crashed: 0,
  longestUptime: 0,
  nextId: 1,
  world: null as PhysicsWorld | null,
  particles: null as Particles | null,
};

// ---- Actions (the UI calls these) ----

export function reset(scenario = game.scenario) {
  readTokens();
  Object.assign(game, { scenario, saved: 0, crashed: 0, longestUptime: 0, nextId: 1, labels: [] });
  game.world = createWorld();
  game.particles = createParticles(tokens.particleMax);
  game.bases = createBases();
  game.satellites = Array.from({ length: getScenario(scenario).startWith }, () => createSatellite(game.nextId++));
  emit();
}

export function launchFrom(baseIndex: number) {
  const base = game.bases[baseIndex];
  if (!base || !launch(base)) return;
  const sat = createSatellite(game.nextId++, base.angle);
  game.satellites.push(sat);
  game.particles?.burst("puff", sat.x, sat.y, 10);
  emit();
}

export function refuelBase(baseIndex: number) {
  const base = game.bases[baseIndex];
  if (base && refuel(base)) emit();
}

/** Keys 1–3: launch if the base is ready, otherwise refuel if it's empty. */
export function baseAction(baseIndex: number) {
  const base = game.bases[baseIndex];
  if (base?.status === "empty") refuelBase(baseIndex);
  else launchFrom(baseIndex);
}

/** Fixes a satellite: a sparkle, and confetti if it was critical. */
export function check(id: number) {
  const sat = game.satellites.find((s) => s.id === id);
  const was = sat && fixSatellite(sat);
  if (!sat || !was) return;
  game.saved += 1;
  game.particles?.burst("sparkle", sat.x, sat.y, 16);
  if (was === "critical") {
    game.particles?.burst("confetti", sat.x, sat.y, 30);
    game.labels.push({ text: "close call!", x: sat.x, y: sat.y - 14, age: 0 });
  }
  emit();
}

/** Space: checks whichever satellite is closest to falling. */
export function checkMostUrgent() {
  const next = [...game.satellites].sort((a, b) => urgency(a) - urgency(b))[0];
  if (next && urgency(next) < Infinity) check(next.id);
}

export const setScenario = (id: ScenarioId) => reset(id);
export const setSpeed = (speed: number) => { game.speed = speed; emit(); };
export const toggleOrbits = () => { game.showOrbits = !game.showOrbits; emit(); };

/**
 * The satellite that needs a check under a point in sky coordinates, if any (for clicks
 * on the canvas). Healthy ones are skipped, so they never block a click on a nearby one.
 */
export function satelliteAt(x: number, y: number) {
  let best: Satellite | undefined;
  let bestDistance = tokens.hitRadius;
  for (const s of game.satellites) {
    if (urgency(s) === Infinity) continue; // OK, launching or falling: nothing to check
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestDistance) [best, bestDistance] = [s, d];
  }
  return best;
}

// ---- The game loop ----

function tick(dt: number) {
  const { world, particles } = game;
  if (!world || !particles) return;
  const decay = getScenario(game.scenario).decay;
  for (const base of game.bases) stepBase(base, dt);
  for (const sat of game.satellites) {
    if (stepSatellite(sat, dt, decay)) world.drop(sat);
    if (sat.status === "launching") particles.burst("exhaust", sat.x, sat.y, 1);
    if (sat.status === "falling" && Math.random() < 0.3) particles.burst("puff", sat.x, sat.y, 1);
    game.longestUptime = Math.max(game.longestUptime, sat.uptime);
  }
  for (const hit of world.step(dt)) {
    game.satellites = game.satellites.filter((s) => s !== hit.sat);
    world.shatter(hit.x, hit.y);
    particles.burst("puff", hit.x, hit.y, 24);
    game.crashed += 1;
  }
  particles.step(dt);
  for (const label of game.labels) label.age += dt;
  game.labels = game.labels.filter((l) => l.age < 1.2);
}

let frameId = 0;
let lastFrame = 0;
let leftover = 0; // time not yet simulated, in seconds
let lastUi = 0;
let lastTokens = 0;
let render: (() => void) | null = null;

function frame(now: number) {
  frameId = requestAnimationFrame(frame);
  try {
    leftover += Math.min(0.25, (now - lastFrame) / 1000); // don't jump ahead after a hidden tab
    lastFrame = now;
    while (leftover >= STEP) {
      tick(STEP * game.speed);
      leftover -= STEP;
    }
    render?.();
    if (now - lastTokens > TOKENS_EVERY) {
      lastTokens = now;
      readTokens();
    }
    if (now - lastUi > UI_EVERY) {
      lastUi = now;
      emit();
    }
  } catch (error) {
    fail(error);
  }
}

/** Starts the game. Add ?demo=loading or ?demo=error to the URL to preview those screens. */
export function start() {
  if (frameId) return;
  try {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo === "loading") return;
    if (demo === "error") throw new Error("Demo error (from ?demo=error)");
    if (!game.world) reset();
    if (process.env.NODE_ENV === "development") Object.assign(window, { houston: game }); // for debugging in the console
    game.phase = "playing";
    lastFrame = performance.now();
    frameId = requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
  }
  emit();
}

export function stop() {
  cancelAnimationFrame(frameId);
  frameId = 0;
}

export function fail(error: unknown) {
  console.error("Houston:", error);
  stop();
  game.phase = "error";
  emit();
}

/** GameCanvas registers its draw function here; it's called once per frame. */
export function setRenderer(fn: (() => void) | null) {
  render = fn;
}

// ---- What the UI sees ----

function makeSnapshot() {
  return {
    phase: game.phase,
    scenario: game.scenario,
    speed: game.speed,
    showOrbits: game.showOrbits,
    inOrbit: game.satellites.filter((s) => s.status !== "launching" && s.status !== "falling").length,
    saved: game.saved,
    crashed: game.crashed,
    longestUptime: game.longestUptime,
    satellites: game.satellites.map(({ id, name, status, timeLeft }) => ({ id, name, status, timeLeft })),
    bases: game.bases.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      label: BASE_LABELS[b.status],
      fuel: b.fuel,
      maxFuel: tokens.launchesPerTank,
      progress: baseProgress(b),
      canLaunch: canLaunch(b),
      canRefuel: canRefuel(b),
    })),
  };
}

export type Snapshot = ReturnType<typeof makeSnapshot>;
export type BaseView = Snapshot["bases"][number];
export type SatelliteView = Snapshot["satellites"][number];

const listeners = new Set<() => void>();
let snapshot = makeSnapshot();
const serverSnapshot = snapshot;

function emit() {
  snapshot = makeSnapshot();
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = () => snapshot;
export const getServerSnapshot = () => serverSnapshot;
