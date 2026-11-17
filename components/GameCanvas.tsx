"use client";
// Draws the sky on a <canvas> and turns clicks on satellites into checks.
// Everything you see in the sky is drawn here. Colors and sizes come from the
// design tokens in app/globals.css.
import { useEffect, useRef, type PointerEvent } from "react";
import { check, fail, game, satelliteAt, setRenderer } from "@/game/store";
import type { Satellite } from "@/game/satellite";
import { tokens } from "@/game/tokens";

const SKY = 600; // the sky is a 600×600 square, scaled to fit the canvas
const TAU = Math.PI * 2;

export default function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return fail(new Error("Canvas 2D is not available"));
    // Match the canvas to its size on screen, times the pixel density, so it stays sharp.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    setRenderer(() => draw(ctx, canvas.width, canvas.height));
    return () => {
      observer.disconnect();
      setRenderer(null);
    };
  }, []);

  // Screen position → sky coordinates (planet center = 0,0).
  const toSky = (e: PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const scale = Math.min(box.width, box.height) / SKY;
    return [(e.clientX - box.left - box.width / 2) / scale, (e.clientY - box.top - box.height / 2) / scale] as const;
  };

  return (
    <canvas
      ref={ref}
      className="block h-full w-full touch-manipulation"
      aria-label="The planet and its satellites. Click a satellite to check it."
      onPointerDown={(e) => {
        const sat = satelliteAt(...toSky(e));
        if (sat) check(sat.id);
      }}
      onPointerMove={(e) => {
        e.currentTarget.style.cursor = satelliteAt(...toSky(e)) ? "pointer" : "default";
      }}
    />
  );
}

function draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const now = performance.now() / 1000; // real time, for blinking and wobbling
  const scale = Math.min(width, height) / SKY;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = tokens.space;
  ctx.fillRect(0, 0, width, height);
  drawStars(ctx, width, height);
  ctx.setTransform(scale, 0, 0, scale, width / 2, height / 2);

  if (game.showOrbits) {
    ctx.strokeStyle = tokens.orbitLine;
    ctx.lineWidth = 1 / scale;
    for (const s of game.satellites) circle(ctx, 0, 0, s.orbit, "stroke");
  }
  // Cel shading: every shape gets a dark ink outline with round corners.
  ctx.strokeStyle = tokens.ink;
  ctx.lineWidth = tokens.inkWidth;
  ctx.lineJoin = "round";
  drawPlanet(ctx);
  for (const base of game.bases) {
    ctx.save();
    ctx.rotate(base.angle + Math.PI / 2);
    ctx.fillStyle = tokens.base;
    ctx.fillRect(-7, -tokens.planetRadius - 4, 14, 5);
    ctx.strokeRect(-7, -tokens.planetRadius - 4, 14, 5);
    const busy = base.status !== "ready";
    ctx.fillStyle = base.status === "empty" ? tokens.critical : busy ? tokens.warn : tokens.ok;
    inked(ctx, 0, -tokens.planetRadius - 7, 2.5);
    ctx.restore();
  }
  for (const piece of game.world?.debris ?? []) {
    ctx.globalAlpha = Math.min(1, (tokens.debrisFade - piece.age) / 2); // fade out over the last 2 s
    ctx.fillStyle = tokens.debris;
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.angle);
    ctx.beginPath();
    piece.points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const sat of game.satellites) drawSatellite(ctx, sat, now);
  drawParticles(ctx);
  ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.font = "800 13px ui-sans-serif, system-ui, sans-serif";
  for (const label of game.labels) {
    const y = label.y - label.age * 25;
    ctx.globalAlpha = 1 - label.age / 1.2;
    ctx.lineWidth = tokens.inkWidth * 2; // ink outline around the letters
    ctx.strokeText(label.text, label.x, y);
    ctx.fillStyle = tokens.sparkle;
    ctx.fillText(label.text, label.x, y);
  }
  ctx.globalAlpha = 1;
}

// Cel-shaded planet: three flat bands (light, base, shadow) with hard edges,
// a flat atmosphere ring and an ink outline. No gradients.
function drawPlanet(ctx: CanvasRenderingContext2D) {
  const r = tokens.planetRadius;
  ctx.fillStyle = tokens.atmosphere;
  circle(ctx, 0, 0, r * 1.15);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = tokens.planetShade; // shadow band, bottom right
  circle(ctx, 0, 0, r);
  ctx.fillStyle = tokens.planet; // base color, shifted up-left so a hard crescent of shadow shows
  circle(ctx, -r * 0.22, -r * 0.22, r);
  ctx.fillStyle = tokens.planetLight; // highlight band, top left
  circle(ctx, -r * 0.6, -r * 0.6, r * 0.55);
  ctx.restore();
  circle(ctx, 0, 0, r, "stroke");
}

function drawSatellite(ctx: CanvasRenderingContext2D, sat: Satellite, now: number) {
  const size = tokens.satelliteSize;
  const color = { launching: tokens.ok, ok: tokens.ok, warn: tokens.warn, critical: tokens.critical, falling: tokens.falling }[sat.status];
  let { x, y } = sat;
  if (sat.status === "critical") {
    x += Math.sin(now * 47 + sat.id) * tokens.wobble;
    y += Math.cos(now * 39 + sat.id) * tokens.wobble;
    // A flat, hard-edged halo instead of a soft glow.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    circle(ctx, x, y, size * 2.5 * tokens.glow);
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sat.status === "falling" ? now * 6 : sat.angle); // falling ones tumble
  ctx.fillStyle = tokens.satellite;
  ctx.lineWidth = tokens.inkWidth * 0.75;
  ctx.fillRect(-size * 1.6, -size * 0.3, size * 3.2, size * 0.6); // solar panels
  ctx.strokeRect(-size * 1.6, -size * 0.3, size * 3.2, size * 0.6);
  ctx.restore();
  const blinkOff = sat.status === "warn" && now % tokens.blinkTime > tokens.blinkTime / 2;
  ctx.fillStyle = blinkOff ? tokens.satellite : color;
  inked(ctx, x, y, size * 0.6);
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of game.particles?.pool ?? []) {
    if (p.life <= 0) continue;
    const t = p.life / p.maxLife; // 1 → 0 as it fades
    ctx.globalAlpha = p.kind === "puff" ? t * 0.5 : t; // puffs are see-through smoke
    ctx.fillStyle = p.color;
    if (p.kind === "confetti") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else {
      circle(ctx, p.x, p.y, p.kind === "puff" ? p.size * (2 - t) : p.size * t);
    }
  }
  ctx.globalAlpha = 1;
}

// A filled circle with an ink outline, in one path.
function inked(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  circle(ctx, x, y, r);
  ctx.stroke();
}

// Stars sit at fixed pseudo-random spots, so they don't jump between frames.
function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = tokens.stars;
  const size = Math.max(1, Math.min(width, height) / 400);
  for (let i = 1; i <= 90; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 12345.6789) % 1;
    ctx.fillRect(Math.abs(x) * width, Math.abs(y) * height, size, size);
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mode: "fill" | "stroke" = "fill") {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  ctx[mode]();
}
