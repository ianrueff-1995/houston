// The physics world, built on Planck.js (a port of Box2D).
// Healthy satellites ride on rails: kinematic bodies the code moves along their
// orbit. A falling satellite turns dynamic, keeps part of its speed and gets
// pulled into the planet. On impact it breaks into debris that bounces, settles
// on the surface and fades.
// Designers: leave this file alone unless asked. Tune the feel with the tokens.
import { Circle, Polygon, World, type Body } from "planck";
import { tokens } from "./tokens";
import type { Satellite } from "./satellite";

const SCALE = 10; // world units per physics meter (Box2D likes objects of 0.1–10 m)
const PLANET = 1, SATELLITE = 2, DEBRIS = 4; // collision groups

/** The planet's pull, chosen so an orbit 200 units out takes 14 s at --orbit-speed: 1. */
const gm = () => ((2 * Math.PI * tokens.orbitSpeed) / 14) ** 2 * 200 ** 3;

/** Angular speed (radians/s) of a circular orbit with radius r. */
export const orbitSpeed = (r: number) => Math.sqrt(gm() / r ** 3);

export type Debris = { x: number; y: number; angle: number; age: number; points: { x: number; y: number }[] };
export type Impact = { sat: Satellite; x: number; y: number };

export function createWorld() {
  const world = new World({ gravity: { x: 0, y: 0 } });
  const planet = world.createBody({ type: "static" });
  let planetRadius = 0;
  const satellites = new Map<Satellite, Body>();
  const debris: (Debris & { body: Body })[] = [];
  let impacts: Impact[] = [];

  // A falling satellite touched the planet: note it now, handle it after the step.
  world.on("begin-contact", (contact) => {
    const a = contact.getFixtureA().getBody();
    const b = contact.getFixtureB().getBody();
    const body = a === planet ? b : b === planet ? a : null;
    const sat = body?.getUserData() as Satellite | undefined;
    if (body && sat) impacts.push({ sat, x: body.getPosition().x * SCALE, y: body.getPosition().y * SCALE });
  });

  // Rebuild the planet's shape whenever --planet-radius changes.
  function syncPlanet() {
    if (planetRadius === tokens.planetRadius) return;
    planetRadius = tokens.planetRadius;
    const old = planet.getFixtureList();
    if (old) planet.destroyFixture(old);
    planet.createFixture({ shape: new Circle(planetRadius / SCALE), friction: 0.8, filterCategoryBits: PLANET });
  }

  return {
    debris: debris as Debris[],

    /** Gives a satellite a body. It stays kinematic (on rails) until it falls. */
    addSatellite(sat: Satellite) {
      const body = world.createBody({ type: "kinematic", position: { x: sat.x / SCALE, y: sat.y / SCALE }, userData: sat });
      body.createFixture({
        shape: new Circle(tokens.satelliteSize / SCALE),
        density: 1,
        filterCategoryBits: SATELLITE,
        filterMaskBits: PLANET,
      });
      satellites.set(sat, body);
    },

    removeSatellite(sat: Satellite) {
      const body = satellites.get(sat);
      if (body) world.destroyBody(body);
      satellites.delete(sat);
    },

    /** The satellite starts falling: it turns dynamic and keeps part of its orbit speed. */
    drop(sat: Satellite) {
      const body = satellites.get(sat);
      if (!body) return;
      const speed = (orbitSpeed(sat.orbit) * sat.orbit * tokens.fallKeepSpeed) / SCALE;
      body.setType("dynamic");
      body.setLinearDamping(tokens.fallDrag);
      body.setLinearVelocity({ x: -Math.sin(sat.angle) * speed, y: Math.cos(sat.angle) * speed });
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
        const body = world.createBody({ type: "dynamic", position: { x: (x + nx * 4) / SCALE, y: (y + ny * 4) / SCALE } });
        body.createFixture({
          shape: new Polygon(points.map((p) => ({ x: p.x / SCALE, y: p.y / SCALE }))),
          density: 1,
          friction: 0.8,
          restitution: tokens.debrisBounce,
          filterCategoryBits: DEBRIS,
          filterMaskBits: PLANET | DEBRIS,
        });
        const up = 40 + Math.random() * 90, side = (Math.random() - 0.5) * 160;
        body.setLinearVelocity({ x: (nx * up - ny * side) / SCALE, y: (ny * up + nx * side) / SCALE });
        body.setAngularVelocity((Math.random() - 0.5) * 20);
        debris.push({ body, points, x, y, angle: 0, age: 0 });
      }
    },

    /** Advances the physics by dt seconds. Returns the satellites that hit the planet. */
    step(dt: number): Impact[] {
      syncPlanet();
      for (const [sat, body] of satellites) {
        if (body.isKinematic()) body.setPosition({ x: sat.x / SCALE, y: sat.y / SCALE }); // on rails
      }
      // Gravity: every loose body gets pulled toward the planet's center.
      for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!b.isDynamic() || !b.isAwake()) continue;
        const p = b.getPosition();
        const d = Math.hypot(p.x, p.y);
        const pull = (gm() / (d * SCALE) ** 2 / SCALE) * b.getMass();
        b.applyForceToCenter({ x: (-p.x / d) * pull, y: (-p.y / d) * pull }, false);
      }
      world.step(dt);

      for (const [sat, body] of satellites) {
        if (body.isDynamic()) [sat.x, sat.y] = [body.getPosition().x * SCALE, body.getPosition().y * SCALE];
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const piece = debris[i];
        piece.age += dt;
        piece.x = piece.body.getPosition().x * SCALE;
        piece.y = piece.body.getPosition().y * SCALE;
        piece.angle = piece.body.getAngle();
        if (piece.age > tokens.debrisFade) {
          world.destroyBody(piece.body);
          debris.splice(i, 1);
        }
      }
      const hits = impacts;
      impacts = [];
      return hits;
    },
  };
}

export type PhysicsWorld = ReturnType<typeof createWorld>;
