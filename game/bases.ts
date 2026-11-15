// Launch bases on the planet's surface.
// Ready → Launching → Cooling down → Ready. Every launch uses one fuel; an
// empty base has to Refuel (a short progress bar) before it can launch again.
import { tokens } from "./tokens";

export type BaseStatus = "ready" | "launching" | "cooldown" | "empty" | "refueling";

export type Base = {
  id: number;
  name: string;
  angle: number; // where it sits on the planet, in radians (0 = right, clockwise)
  status: BaseStatus;
  timeLeft: number; // seconds left in the current status
  fuel: number; // launches left before it needs a refuel
};

export const BASE_LABELS: Record<BaseStatus, string> = {
  ready: "Ready",
  launching: "Launching",
  cooldown: "Cooling down",
  empty: "Needs fuel",
  refueling: "Refueling",
};

/** The bases. Keys 1, 2, 3… follow this order. */
const BASES = [
  { name: "Alpha", angle: -Math.PI / 2 },
  { name: "Bravo", angle: Math.PI / 6 },
  { name: "Charlie", angle: (5 * Math.PI) / 6 },
];

export const createBases = (): Base[] =>
  BASES.map((b, id) => ({ id, ...b, status: "ready", timeLeft: 0, fuel: tokens.launchesPerTank }));

export const canLaunch = (b: Base) => b.status === "ready";
export const canRefuel = (b: Base) =>
  (b.status === "ready" || b.status === "empty") && b.fuel < tokens.launchesPerTank;

export function launch(b: Base) {
  if (!canLaunch(b)) return false;
  b.status = "launching";
  b.timeLeft = tokens.launchTime;
  b.fuel -= 1;
  return true;
}

export function refuel(b: Base) {
  if (!canRefuel(b)) return false;
  b.status = "refueling";
  b.timeLeft = tokens.refuelTime;
  return true;
}

export function stepBase(b: Base, dt: number) {
  if (b.status === "ready" || b.status === "empty") return;
  b.timeLeft -= dt;
  if (b.timeLeft > 0) return;
  if (b.status === "launching") {
    b.status = "cooldown";
    b.timeLeft = tokens.cooldownTime;
  } else if (b.status === "cooldown") {
    b.status = b.fuel > 0 ? "ready" : "empty";
  } else {
    b.status = "ready";
    b.fuel = tokens.launchesPerTank;
  }
}

/** 0 → 1 through the current timed status, for progress bars. */
export function baseProgress(b: Base) {
  const total =
    b.status === "launching" ? tokens.launchTime
    : b.status === "cooldown" ? tokens.cooldownTime
    : b.status === "refueling" ? tokens.refuelTime
    : 0;
  return total ? Math.min(1, 1 - b.timeLeft / total) : 0;
}
