// The physics world, written by hand (no physics library).
// Healthy satellites ride on rails: satellite.ts moves them along a circle.
// A falling satellite keeps part of its orbit speed, gets pulled toward the
// planet's center every step, and a little drag makes its orbit decay so it
// curves in. On impact it breaks into debris that bounces, piles up on the
// surface and fades.
// Designers: leave this file alone unless asked. Tune the feel with the tokens.
import { tokens } from "./tokens";
import type { Satellite } from "./satellite";

/** The planet's pull, chosen so an orbit 200 units out takes 14 s at --orbit-speed: 1. */
const gm = () => ((2 * Math.PI * tokens.orbitSpeed) / 14) ** 2 * 200 ** 3;

/** Angular speed (radians/s) of a circular orbit with radius r. */
export const orbitSpeed = (r: number) => Math.sqrt(gm() / r ** 3);

type Body = { x: number; y: number; vx: number; vy: number };
export type Debris = Body & {
  angle: number;
  spin: number;
  size: number;
  age: number;
  rest: number; // seconds it has been barely moving; after half a second it sleeps
  points: { x: number; y: number }[];
};
export type Impact = { sat: Satellite; x: number; y: number };

const FRICTION = 6; // how quickly debris stops sliding
const asleep = (p: Debris) => p.rest > 0.5;

/** Pulls a loose body toward the planet's center for dt seconds, then moves it. */
function fall(b: Body, dt: number, drag = 0) {
  const d = Math.hypot(b.x, b.y);
  const pull = (gm() / (d * d)) * dt;
  b.vx = (b.vx - (b.x / d) * pull) * (1 - drag * dt);
  b.vy = (b.vy - (b.y / d) * pull) * (1 - drag * dt);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

export function createWorld() {
  const falling = new Map<Satellite, Body>();
  const debris: Debris[] = [];

  return {
    debris,

    /** The satellite starts falling: it leaves its rails with part of its orbit speed. */
    drop(sat: Satellite) {
      const speed = orbitSpeed(sat.orbit) * sat.orbit * tokens.fallKeepSpeed;
      falling.set(sat, { x: sat.x, y: sat.y, vx: -Math.sin(sat.angle) * speed, vy: Math.cos(sat.angle) * speed });
    },

    /** Breaks a crashed satellite into debris at x,y. */
    shatter(x: number, y: number) {
      const count = Math.round(tokens.debrisMin + Math.random() * (tokens.debrisMax - tokens.debrisMin));
      const d = Math.hypot(x, y) || 1;
      const nx = x / d, ny = y / d; // "up", away from the planet
      for (let i = 0; i < count; i++) {
        const corners = 3 + Math.floor(Math.random() * 3);
        const points = Array.from({ length: corners }, (_, j) => {
          const a = (j / corners) * Math.PI * 2;
          const r = tokens.debrisSize * (0.6 + Math.random() * 0.6);
          return { x: Math.cos(a) * r, y: Math.sin(a) * r };
        });
        const up = 40 + Math.random() * 90, side = (Math.random() - 0.5) * 160;
        debris.push({
          x: x + nx * 4, y: y + ny * 4, vx: nx * up - ny * side, vy: ny * up + nx * side,
          angle: Math.random() * 6, spin: (Math.random() - 0.5) * 20, size: tokens.debrisSize, age: 0, rest: 0, points,
        });
      }
    },

    /** Advances the physics by dt seconds. Returns the satellites that hit the planet. */
    step(dt: number): Impact[] {
      const ground = tokens.planetRadius;
      const hits: Impact[] = [];
      for (const [sat, body] of falling) {
        fall(body, dt, tokens.fallDrag);
        [sat.x, sat.y] = [body.x, body.y];
        if (Math.hypot(body.x, body.y) < ground + tokens.satelliteSize / 2) {
          hits.push({ sat, x: body.x, y: body.y });
          falling.delete(sat);
        }
      }

      const rub = Math.max(0, 1 - FRICTION * dt);
      for (const p of debris) {
        p.age += dt;
        if (asleep(p)) continue;
        fall(p, dt);
        p.angle += p.spin * dt;
      }
      // Debris pieces push each other apart, so they pile up instead of overlapping.
      // A sleeping piece doesn't budge; the awake one does all the moving.
      for (let i = 0; i < debris.length; i++) {
        for (let j = i + 1; j < debris.length; j++) {
          const a = debris[i], b = debris[j];
          if (asleep(a) && asleep(b)) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
          const overlap = (a.size + b.size) * 0.8 - d;
          if (overlap <= 0) continue;
          const nx = dx / d, ny = dy / d;
          const wa = asleep(a) ? 0 : asleep(b) ? 1 : 0.5, wb = 1 - wa; // who moves how much
          const closing = Math.min(0, (b.vx - a.vx) * nx + (b.vy - a.vy) * ny);
          a.x -= nx * overlap * wa; a.y -= ny * overlap * wa;
          b.x += nx * overlap * wb; b.y += ny * overlap * wb;
          a.vx = (a.vx + nx * closing * wa) * rub; a.vy = (a.vy + ny * closing * wa) * rub;
          b.vx = (b.vx - nx * closing * wb) * rub; b.vy = (b.vy - ny * closing * wb) * rub;
        }
      }
      // The ground: debris can't sink into the planet. It bounces, then slides to a stop.
      for (const p of debris) {
        if (asleep(p)) continue;
        const d = Math.hypot(p.x, p.y), floor = ground + p.size * 0.6;
        if (d < floor) {
          const nx = p.x / d, ny = p.y / d;
          const into = p.vx * nx + p.vy * ny; // speed toward the ground (negative)
          const along = (p.vy * nx - p.vx * ny) * rub; // speed along it
          const bounce = into < -20 ? -into * tokens.debrisBounce : 0; // tiny bounces stop
          p.x = nx * floor; p.y = ny * floor;
          p.vx = nx * bounce - ny * along;
          p.vy = ny * bounce + nx * along;
          p.spin = along / p.size; // roll along the surface
        }
        p.rest = Math.hypot(p.vx, p.vy) < 10 ? p.rest + dt : 0; // slow for a while = asleep
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        if (debris[i].age > tokens.debrisFade) debris.splice(i, 1);
      }
      return hits;
    },
  };
}

export type PhysicsWorld = ReturnType<typeof createWorld>;
