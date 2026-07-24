---
name: raqeem-git-closure
description: Safe, scoped Git closure for one completed Raqeem stage in one repository. Use only when staging, commit, push, or upstream verification is explicitly authorized. Never use it to modify feature code, fix tests, merge, rebase, release, upgrade, deploy, or touch production.
---

# Raqeem Git Closure

## Purpose

Close a completed stage through explicit, auditable Git actions without changing feature code or widening scope.

```txt
Verified scope
→ explicit staging
→ cached diff review
→ authorized commit
→ authorized push
→ evidence report
```

This skill applies the repository Git policy. It does not grant Git authority by itself.

## Preconditions

Require:

```txt
CONTEXT_READY | CONTEXT_READY_WITH_NOTES
one repository
one branch
implementation accepted
QA accepted when required
allowed_files explicitly listed
git_actions_allowed explicitly stated
parallel work classified
```

Allowed authorization values:

```txt
STAGE_ONLY
COMMIT_ALLOWED
PUSH_ALLOWED
```

Default when authorization is missing:

```txt
NO_GIT_CLOSURE
```

## Inputs

```txt
stage_name
repository
repository_path
target_branch
expected_head
allowed_files
git_actions_allowed
commit_message
push_target
implementation_verdict
qa_requirement
qa_verdict
parallel_work_state
```

## Allowed actions

Inside the named repository only:

- Read status, branch, HEAD, remotes, upstream, and diffs.
- Compare local HEAD with the approved remote ref.
- Stage exact approved paths only.
- Create one coherent commit when authorized.
- Perform a normal push to the approved branch when authorized.
- Verify the final upstream state.

## Forbidden actions

Never run:

```txt
git add .
git add -A
git commit -am
git reset --hard
git checkout .
git restore .
git clean -fd
git stash
git push --force
git push --force-with-lease
git merge
git rebase
```

Also forbidden:

- Editing files to make closure pass.
- Fixing tests or feature code.
- Staging a file outside `allowed_files`.
- Including parallel work.
- Changing branch or remote.
- Amending an existing commit without explicit authorization.
- Pushing to an unapproved target.
- Treating commit or push success as release or production approval.

## Procedure

### 1. Verify identity and authorization

Confirm:

```txt
repository
branch
HEAD
remote
upstream
git policy
allowed files
implementation verdict
QA requirement and verdict
authorized actions
```

The stage must target one repository only.

### 2. Inspect the tree

Run or inspect the equivalent of:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git diff --name-only
git diff --cached --name-only
```

Classify changed files:

```txt
IN_SCOPE
OUT_OF_SCOPE_PARALLEL
AMBIGUOUS
COLLIDING
```

Do not touch out-of-scope files. Stop on an unresolvable collision.

### 3. Freeze the closure set

Create the final `allowed_files` list and enforce:

```txt
staged_files ⊆ allowed_files
```

If ownership is unclear:

```txt
BLOCKED — FILE_OWNERSHIP_AMBIGUOUS
```

### 4. Stage explicit paths

Use only:

```bash
git add -- <explicit-path-1> <explicit-path-2>
```

Never stage a directory or wildcard unless every resulting path is explicitly verified and allowed.

### 5. Review cached diff

Require:

```bash
git diff --cached --name-only
git diff --cached --check
git diff --cached
```

Verify:

- Every staged path is allowed.
- No secret, generated artifact, audit output, or unrelated formatting was included.
- The staged diff matches the accepted implementation and QA evidence.
- Parallel work remains unstaged.

### 6. Commit when authorized

Commit only when `COMMIT_ALLOWED` or `PUSH_ALLOWED` is explicit.

Use one message describing the actual bounded change. Do not amend or rewrite history.

### 7. Push when authorized

Push only when `PUSH_ALLOWED` names the exact remote and branch.

Use a normal push. If non-fast-forward or upstream mismatch appears, stop; do not merge, rebase, or force push automatically.

### 8. Verify final state

Record:

```txt
HEAD before
HEAD after
commit SHA
push result
upstream relation
remaining unstaged parallel work
```

## Verdicts

```txt
GIT_CLOSURE_COMPLETED
GIT_CLOSURE_COMPLETED_WITH_UNPUSHED_COMMIT
STAGING_COMPLETED
NO_GIT_CLOSURE
BLOCKED — WRONG_REPOSITORY
BLOCKED — WRONG_BRANCH
BLOCKED — HEAD_MISMATCH
BLOCKED — GIT_ACTION_NOT_AUTHORIZED
BLOCKED — QA_NOT_ACCEPTED
BLOCKED — FILE_OUTSIDE_SCOPE
BLOCKED — FILE_OWNERSHIP_AMBIGUOUS
BLOCKED — PARALLEL_CHANGE_COLLISION
BLOCKED — STAGED_DIFF_MISMATCH
BLOCKED — SECRET_OR_UNSAFE_ARTIFACT_DETECTED
BLOCKED — UPSTREAM_MISMATCH
BLOCKED — NON_FAST_FORWARD
```

## Output contract

```txt
SKILL: raqeem-git-closure
GIT CLOSURE VERDICT:
STAGE:
REPOSITORY / BRANCH:
HEAD BEFORE / AFTER:
AUTHORIZED ACTIONS:
ALLOWED FILES:
STAGED FILES:
CACHED DIFF CHECK:
COMMIT SHA / MESSAGE:
PUSH TARGET / STATUS:
UPSTREAM STATUS:
PARALLEL WORK PRESERVED:
LIMITATIONS:
ALLOWED NEXT STAGE:
```

## Final rules

```txt
No verified scope → No Git closure
No accepted QA when required → No Git closure
Explicit paths only
Protect parallel work
No implicit push
Git closure does not authorize merge, release, upgrade, deployment, or production
```
