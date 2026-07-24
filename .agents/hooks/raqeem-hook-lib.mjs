import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    shell: false,
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

export function requireGit(args, label, options = {}) {
  const result = runGit(args, options);
  if (!result.ok) {
    const detail = result.stderr || result.stdout || 'unknown git error';
    throw new Error(`${label}: ${detail}`);
  }
  return result.stdout;
}

export function getRepositoryContext(cwd = process.cwd()) {
  const root = requireGit(['rev-parse', '--show-toplevel'], 'REPOSITORY_ROOT_UNAVAILABLE', { cwd });
  const branch = requireGit(['branch', '--show-current'], 'BRANCH_UNAVAILABLE', { cwd: root });
  const head = requireGit(['rev-parse', 'HEAD'], 'HEAD_UNAVAILABLE', { cwd: root });
  const remote = runGit(['remote', 'get-url', 'origin'], { cwd: root });
  const status = runGit(['status', '--short'], { cwd: root });
  return {
    root,
    name: basename(root),
    branch,
    head,
    origin: remote.ok ? remote.stdout : 'UNAVAILABLE',
    statusLines: status.ok && status.stdout ? status.stdout.split(/\r?\n/) : [],
  };
}

export function getStagedFiles(cwd = process.cwd()) {
  const output = requireGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], 'STAGED_FILES_UNAVAILABLE', { cwd });
  return output ? output.split(/\r?\n/).filter(Boolean).map(normalizeRepoPath) : [];
}

export function getLocalConfigValues(key, cwd = process.cwd()) {
  const result = runGit(['config', '--local', '--get-all', key], { cwd });
  if (!result.ok || !result.stdout) return [];
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

export function getLocalConfigValue(key, fallback, cwd = process.cwd()) {
  const values = getLocalConfigValues(key, cwd);
  return values.length ? values.at(-1) : fallback;
}

export function normalizeRepoPath(value) {
  return value.trim().replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

export function pathMatchesScope(file, allowedEntry) {
  const normalizedFile = normalizeRepoPath(file);
  const normalizedAllowed = normalizeRepoPath(allowedEntry);
  if (!normalizedAllowed) return false;
  if (normalizedAllowed.endsWith('/')) return normalizedFile.startsWith(normalizedAllowed);
  return normalizedFile === normalizedAllowed;
}

export function readPackageName(root) {
  const path = resolve(root, 'package.json');
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return typeof parsed.name === 'string' ? parsed.name : null;
  } catch {
    return null;
  }
}

export function requiredRaqeemFiles(root) {
  return [
    'AGENTS.md',
    '.agents/skills/raqeem-context-audit/SKILL.md',
    '.agents/skills/raqeem-targeted-qa/SKILL.md',
    '.agents/skills/raqeem-git-closure/SKILL.md',
    '.agents/skills/raqeem-report-context-check/SKILL.md',
  ].map((relative) => ({ relative, exists: existsSync(resolve(root, ...relative.split('/'))) }));
}

export function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      result._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      result[rawKey] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      result[rawKey] = next;
      index += 1;
    } else {
      result[rawKey] = true;
    }
  }
  return result;
}

export function printVerdict(verdict, reason, fields = {}) {
  console.log(`VERDICT: ${verdict}`);
  if (reason) console.log(`REASON: ${reason}`);
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) console.log(`${key}: ${value.length ? value.join(', ') : 'NONE'}`);
    else console.log(`${key}: ${value}`);
  }
}
