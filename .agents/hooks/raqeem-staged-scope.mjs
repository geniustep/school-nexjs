#!/usr/bin/env node
import {
  getLocalConfigValue,
  getLocalConfigValues,
  getRepositoryContext,
  getStagedFiles,
  pathMatchesScope,
  printVerdict,
  runGit,
} from './raqeem-hook-lib.mjs';

const SECRET_PATTERNS = [
  /(^|\/)\.env(?:\..+)?$/i,
  /(^|\/)(?:id_rsa|id_ed25519)$/i,
  /\.(?:pem|key|p12|pfx)$/i,
];
const ALLOWED_SECRET_EXAMPLES = [/(^|\/)\.env\.example$/i, /(^|\/)\.env\.sample$/i];
const ARTIFACT_PATTERNS = [
  /(^|\/)node_modules\//i,
  /(^|\/)\.next\//i,
  /(^|\/)coverage\//i,
  /(^|\/)(?:screenshots?|artifacts?)\//i,
];

try {
  const context = getRepositoryContext();
  const mode = getLocalConfigValue('raqeem.hookMode', 'warn', context.root).toLowerCase();
  const allowedFiles = getLocalConfigValues('raqeem.allowedFile', context.root);
  const stagedFiles = getStagedFiles(context.root);
  const blockers = [];
  const warnings = [];

  const secretFiles = stagedFiles.filter(
    (file) =>
      SECRET_PATTERNS.some((pattern) => pattern.test(file)) &&
      !ALLOWED_SECRET_EXAMPLES.some((pattern) => pattern.test(file)),
  );
  if (secretFiles.length) blockers.push(`SECRET_OR_KEY_FILE_STAGED ${secretFiles.join(',')}`);

  const artifactFiles = stagedFiles.filter((file) =>
    ARTIFACT_PATTERNS.some((pattern) => pattern.test(file)),
  );
  if (artifactFiles.length) blockers.push(`GENERATED_ARTIFACT_STAGED ${artifactFiles.join(',')}`);

  const diffCheck = runGit(['diff', '--cached', '--check'], { cwd: context.root });
  if (!diffCheck.ok) blockers.push(`CACHED_DIFF_CHECK_FAILED ${diffCheck.stdout || diffCheck.stderr}`);

  if (!allowedFiles.length) {
    if (mode === 'enforce') blockers.push('SCOPE_NOT_CONFIGURED');
    else warnings.push('SCOPE_NOT_CONFIGURED');
  } else {
    const outsideScope = stagedFiles.filter(
      (file) => !allowedFiles.some((allowed) => pathMatchesScope(file, allowed)),
    );
    if (outsideScope.length) {
      if (mode === 'enforce') blockers.push(`STAGED_OUTSIDE_SCOPE ${outsideScope.join(',')}`);
      else warnings.push(`STAGED_OUTSIDE_SCOPE ${outsideScope.join(',')}`);
    }
  }

  console.log('RAQEEM_HOOK: H06_BEFORE_GIT_STAGE / H07_BEFORE_COMMIT');
  printVerdict(
    blockers.length ? 'BLOCK' : warnings.length ? 'WARNING' : 'PASS',
    blockers.join(' | ') || warnings.join(' | ') || 'STAGED_SCOPE_VALID',
    {
      MODE: mode,
      BRANCH: context.branch,
      HEAD: context.head,
      STAGED_FILES: stagedFiles,
      ALLOWED_FILES: allowedFiles,
    },
  );
  process.exit(blockers.length ? 4 : 0);
} catch (error) {
  console.log('RAQEEM_HOOK: H07_BEFORE_COMMIT');
  printVerdict('BLOCK', 'STAGED_SCOPE_UNVERIFIED', {
    DETAIL: error instanceof Error ? error.message : String(error),
  });
  process.exit(4);
}
