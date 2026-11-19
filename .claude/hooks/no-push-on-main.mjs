// Stops Claude from running `git push` while the current branch is `main`.
// In a designer's fork, pushing `main` deploys to production on Vercel.
// Wired up as a PreToolUse hook in .claude/settings.json (Bash and PowerShell).
//
// It decides in three steps and lets the command through at the first "no":
//   1. Is the command a git push (in any wording)?
//   2. Is the current branch `main`?
//   3. Is `origin` something other than the upstream repo (so, a fork)?
// The upstream repo itself is exempt: its owner publishes `main` from there.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const UPSTREAM = /github\.com[:/]+mystico53\/houston(\.git)?\/?$/i;
const PROTECTED_BRANCH = 'main';

// `git push`, also with options before it (`git -C . push`, `git -c a=b push`),
// a path or .exe (`/usr/bin/git`, `git.exe`), or wrapped (`sh -c "git push"`).
const GIT_PUSH = /\bgit(\.exe)?["']?(\s+(-[cC]\s+\S+|-[\w-]+(=\S+)?))*\s+push\b/i;

function git(cwd, ...args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const command = String(input.tool_input?.command ?? '');
if (!GIT_PUSH.test(command)) process.exit(0);

const cwd = input.cwd || process.cwd();
if (git(cwd, 'branch', '--show-current') !== PROTECTED_BRANCH) process.exit(0);
if (UPSTREAM.test(git(cwd, 'remote', 'get-url', 'origin'))) process.exit(0);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason:
      'Blocked: you are on `main`, and pushing `main` deploys to production. ' +
      'Switch to a branch first with `git switch -c <name>` (your commits come along), ' +
      'then push that branch: `git push -u origin <name>`.',
  },
}));
