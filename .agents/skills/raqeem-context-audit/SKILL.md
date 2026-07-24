---
name: raqeem-context-audit
description: Read-only, fail-closed preflight audit for Raqeem development work. Use before implementation, QA, Git closure, release, module upgrade, production verification, or when repository, branch, scope, agent, contract, environment, database, tenant, permissions, or parallel work may be unclear.
---

# Raqeem Context Audit

## Purpose

Verify that the requested work is about to start in the correct Raqeem context before any broad reading, file modification, test mutation, Git write, release, upgrade, or production action.

Core rule:

```txt
No verified context
→ No execution
```

This skill is a thin operational wrapper. It applies Raqeem governance; it does not replace or duplicate the governing references.

## Governing order

Apply the latest applicable source in this order:

```txt
1. Latest explicit owner instruction
2. RAQEEM-SCHOOL-ENVIRONMENTS-AND-RELEASE-REGISTRY-V1.md
3. RAQEEM-SCHOOL-PROMPT-EXECUTION-GOVERNANCE-V3.md
4. RAQEEM-SCHOOL-PROJECT-VISION-AND-ARCHITECTURE-V4.md
5. RAQEEM-AGENT-FOUNDATION-REFERENCE-V1.md
6. Repository AGENTS.md
7. Relevant domain reference
8. Actual verified code, Git, contract, or environment state
9. Trusted report from the same track
10. Historical material
```

Do not invent policy when sources differ. Classify the conflict and stop when it affects safety, scope, ownership, production, data, Git, or security.

## When to use

Use before:

```txt
READ-ONLY AUDIT
IMPLEMENTATION
TARGETED QA
GIT CLOSURE
MODULE UPGRADE
RELEASE
PRODUCTION VERIFICATION
SERVER OPERATION
DATABASE OR TENANT OPERATION
```

Repeat the audit when any of these changes:

- Stage.
- Agent.
- Repository.
- Branch or HEAD.
- Scope or owned files.
- Contract.
- Environment, database, service, or tenant.
- Git policy.
- Production approval.
- Parallel-work state.

## Operating mode

```txt
READ_ONLY
```

Allowed:

- Read governing references and `AGENTS.md`.
- Read repository identity, branch, HEAD, remotes, status, and diff.
- Search code and tests narrowly.
- Read contracts, manifests, and configuration needed to identify the target.
- Read environment and release registry information.
- Read and classify an incoming report.

Forbidden:

- Modify files, data, configuration, credentials, or services.
- Create test records.
- Run mutating tests without a separate authorized stage.
- `git add`, `commit`, `push`, `merge`, `rebase`, `reset`, `restore`, `clean`, or `stash`.
- Upgrade, restart, deploy, release, or production mutation.
- Grant production approval.

## Required inputs

Collect or resolve only what the stage needs:

```txt
user_request
stage_name
stage_type
target_agent
target_repository
target_branch
functional_domain
requested_scope
environment_or_tenant
database_or_service
git_policy
production_approval
previous_trusted_report
```

Values stated in a request are claims until verified when verification is possible.

## Procedure

### 1. Extract the requested outcome

Separate:

```txt
business_or_product_goal
current_stage
requested_actions
requested_git_actions
requested_release_actions
```

Do not treat the broad goal as permission to execute every downstream stage.

### 2. Classify one stage

Choose one primary stage type:

```txt
READ_ONLY_AUDIT
IMPLEMENTATION
TARGETED_QA
GIT_CLOSURE
MODULE_UPGRADE
RELEASE
PRODUCTION_VERIFICATION
SERVER_OPERATION
```

If the request combines several write stages, split them into explicit handoffs unless the governing workflow already authorizes a bounded combined operation.

### 3. Verify agent and repository

Official implementation ownership:

```txt
RAQEEM_ODOO_AGENT
→ smart-school-connect

RAQEEM_NEXTJS_AGENT
→ school-nexjs

RAQEEM_FLUTTER_AGENT
→ school-flutter
```

Supporting agents may read across repositories when necessary, but one implementation stage has one write agent and one repository.

Verify:

- Repository path and `.git` identity.
- Remote.
- Branch and HEAD.
- `AGENTS.md` scope.
- No unapproved clone or worktree context.

### 4. Inspect Git and parallel work

Read, when Git is available:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
```

Classify changed paths:

```txt
IN_SCOPE
OUT_OF_SCOPE_PARALLEL
AMBIGUOUS
COLLIDING
```

Rules:

- Preserve `OUT_OF_SCOPE_PARALLEL` untouched.
- Never absorb `AMBIGUOUS` into scope or Git closure.
- Stop on `COLLIDING` when safe isolation is not proven.
- A dirty tree is not permission to clean it.

### 5. Verify architectural ownership

Use these defaults:

```txt
Business truth, permissions, finance, workflow, tenant isolation
→ Odoo

