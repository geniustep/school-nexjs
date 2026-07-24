#!/usr/bin/env node
import {
  getRepositoryContext,
  parseArgs,
  printVerdict,
  readPackageName,
  requiredRaqeemFiles,
} from './raqeem-hook-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const expectedRepo = String(args['expect-repo'] ?? 'school-nexjs');
const expectedBranch = args['expect-branch'] ? String(args['expect-branch']) : null;

try {
  const context = getRepositoryContext();
  const packageName = readPackageName(context.root);
  const requiredFiles = requiredRaqeemFiles(context.root);
  const missing = requiredFiles.filter((item) => !item.exists).map((item) => item.relative);
  const blockers = [];

  if (context.name !== expectedRepo && packageName !== expectedRepo) {
    blockers.push(`WRONG_REPOSITORY expected=${expectedRepo} actual=${context.name}`);
  }
  if (expectedBranch && context.branch !== expectedBranch) {
    blockers.push(`WRONG_BRANCH expected=${expectedBranch} actual=${context.branch}`);
  }
  if (!context.branch) blockers.push('DETACHED_OR_UNKNOWN_BRANCH');
  if (missing.length) blockers.push(`MISSING_RAQEEM_FILES ${missing.join(',')}`);

  console.log('RAQEEM_HOOK: H01_BEFORE_STAGE_START');
  printVerdict(blockers.length ? 'BLOCK' : 'PASS', blockers.join(' | ') || 'CONTEXT_IDENTIFIED', {
    REPOSITORY: context.name,
    PACKAGE: packageName ?? 'UNAVAILABLE',
    BRANCH: context.branch || 'UNAVAILABLE',
    HEAD: context.head,
    ORIGIN: context.origin,
    STATUS_ENTRIES: context.statusLines.length,
    REQUIRED_FILES: missing.length ? `MISSING ${missing.join(', ')}` : 'PRESENT',
  });
  process.exit(blockers.length ? 2 : 0);
} catch (error) {
  console.log('RAQEEM_HOOK: H01_BEFORE_STAGE_START');
  printVerdict('BLOCK', 'CONTEXT_UNVERIFIED', {
    DETAIL: error instanceof Error ? error.message : String(error),
  });
  process.exit(2);
}
