#!/usr/bin/env node
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const tempRoot = mkdtempSync(resolve(tmpdir(), 'raqeem-hook-self-test-'));
let passed = 0;
let total = 0;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? tempRoot,
    encoding: 'utf8',
    shell: false,
  });
}

function expect(label, condition, detail = '') {
  total += 1;

  if (!condition) {
    console.error(`FAIL: ${label}`);
    if (detail) console.error(detail);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`PASS: ${label}`);
}

function git(args) {
  const result = run('git', args);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  }
  return result;
}

try {
  const guardBlock = run('node', [resolve(sourceDir, 'raqeem-command-guard.mjs'), 'git add .'], {
    cwd: process.cwd(),
  });
  expect(
    'command guard blocks bulk staging',
    guardBlock.status === 3 && guardBlock.stdout.includes('UNSAFE_GIT_BULK_STAGE'),
    guardBlock.stdout || guardBlock.stderr,
  );

  const guardAllow = run(
    'node',
    [resolve(sourceDir, 'raqeem-command-guard.mjs'), 'git add src/app/page.tsx'],
    { cwd: process.cwd() },
  );
  expect(
    'command guard allows explicit path staging',
    guardAllow.status === 0 && guardAllow.stdout.includes('VERDICT: PASS'),
    guardAllow.stdout || guardAllow.stderr,
  );

  mkdirSync(resolve(tempRoot, '.agents', 'hooks'), { recursive: true });
  mkdirSync(resolve(tempRoot, '.githooks'), { recursive: true });
  cpSync(sourceDir, resolve(tempRoot, '.agents', 'hooks'), { recursive: true });
  writeFileSync(resolve(tempRoot, '.githooks', 'pre-commit'), '#!/bin/sh\nnode .agents/hooks/raqeem-staged-scope.mjs\n');
  writeFileSync(resolve(tempRoot, 'package.json'), '{"name":"school-nexjs"}\n');
  writeFileSync(resolve(tempRoot, 'AGENTS.md'), '# AGENTS\n');

  for (const skill of [
    'raqeem-context-audit',
    'raqeem-targeted-qa',
    'raqeem-git-closure',
    'raqeem-report-context-check',
  ]) {
    const skillDir = resolve(tempRoot, '.agents', 'skills', skill);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(resolve(skillDir, 'SKILL.md'), `---\nname: ${skill}\n---\n`);
  }

  git(['init', '-q']);
  git(['config', 'user.email', 'raqeem-self-test@example.invalid']);
  git(['config', 'user.name', 'Raqeem Hook Self Test']);
  git(['add', 'package.json', 'AGENTS.md', '.agents', '.githooks']);
  git(['commit', '-qm', 'self-test fixture']);
  git(['branch', '-M', 'dev']);

  const preflight = run('node', [
    '.agents/hooks/raqeem-preflight.mjs',
    '--expect-repo',
    'school-nexjs',
    '--expect-branch',
    'dev',
  ]);
  expect(
    'preflight passes correct repository fixture',
    preflight.status === 0 && preflight.stdout.includes('VERDICT: PASS'),
    preflight.stdout || preflight.stderr,
  );

  const warnSetup = run('node', ['.agents/hooks/raqeem-hook-setup.mjs', '--mode', 'warn']);
  expect('warn mode setup succeeds', warnSetup.status === 0, warnSetup.stdout || warnSetup.stderr);

  writeFileSync(resolve(tempRoot, 'safe.txt'), 'safe\n');
  git(['add', 'safe.txt']);
  const warnCheck = run('node', ['.agents/hooks/raqeem-staged-scope.mjs']);
  expect(
    'warn mode reports missing scope without blocking',
    warnCheck.status === 0 && warnCheck.stdout.includes('SCOPE_NOT_CONFIGURED'),
    warnCheck.stdout || warnCheck.stderr,
  );

  const enforceSetup = run('node', [
    '.agents/hooks/raqeem-hook-setup.mjs',
    '--mode',
    'enforce',
    '--scope',
    'safe.txt',
  ]);
  expect('enforce mode with scope succeeds', enforceSetup.status === 0, enforceSetup.stdout || enforceSetup.stderr);

  const scopedCheck = run('node', ['.agents/hooks/raqeem-staged-scope.mjs']);
  expect(
    'enforce mode accepts staged file inside scope',
    scopedCheck.status === 0 && scopedCheck.stdout.includes('STAGED_SCOPE_VALID'),
    scopedCheck.stdout || scopedCheck.stderr,
  );

  writeFileSync(resolve(tempRoot, '.env'), 'secret=value\n');
  git(['add', '-f', '.env']);
  const secretCheck = run('node', ['.agents/hooks/raqeem-staged-scope.mjs']);
  expect(
    'staged secret filename is blocked',
    secretCheck.status === 4 && secretCheck.stdout.includes('SECRET_OR_KEY_FILE_STAGED'),
    secretCheck.stdout || secretCheck.stderr,
  );

  git(['reset', '-q', '.env']);
  rmSync(resolve(tempRoot, '.env'));
  writeFileSync(resolve(tempRoot, 'outside.txt'), 'outside\n');
  git(['add', 'outside.txt']);
  const outsideCheck = run('node', ['.agents/hooks/raqeem-staged-scope.mjs']);
  expect(
    'staged file outside configured scope is blocked',
    outsideCheck.status === 4 && outsideCheck.stdout.includes('STAGED_OUTSIDE_SCOPE'),
    outsideCheck.stdout || outsideCheck.stderr,
  );

  if (!process.exitCode) console.log(`SELF_TEST_VERDICT: PASS (${passed}/${total})`);
} catch (error) {
  console.error(`SELF_TEST_VERDICT: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
