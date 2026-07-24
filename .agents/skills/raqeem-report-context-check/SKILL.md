---
name: raqeem-report-context-check
description: Read-only trust and context audit for incoming Raqeem implementation, QA, Git, release, upgrade, server, or production reports. Use before relying on a prior report, resuming a track, or writing the next stage. It verifies identity, scope, evidence, limitations, and permitted downstream use without re-executing or repairing the reported work.
---

# Raqeem Report Context Check

## Purpose

Determine whether an incoming report belongs to the current track and whether its material claims are sufficiently supported to be trusted and used downstream.

```txt
Report received
→ verify identity and scope
→ classify claims and evidence
→ define trust boundary
→ allow one safe next action
```

This skill does not re-run the stage, edit the report, repair code, or grant Git, release, upgrade, deployment, or production authority.

## Difference from context audit

```txt
raqeem-report-context-check
→ Can this incoming report be trusted and used?

raqeem-context-audit
→ Is the proposed current task safe to start?
```

When a report proposes a next stage, run this skill first, then run `raqeem-context-audit` for that new stage.

## Inputs

Require as available:

```txt
report_text
current_track
expected_stage
expected_agent
expected_repository
expected_branch
expected_domain
expected_environment
expected_tenant_or_database
previous_trusted_report
requested_next_action
```

Additional useful expectations:

```txt
expected_head
expected_files
expected_module_version
expected_deployment_target
production_approval
backup_evidence
qa_evidence
```

A value written inside the report is a claim, not verified truth.

## Operating mode

```txt
READ_ONLY
```

Allowed:

- Read the full report and relevant governing references.
- Read the previous trusted report from the same track.
- Read repository instructions and domain references.
- Inspect Git metadata, diffs, contracts, tests, deployment state, release registry, or sanitized runtime evidence when needed.
- Compare claimed branch, HEAD, version, environment, tenant, service, or deployment target with actual evidence.

Forbidden:

- Editing code, data, configuration, or the report.
- Running repairs or implementation.
- Stage, commit, push, merge, rebase, or branch mutation.
- Upgrade, restart, deployment, or production mutation.
- Changing credentials or creating test data.
- Treating the report as production approval.

## Claim classification

Split the report into material claims and classify each as:

```txt
VERIFIED
SUPPORTED
UNSUPPORTED
CONTRADICTED
OUT_OF_SCOPE
NOT_APPLICABLE
```

Definitions:

- `VERIFIED`: confirmed from an authoritative or actual source.
- `SUPPORTED`: reasonably evidenced inside the report but not independently verified.
- `UNSUPPORTED`: asserted without enough evidence.
- `CONTRADICTED`: conflicts with an authoritative or actual source.
- `OUT_OF_SCOPE`: not part of the current stage or track.
- `NOT_APPLICABLE`: irrelevant to the current report type.

## Procedure

### 1. Extract report identity

Extract:

```txt
stage_name
stage_type
agent
repository
branch
head
domain
environment
tenant_or_database
time_window
claimed_actions
final_verdict
limitations
recommended_next_step
```

If essential identity cannot be established:

```txt
REPORT_REJECTED — IDENTITY_INCOMPLETE
```

### 2. Match the current track

Compare report identity with the expected track, stage, agent, repository, branch, domain, environment, and tenant.

Reject cross-track evidence that has not been explicitly handed over.

### 3. Check chronology

Verify that the report follows the trusted prior state and does not rely on a later, unrelated, superseded, or contradictory stage.

### 4. Check scope and changed artifacts

Identify:

```txt
claimed_in_scope
claimed_changed_files
claimed_out_of_scope
parallel_work
unmentioned_mutations
```

A broad success verdict is invalid when the evidence covers only a smaller scope.

### 5. Verify material Git claims

When Git claims matter, verify as available:

```txt
repository
branch
HEAD before / after
changed or staged files
commit SHA
push status
upstream relation
merge or release target
```

Do not infer push, merge, or deployment from the existence of a commit.

### 6. Verify QA claims

Check:

```txt
tests named
commands or actions
expected and actual results
scope and security boundaries
baseline comparison
smoke identity / role / tenant
limitations
```

Build success alone does not prove functional, authenticated, or production success.

### 7. Verify release, upgrade, server, and production claims

When applicable, require evidence for:

```txt
target identity
source commit or version
deployment or service target
database / tenant
backup requirement and evidence
operation executed
health and smoke
rollback readiness
limitations
```

A frontend deployment does not prove an Odoo upgrade, and an Odoo upgrade does not prove every client is compatible.

### 8. Preserve limitations

Do not remove or soften limitations such as unavailable authenticated smoke, platform not tested, missing credentials, partial tenant coverage, baseline debt, or unavailable production evidence.

### 9. Define trust boundary

State exactly which claims may be used downstream and which must not be relied upon.

### 10. Allow one safe next action

The output should permit one bounded handoff or safe stop, not silently start implementation or production.

## Verdicts

```txt
REPORT_CONTEXT_ACCEPTED
REPORT_CONTEXT_ACCEPTED_WITH_NOTES
REPORT_CONTEXT_ACCEPTED_WITH_LIMITATIONS
REPORT_REJECTED — IDENTITY_INCOMPLETE
REPORT_REJECTED — CONTEXT_MISMATCH
REPORT_REJECTED — SCOPE_MISMATCH
REPORT_REJECTED — CHRONOLOGY_INVALID
REPORT_REJECTED — MATERIAL_CONTRADICTION
BLOCKED — GIT_CLAIMS_UNVERIFIED
BLOCKED — QA_CLAIMS_UNVERIFIED
BLOCKED — RUNTIME_CLAIMS_UNVERIFIED
BLOCKED — MATERIAL_EVIDENCE_MISSING
BLOCKED — UNSAFE_DOWNSTREAM_USE
```

## Output contract

```txt
SKILL: raqeem-report-context-check
REPORT VERDICT:
REPORT IDENTITY:
INTENDED DOWNSTREAM USE:
CURRENT TRACK MATCH:
VERIFIED CONTEXT:
CLAIMS:
- VERIFIED:
- SUPPORTED:
- UNSUPPORTED:
- CONTRADICTED:
- OUT_OF_SCOPE:
EVIDENCE MAP:
ACCEPTED LIMITATIONS:
TRUST BOUNDARY:
PERMITTED DOWNSTREAM USE:
FORBIDDEN DOWNSTREAM USE:
ONE SAFE NEXT HANDOFF:
```

## Final rules

```txt
No evidence → No trusted report
A report is an input, not proof by itself
Validate material claims before downstream execution
Preserve explicit limitations
Read-only and fail-closed
```
