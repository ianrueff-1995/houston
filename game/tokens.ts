// Reads the design tokens (CSS variables in app/globals.css) so the canvas and
// the game logic use exactly the same values as the UI.
// Times come back in seconds, sizes in px. To add a token: add it to
// globals.css, then add a line to one of the two lists below.

const COLORS = {
  space: "--space",
  stars: "--stars",
  orbitLine: "--orbit-line",
  planet: "--planet",
  planetShade: "--planet-shade",
  planetLight: "--planet-light",
  ink: "--ink",
  atmosphere: "--atmosphere",
  satellite: "--satellite-body",
  ok: "--status-ok",
  warn: "--status-warn",
  critical: "--status-critical",
  falling: "--status-falling",
  debris: "--debris",
  base: "--base",
  puff: "--puff",
  sparkle: "--sparkle",
  exhaust: "--exhaust",
  confetti: "--confetti", // a list of colors separated by spaces
} as const;

const NUMBERS = {
  planetRadius: "--planet-radius",
  satelliteSize: "--satellite-size",
  inkWidth: "--ink-width",
  glow: "--glow-strength",
  wobble: "--wobble",
  blinkTime: "--blink-time",
  orbitLow: "--orbit-low",
  orbitHigh: "--orbit-high",
  orbitSpeed: "--orbit-speed",
  hitRadius: "--hit-radius",
  okMin: "--ok-min",
  okMax: "--ok-max",
  warnTime: "--warn-time",
  criticalTime: "--critical-time",
  fallKeepSpeed: "--fall-keep-speed",
  fallDrag: "--fall-drag",
  debrisSize: "--debris-size",
  debrisMin: "--debris-count-min",
  debrisMax: "--debris-count-max",
  debrisBounce: "--debris-bounce",
  debrisFade: "--debris-fade",
  launchTime: "--launch-time",
  cooldownTime: "--cooldown-time",
  refuelTime: "--refuel-time",
  launchesPerTank: "--launches-per-tank",
  particleMax: "--particle-max",
} as const;

export type Tokens = { [K in keyof typeof COLORS]: string } & {
  [K in keyof typeof NUMBERS]: number;
};

/** Current token values. Filled by readTokens(); the game reads from here. */
export const tokens = {} as Tokens;

const warned = new Set<string>();

/** Reads every token from the page. The game calls this twice a second, so edits to globals.css show up live. */
export function readTokens() {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string) => {
    const value = css.getPropertyValue(name).trim();
    if (!value && !warned.has(name)) {
      warned.add(name);
      console.warn(`Houston: design token ${name} is missing from app/globals.css`);
    }
    return value;
  };
  const out = tokens as Record<string, string | number>;
  for (const [key, name] of Object.entries(COLORS)) out[key] = read(name);
  for (const [key, name] of Object.entries(NUMBERS)) {
    const value = read(name);
    out[key] = (parseFloat(value) || 0) / (value.endsWith("ms") ? 1000 : 1);
  }
}
