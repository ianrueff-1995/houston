@AGENTS.md

# Houston: notes for Claude

Houston is a tiny Next.js game used in a design pilot. Designers leave comments
with the Vercel toolbar, and you turn each comment into a small change. The
people you work with here are designers, not engineers.

## Explain every change in plain words

- Say what changed on screen first, then where it lives, then how to see it
  ("Critical satellites now glow twice as wide. Pick Solar storm and wait about
  10 seconds for one to turn red.").
- No jargon without a short explanation. Name the file, but don't lead with it.
- If a comment is ambiguous, pick the most likely meaning, say what you assumed,
  and offer the other option.
- One comment, one small change, one commit with a clear message.

## Use tokens instead of hard-coded values

- Every color, size and timing is a CSS variable in `app/globals.css`
  (`--planet`, `--status-critical`, `--glow-strength`, `--debris-count-min`…).
  The canvas reads them too, through `game/tokens.ts`.
- Prefer changing a token over changing code. Many comments are a one-line change.
- Never hard-code a color, size or timing in a component or game file. Need a new
  value? Add a token to `globals.css`. If the canvas or game logic needs it, also
  add one line to `game/tokens.ts`. Tailwind classes can use tokens via the
  `@theme` block (`bg-ok`, `text-muted`, `border-line`).
- Token sizes are px on a 600px-wide sky (the canvas scales them). Times are
  seconds, written like `6s`.

## Where things live (one job per file)

| File | Job |
| --- | --- |
| `app/globals.css` | Design tokens |
| `app/page.tsx` | Page layout, counters, loading / empty / error states, keyboard |
| `app/layout.tsx` | HTML shell, fonts, Vercel toolbar in development |
| `components/GameCanvas.tsx` | Everything drawn in the sky, and clicks on satellites |
| `components/ScenarioPanel.tsx` | Scenario, speed and "Show orbits" controls |
| `components/BaseCard.tsx` | A launch base card, and its phone version in the bottom bar |
| `components/SatelliteList.tsx` | The satellite list with Check buttons |
| `game/store.ts` | Game state, the game loop, every action (launch, check, reset…) |
| `game/satellite.ts` | Satellite moods, names, movement along the orbit |
| `game/bases.ts` | Base states, fuel, where the bases sit |
| `game/particles.ts` | Puffs, sparkles, confetti, exhaust |
| `game/scenarios.ts` | Calm / Busy Tuesday / Solar storm / Empty sky, speeds |
| `game/tokens.ts` | Reads the tokens for the canvas and game |
| `game/world.ts` | Physics: falling satellites, impacts, debris |

Keep one job per file so several changes can run in parallel without touching
the same file. The app is about 1,000 lines; keep it small and readable. Don't
add dependencies without asking.

## Leave `game/world.ts` alone unless asked

It's the hand-written physics, and it breaks in ways that only show up after a
few minutes of play. Tune the feel with tokens instead (`--fall-keep-speed`,
`--fall-drag`, `--debris-bounce`, `--orbit-speed`). Only edit it when a comment
asks for a physics change (like craters), and say that you did.

## Vercel

- The Vercel CLI is a dev dependency: run it as `npx vercel …` (no global install).
- The Vercel MCP server is set up in `.mcp.json`. It works once the designer has
  signed in with `/mcp`. Use it to find preview links, deployments and build logs.
- Never deploy to production or change project settings unless asked.

## Check your work before sharing

- `npm run dev`, then open http://localhost:3000.
- Preview the special screens with `?demo=loading` and `?demo=error`. The
  "Empty sky" scenario shows the empty state; "Solar storm" makes things happen fast.
- In development the live game state is on `window.houston` in the browser console.
- Run `npm run lint` and fix what it reports. For bigger changes, also run `npm run build`.
- Keep it smooth: 60 fps with 30 satellites and 300 particles. React must never
  re-render on every frame; the canvas reads `game` from the store directly.
