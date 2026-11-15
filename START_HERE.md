# Start here

Welcome to the Houston design pilot!

Houston is a tiny game. Satellites orbit a small planet and get needy: green
means fine, amber blinking means "please check me", red means it's about to fall.
Click one (or its Check button) to fix it. Let one go and it crashes into the
planet in a little shower of debris.

You'll leave comments on the game with the Vercel toolbar, and Claude Code turns
each comment into a change.

## How it works

1. Open the game and play for a minute.
2. In the Vercel toolbar, click **Comment**, click the thing you want changed,
   and describe what you want in your own words ("this red should feel scarier").
3. Claude Code makes a small change, explains it in plain words, and shares it
   for you to look at.
4. Not quite right? Reply in the same comment thread.

Tips:

- One idea per comment works best.
- Comment right on the thing: the planet, a button, the list.
- Describing a feeling is fine. You don't need to know the fix.
- To see the special screens, add `?demo=loading` or `?demo=error` to the
  address. "Empty sky" shows the empty state. "Solar storm" makes everything
  happen twice as fast.

## Starter tasks

Try them in any order. They go from tiny to ambitious.

| # | Task | What to expect |
| --- | --- | --- |
| 1 | Make the planet pinker. | A color token, one line. |
| 2 | Rename "Launch" to "Yeet". | Button text. |
| 3 | Critical satellites should glow way more dramatically. | A token, maybe a little drawing code. |
| 4 | Make the empty state funny. | One sentence of copy. |
| 5 | The base buttons are too small on a phone. | The phone bottom bar. |
| 6 | Confetti for a last-second save. | A small game rule plus a burst of particles. |
| 7 | Add a fourth launch base. | Game data plus layout. |
| 8 | A new "Bored" status: a satellite drifts off into deep space unless you pet it. | A new mood, new drawing, new list label. The biggest one. |
| 9 | Debris leaves a little crater. | Touches the physics, which is normally off limits. |
