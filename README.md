# Houston

> Houston, we have a problem.

A tiny, playful Next.js game, and the test repo for a design pilot: designers
leave Vercel toolbar comments on it, and Claude Code fixes them.

- Designers: read [START_HERE.md](START_HERE.md).
- Claude Code: reads [CLAUDE.md](CLAUDE.md).

## Play

```bash
npm install
npm run dev   # http://localhost:3000
```

Launch satellites from the three bases. Each one goes OK → Needs check →
Critical → Falling. Click it (or its Check button) to fix it. Keys: 1–3 launch,
Space checks the most urgent satellite, R resets.

`npm run lint` and `npm run build` should always pass.

## How it's built

- Next.js 16 (App Router, TypeScript) and Tailwind 4. No backend.
- `game/store.ts` is a plain TS store outside React: one requestAnimationFrame
  loop with a fixed 60 Hz step. The UI reads a snapshot about 5× a second with
  `useSyncExternalStore`, so React never re-renders per frame.
- `components/GameCanvas.tsx` draws everything with Canvas 2D, sharp on high-DPI screens.
- Every color, size and timing is a CSS variable in `app/globals.css`; the
  canvas reads them through `game/tokens.ts`, live.
- Physics is hand-written (`game/world.ts`). A Planck.js version came first
  as a spike; it's in the git history with the reasons it was replaced.

## Pilot setup

- The Vercel toolbar is mounted in development (`app/layout.tsx`,
  `next.config.ts`). It appears on localhost once the folder is linked to a
  Vercel project with `vercel link`.
- `.claude/settings.json` pre-approves the safe commands (dev, lint, build,
  git status/diff/add/commit, gh pr create).
- `.worktreeinclude` copies `.env.local` and `.vercel` into Claude Code worktrees.
- The Vercel CLI is a dev dependency, so `npx vercel …` works without a global install.
- `.mcp.json` adds the Vercel MCP server (`https://mcp.vercel.com`), and
  `.claude/settings.json` approves it. Claude Code only honors that approval once
  you've trusted the folder (the first time you run `claude` there). Then sign in with `/mcp`.
- `.qurio/seed.json` is the Qurio seed that sets all of this up on a new machine:
  each designer gets their own GitHub fork (`origin`; this repo is `upstream`) and
  their own `houston` Vercel project in a team they pick, deploying from that fork.
  `scripts/vercel-git-check.mjs` is its read-only check for that last part.
