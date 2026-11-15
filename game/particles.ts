// Particles: impact puffs, fix sparkles, close-call confetti and rocket exhaust.
// They come from one fixed pool (size: --particle-max). When it's full, the
// oldest particles get reused, so there's never more than that many.
import { tokens } from "./tokens";

export type ParticleKind = "puff" | "sparkle" | "confetti" | "exhaust";

export type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds left; 0 = free to reuse
  maxLife: number;
  size: number;
  angle: number;
  color: string;
};

// speed (units/s), life (s) and size (px) are [min, max]; gravity pulls down the screen.
const KINDS: Record<ParticleKind, { speed: number[]; life: number[]; size: number[]; gravity: number; drag: number }> = {
  puff: { speed: [15, 70], life: [0.6, 1.3], size: [3, 7], gravity: 0, drag: 2.5 },
  sparkle: { speed: [30, 90], life: [0.4, 0.9], size: [1.5, 3], gravity: 0, drag: 3 },
  confetti: { speed: [80, 200], life: [1, 1.8], size: [3, 5], gravity: 160, drag: 1.5 },
  exhaust: { speed: [5, 25], life: [0.25, 0.5], size: [1.5, 3], gravity: 0, drag: 1 },
};

const rand = ([min, max]: number[]) => min + Math.random() * (max - min);

export function createParticles(max: number) {
  const pool: Particle[] = Array.from({ length: max }, () => ({
    kind: "puff", x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, angle: 0, color: "",
  }));
  let next = 0;

  function colorFor(kind: ParticleKind) {
    if (kind !== "confetti") return tokens[kind];
    const colors = tokens.confetti.split(/\s+/);
    return colors[Math.floor(Math.random() * colors.length)];
  }

  return {
    pool,
    /** Sends `count` particles of one kind flying out from x,y. */
    burst(kind: ParticleKind, x: number, y: number, count: number) {
      const k = KINDS[kind];
      for (let i = 0; i < count; i++) {
        const p = pool[next];
        next = (next + 1) % pool.length;
        const dir = Math.random() * Math.PI * 2;
        const speed = rand(k.speed);
        Object.assign(p, {
          kind, x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed - (kind === "confetti" ? 80 : 0),
          life: rand(k.life), size: rand(k.size), angle: dir, color: colorFor(kind),
        });
        p.maxLife = p.life;
      }
    },
    step(dt: number) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        const k = KINDS[p.kind];
        p.life -= dt;
        p.vx *= 1 - k.drag * dt;
        p.vy = p.vy * (1 - k.drag * dt) + k.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += dt * 8;
      }
    },
    clear() {
      for (const p of pool) p.life = 0;
    },
  };
}

export type Particles = ReturnType<typeof createParticles>;