Administrative UI and BFF
→ Next.js

Role-based daily client journeys
→ Flutter

Infrastructure, service, deployment, upgrade
→ Server or Release stage
```

Stop or hand off if the requested layer does not own the decision.

### 6. Verify the contract

For backend-client work, resolve only what is relevant:

```txt
endpoint
method
authentication
active role
request
response
errors
permissions
scope
allowed actions
compatibility
```

Classify:

```txt
CONFIRMED
PARTIAL
MISSING
CONFLICTING
NOT_APPLICABLE
```

A client must not invent a missing backend contract.

### 7. Verify environment, database, tenant, and service

For environment-sensitive work, identify:

```txt
environment
server or deployment target
database
tenant
service
repository path
version or commit
```

Do not confuse:

```txt
Database host
≠ Application service host
≠ Frontend deployment channel
```

Production requires an explicit target and approval, plus backup and rollback readiness when required.

### 8. Build the scope map

Output:

```txt
IN_SCOPE
READ_ONLY_DEPENDENCIES
OUT_OF_SCOPE
FORBIDDEN
FOLLOW_UP
```

Default Git policy:

```txt
NO_GIT_CLOSURE
```

unless the current stage explicitly authorizes Git closure.

### 9. Decide fail-open versus fail-closed

```txt
Low-risk uncertainty
→ CONTEXT_READY_WITH_NOTES

Safety-critical uncertainty
→ BLOCK
```

Safety-critical facts include agent, repository, branch when branch matters, scope, architectural ownership, production target, tenant, database, permission, destructive command, secret access, and required backup.

## Verdicts

Use one verdict only:

```txt
CONTEXT_READY
CONTEXT_READY_WITH_NOTES
BLOCKED — WRONG_AGENT
BLOCKED — WRONG_REPOSITORY
BLOCKED — WRONG_BRANCH
BLOCKED — MISSING_SCOPE
BLOCKED — MISSING_REFERENCE
BLOCKED — MISSING_PERMISSION
BLOCKED — UNSAFE_GIT_CONTEXT
BLOCKED — PARALLEL_CHANGE_COLLISION
BLOCKED — ARCHITECTURAL_OWNERSHIP_MISMATCH
BLOCKED — CONTRACT_NOT_CONFIRMED
BLOCKED — WRONG_DATABASE
BLOCKED — WRONG_TENANT
BLOCKED — ENVIRONMENT_IDENTITY_INCOMPLETE
BLOCKED — PRODUCTION_NOT_APPROVED
BLOCKED — BACKUP_REQUIRED
BLOCKED — REPORT_CONTEXT_MISMATCH
BLOCKED — CONTEXT_UNVERIFIED
```

Do not use `CONTEXT_READY` when a fact required for the requested action remains unresolved.

## Output contract

Return a compact report:

```txt
SKILL: raqeem-context-audit

CONTEXT VERDICT:
<one verdict>

STAGE:
<name and type>

TARGET:
<agent / repository / branch / HEAD>

DOMAIN AND REFERENCES:
- ...

ENVIRONMENT / DATABASE / TENANT:
<verified values or NOT_APPLICABLE>

GIT POLICY:
<READ_ONLY | NO_GIT_CLOSURE | GIT_CLOSURE_ALLOWED | RELEASE_ACTIONS_ALLOWED>

SCOPE:
- IN_SCOPE:
- READ_ONLY_DEPENDENCIES:
- OUT_OF_SCOPE:
- FORBIDDEN:
- FOLLOW_UP:

PARALLEL WORK:
- detected:
- collision:

CONTRACT:
<CONFIRMED | PARTIAL | MISSING | CONFLICTING | NOT_APPLICABLE>

PRODUCTION AUTHORITY:
<APPROVED | NOT_APPROVED | NOT_APPLICABLE>

EVIDENCE:
- ...

ONE SAFE NEXT ACTION:
<exactly one action or NONE>
```

## Non-responsibilities

This skill does not:

- Implement a feature.
- Repair code.
- Run Targeted QA.
- Perform Git closure.
- Release or deploy.
- Upgrade Odoo.
- Operate a server.
- Approve production.

It only determines whether the next bounded stage is safe to begin.

## Final self-check

Before returning:

- Did I verify the agent and repository?
- Did I verify branch and HEAD when relevant?
- Did I classify parallel work?
- Did I confirm architectural ownership?
- Did I verify the contract when required?
- Did I identify environment, database, tenant, and service when required?
- Did I keep the audit read-only?
- Did I avoid granting Git or production authority implicitly?
- Is the verdict no broader than the evidence?
- Did I permit exactly one safe next action?
