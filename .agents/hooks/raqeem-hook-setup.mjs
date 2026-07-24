#!/usr/bin/env node
import { chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepositoryContext, parseArgs, printVerdict, runGit } from './raqeem-hook-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const requestedMode = args.mode ? String(args.mode).toLowerCase() : null;
const allowedModes = new Set(['warn', 'enforce', 'off']);

function gitConfig(root, configArgs) {
  const result = runGit(['config', '--local', ...configArgs], { cwd: root });
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || `git config ${configArgs.join(' ')} failed`);
  }
}

try {
  const context = getRepositoryContext();
  if (requestedMode && !allowedModes.has(requestedMode)) {
    throw new Error(`INVALID_MODE ${requestedMode}`);
  }

  if (requestedMode === 'off') {
    const unset = runGit(['config', '--local', '--unset-all', 'core.hooksPath'], { cwd: context.root });
    if (!unset.ok && unset.status !== 5) throw new Error(unset.stderr || 'UNSET_HOOKS_PATH_FAILED');
    gitConfig(context.root, ['raqeem.hookMode', 'off']);
  } else {
    gitConfig(context.root, ['core.hooksPath', '.githooks']);
    gitConfig(context.root, ['raqeem.hookMode', requestedMode || 'warn']);
    const hookPath = resolve(context.root, '.githooks', 'pre-commit');
    if (existsSync(hookPath) && process.platform !== 'win32') chmodSync(hookPath, 0o755);
  }

  if (args['clear-scope']) {
    const clear = runGit(['config', '--local', '--unset-all', 'raqeem.allowedFile'], {
      cwd: context.root,
    });
    if (!clear.ok && clear.status !== 5) throw new Error(clear.stderr || 'CLEAR_SCOPE_FAILED');
  }

  const scopeValues = [];
  if (args.scope) {
    scopeValues.push(
      ...String(args.scope)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }
  if (args._.length) scopeValues.push(...args._);

  if (scopeValues.length) {
    runGit(['config', '--local', '--unset-all', 'raqeem.allowedFile'], { cwd: context.root });
    for (const file of scopeValues) {
      gitConfig(context.root, ['--add', 'raqeem.allowedFile', file]);
    }
  }

  const modeResult = runGit(['config', '--local', '--get', 'raqeem.hookMode'], {
    cwd: context.root,
  });
  const scopeResult = runGit(['config', '--local', '--get-all', 'raqeem.allowedFile'], {
    cwd: context.root,
  });
  const hooksResult = runGit(['config', '--local', '--get', 'core.hooksPath'], {
    cwd: context.root,
  });

  printVerdict('PASS', 'LOCAL_HOOK_CONFIGURATION_UPDATED', {
    HOOKS_PATH: hooksResult.stdout || 'UNSET',
    MODE: modeResult.stdout || 'UNSET',
    SCOPE: scopeResult.stdout ? scopeResult.stdout.split(/\r?\n/) : [],
  });
} catch (error) {
  printVerdict('BLOCK', 'LOCAL_HOOK_CONFIGURATION_FAILED', {
    DETAIL: error instanceof Error ? error.message : String(error),
  });
  process.exit(5);
}
