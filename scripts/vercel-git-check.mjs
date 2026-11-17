// Setup check for .qurio/seed.json ("Deploy from your copy"). Read only.
// Passes (exit 0) when this folder's Vercel project deploys from the GitHub
// repository in `origin` (the designer's fork). The seed runs its checks through
// cmd.exe on Windows and /bin/sh elsewhere, so this lives in a file instead of
// a shell one-liner.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const run = (command) => execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

try {
  const { projectId, orgId } = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
  const origin = run('git remote get-url origin').trim();
  const [, owner = '', repo = ''] = origin.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i) || [];
  // --scope with the linked team, so the person's default team doesn't matter.
  const project = JSON.parse(run(`npx vercel api /v9/projects/${projectId} --scope ${orgId} --raw`));
  const link = project.link || {};
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  if (link.type === 'github' && same(link.org, owner) && same(link.repo, repo)) {
    console.log(`Vercel deploys from ${link.org}/${link.repo}`);
    process.exit(0);
  }
  const now = link.repo ? `${link.org}/${link.repo}` : 'no repository';
  console.log(`Vercel project ${project.name} is connected to ${now}, not ${owner}/${repo}.`);
  process.exit(1);
} catch (error) {
  console.log(`Could not check the Vercel project yet: ${String(error.message || error).split('\n')[0]}`);
  process.exit(1);
}
