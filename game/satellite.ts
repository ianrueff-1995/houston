// One satellite: where it is on its orbit and how it's feeling.
// Moods: OK → Needs check → Critical → Falling. A check sends it back to OK.
// While it's healthy it rides on rails (this file moves it along a circle);
// once it falls, game/world.ts takes over.
import { tokens } from "./tokens";
import { orbitSpeed } from "./world";

export type Status = "launching" | "ok" | "warn" | "critical" | "falling";

export type Satellite = {
  id: number;
  name: string;
  status: Status;
  timeLeft: number; // seconds left in the current status
  orbit: number; // orbit radius, from the planet's center
  angle: number; // position on the orbit, in radians
  x: number;
  y: number;
  uptime: number; // seconds spent in orbit
};

export const STATUS_LABELS: Record<Status, string> = {
  launching: "Launching",
  ok: "OK",
  warn: "Needs check",
  critical: "Critical",
  falling: "Falling",
};

const NAMES = ["Pickle", "Biscuit", "Noodle", "Waffles", "Gizmo", "Mochi", "Pebble", "Sprout", "Nugget", "Ziggy", "Bloop", "Tofu"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const okTime = () => rand(tokens.okMin, tokens.okMax);

/** A new satellite. With `launchAngle` it starts on that base and flies up; without, it's already in orbit. */
export function createSatellite(id: number, launchAngle?: number): Satellite {
  const launching = launchAngle !== undefined;
  const angle = launchAngle ?? rand(0, Math.PI * 2);
  const r = tokens.planetRadius;
  return {
    id,
    name: `${NAMES[(id - 1) % NAMES.length]}-${id}`,
    status: launching ? "launching" : "ok",
    timeLeft: launching ? tokens.launchTime : okTime(),
    orbit: r + rand(tokens.orbitLow, tokens.orbitHigh),
    angle,
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
    uptime: 0,
  };
}

/** Moves a satellite forward by dt seconds. `decay` speeds up its moods. Returns true when it starts falling. */
export function stepSatellite(s: Satellite, dt: number, decay: number): boolean {
  if (s.status === "falling") return false; // world.ts moves it now
  let r = s.orbit;
  if (s.status === "launching") {
    const p = 1 - s.timeLeft / tokens.launchTime; // 0 → 1 during the climb
    r = tokens.planetRadius + (s.orbit - tokens.planetRadius) * (1 - (1 - p) ** 2);
    s.angle += orbitSpeed(s.orbit) * p * dt;
    s.timeLeft -= dt;
  } else {
    s.angle += orbitSpeed(s.orbit) * dt;
    s.timeLeft -= dt * decay;
    s.uptime += dt;
  }
  s.x = Math.cos(s.angle) * r;
  s.y = Math.sin(s.angle) * r;
  if (s.timeLeft > 0) return false;

  if (s.status === "launching" || s.status === "critical") {
    s.status = s.status === "launching" ? "ok" : "falling";
    s.timeLeft = s.status === "ok" ? okTime() : Infinity;
  } else {
    s.status = s.status === "ok" ? "warn" : "critical";
    s.timeLeft = s.status === "warn" ? tokens.warnTime : tokens.criticalTime;
  }
  return s.status === "falling";
}

/** A check: back to OK. Returns the status it was rescued from, or null if it didn't need one. */
export function fixSatellite(s: Satellite): Status | null {
  if (s.status !== "warn" && s.status !== "critical") return null;
  const was = s.status;
  s.status = "ok";
  s.timeLeft = okTime();
  return was;
}

/** Lower is more urgent: critical before needs-check, then whoever has the least time left. */
export const urgency = (s: Satellite) =>
  s.status === "critical" ? s.timeLeft : s.status === "warn" ? 100 + s.timeLeft : Infinity;
