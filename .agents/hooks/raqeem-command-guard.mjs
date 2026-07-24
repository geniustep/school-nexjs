#!/usr/bin/env node
import { printVerdict } from './raqeem-hook-lib.mjs';

const command = process.argv.slice(2).join(' ').trim();
const normalized = command.replace(/\s+/g, ' ').trim().toLowerCase();

const blockedRules = [
  ['UNSAFE_GIT_BULK_STAGE', /(^|[;&|]\s*)git\s+add\s+(?:-a|--all|\.)($|\s|[;&|])/i],
  ['UNSAFE_GIT_COMMIT_ALL', /(^|[;&|]\s*)git\s+commit\s+[^;&|]*(?:-a\b|--all\b)/i],
  ['DESTRUCTIVE_GIT_RESET', /(^|[;&|]\s*)git\s+reset\s+[^;&|]*--hard\b/i],
  ['DESTRUCTIVE_GIT_CHECKOUT', /(^|[;&|]\s*)git\s+checkout\s+\.($|\s|[;&|])/i],
  ['DESTRUCTIVE_GIT_RESTORE', /(^|[;&|]\s*)git\s+restore\s+[^;&|]*(?:--worktree\s+)?\.($|\s|[;&|])/i],
  ['DESTRUCTIVE_GIT_CLEAN', /(^|[;&|]\s*)git\s+clean\s+[^;&|]*-[a-z]*f[a-z]*\b/i],
  ['UNSAFE_GIT_STASH', /(^|[;&|]\s*)git\s+stash(?:\s|$)/i],
  ['FORCE_PUSH_FORBIDDEN', /(^|[;&|]\s*)git\s+push\s+[^;&|]*(?:--force(?:-with-lease)?\b|-f\b)/i],
  ['MERGE_NOT_IN_GIT_CLOSURE', /(^|[;&|]\s*)git\s+merge(?:\s|$)/i],
  ['REBASE_NOT_IN_GIT_CLOSURE', /(^|[;&|]\s*)git\s+rebase(?:\s|$)/i],
];

console.log('RAQEEM_HOOK: H02_BEFORE_COMMAND_EXECUTION');
if (!normalized) {
  printVerdict('BLOCK', 'COMMAND_MISSING');
  process.exit(3);
}

const matched = blockedRules.find(([, pattern]) => pattern.test(command));
if (matched) {
  printVerdict('HARD_BLOCK', matched[0], { COMMAND: command });
  process.exit(3);
}

printVerdict('PASS', 'COMMAND_NOT_IN_PERMANENT_DENYLIST', { COMMAND: command });
