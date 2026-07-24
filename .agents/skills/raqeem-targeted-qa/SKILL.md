---
name: raqeem-targeted-qa
description: Evidence-based targeted QA for Raqeem changes. Use after a bounded implementation to verify changed behavior and critical boundaries with the smallest sufficient test matrix. Do not use it to repair code, widen scope, close Git, release, upgrade, or deploy.
---

# Raqeem Targeted QA

## Purpose

Verify that the behavior changed by the current stage works as intended and that its critical boundaries remain protected.

```txt
Changed behavior
+ critical boundaries
+ smallest sufficient evidence
```

This skill applies Raqeem QA governance. It does not create new policy.

## Preconditions

Require:

```txt
CONTEXT_READY | CONTEXT_READY_WITH_NOTES
implementation completed
repository / branch / HEAD known
scope and changed files known
expected behavior or contract known
test environment known
mutation policy known
parallel work classified
```

If a safety-critical input is unclear, return to `raqeem-context-audit`.

## Inputs

Collect or discover:

```txt
stage_name
repository
branch
head
functional_domain
changed_files
changed_behavior
expected_contract
implementation_report
git_diff
existing_test_commands
test_environment
tenant_or_database
mutation_policy
known_limitations
```

## Default mode

```txt
TARGETED TESTS ONLY
```

Run a full suite only for a documented reason such as a wide shared-core change, central authentication or RBAC change, broad migration, dependency upgrade, explicit release gate, or direct owner instruction.

## Procedure

### 1. Reconfirm context

Verify repository, branch, HEAD, scope, changed files, environment or tenant, mutation policy, parallel work, and expected contract.

### 2. Understand the change

Read the implementation report and diff. Identify:

```txt
what changed
owning layer
expected behavior
risk level
critical boundaries
```

Treat RBAC, tenant isolation, finance, workflow transitions, migrations, authentication, and multi-client contracts as high-risk or critical when applicable.

### 3. Select the smallest sufficient matrix

```txt
business rule → Odoo model/service test
API contract → controller/API test
BFF transport → Next.js route/helper test
UI behavior → component/page test
mobile state → Flutter unit/widget test
critical integrated journey → targeted authenticated smoke
```

Cover when applicable:

- Happy path.
- Most important failure path.
- Permission, school, tenant, role, or ownership boundary.
- Closest direct regression.

Do not treat a hidden button as proof of backend authorization.

### 4. Reuse project test infrastructure

Inspect existing test scripts, test modules, fixtures, helpers, CI configuration, `package.json`, Odoo test tags, and `pubspec.yaml` before inventing a new command.

### 5. Control test data

Prefer read-only verification. Any mutation must be explicitly allowed, minimal, fictional, confined to the named test environment, and have cleanup or rollback.

Never mutate an unauthorized live tenant.

### 6. Execute and record evidence

For each test or check, record:

```txt
command_or_action
behavior_tested
expected_result
actual_result
risk_covered
```

### 7. Classify failures

```txt
CURRENT_CHANGE_REGRESSION
PRE_EXISTING_BASELINE_DEBT
FLAKY_TEST
ENVIRONMENT_FAILURE
CONTRACT_VERSION_MISMATCH
UNKNOWN
```

Do not label a failure as baseline debt without comparison evidence.

### 8. Issue one verdict

Use the narrowest verdict supported by evidence.

## Allowed actions

- Read relevant files, diff, reports, contracts, and sanitized logs.
- Run targeted unit, model, API, BFF, component, widget, type, lint, format, or bounded build checks.
- Run one targeted browser or device smoke only when environment, identity, role, tenant, credentials, and mutation policy are authorized.
- Compare with a known baseline when needed.

## Forbidden actions

Do not:

- Modify or repair feature code.
- Change backend contracts.
- Create migrations.
- Fix unrelated baseline debt.
- Change credentials or create QA accounts.
- Use raw SQL or generic ORM access.
- Use an alternate tenant without approval.
- Perform Git closure, release, module upgrade, restart, or deployment.

Forbidden Git operations include:

```txt
git add .
git add -A
git commit
git push
git merge
git reset --hard
git checkout .
git restore .
git clean -fd
git stash
```

When a defect needs code changes, stop and hand it back to an independent implementation stage.

## Verdicts

```txt
QA_PASSED
QA_PASSED_WITH_NOTES
QA_PASSED_WITH_AUTHENTICATED_SMOKE_LIMITATION
QA_PASSED_WITH_PLATFORM_LIMITATION
QA_FAILED — CURRENT_CHANGE_REGRESSION
QA_FAILED — CONTRACT_MISMATCH
QA_FAILED — SECURITY_BOUNDARY
QA_FAILED — DATA_INTEGRITY
QA_FAILED — MIGRATION
BLOCKED — WRONG_CONTEXT
BLOCKED — TEST_ENVIRONMENT_UNAVAILABLE
BLOCKED — CREDENTIALS_UNAVAILABLE
BLOCKED — MUTATION_NOT_APPROVED
BLOCKED — UNSAFE_GIT_CONTEXT
BLOCKED — BASELINE_UNCLEAR
BLOCKED — UNAUTHORIZED_TENANT
```

A limitation must remain visible in the verdict and handoff.

## Output contract

```txt
SKILL: raqeem-targeted-qa
QA VERDICT:
STAGE / REPOSITORY / BRANCH / HEAD:
SCOPE AND CHANGED BEHAVIOR:
RISK LEVEL:
TEST MATRIX:
TESTS EXECUTED:
RESULTS:
FAILURE CLASSIFICATION:
SECURITY / SCOPE / TENANT CHECKS:
TEST DATA AND MUTATIONS:
LIMITATIONS:
REQUIRED FOLLOW-UP:
ALLOWED NEXT STAGE:
```

## Final rules

```txt
No evidence → No QA pass
QA verifies; QA does not repair
Test the change and its critical boundaries
QA success does not authorize commit, push, release, upgrade, or production
```
