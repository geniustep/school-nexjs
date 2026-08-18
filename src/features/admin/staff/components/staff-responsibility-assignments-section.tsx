'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { fetchAdminAcademicContextOptions } from '@/features/academic-context/api/academic-context-api';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { resolveStaffPermissionLabel } from '@/features/admin/staff/utils/staff-center-present';
import { useStaffResponsibilityAssignments } from '@/features/admin/staff/hooks/use-staff-responsibility-assignments';
import {
  canEditStaffResponsibilityAssignment,
  canEndStaffResponsibilityAssignment,
  type StaffResponsibilityAssignment,
  type StaffResponsibilityAssignmentScopeType,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';
import {
  buildStaffResponsibilityWritePayload,
  classifyStaffResponsibilityError,
  emptyStaffResponsibilityForm,
  staffResponsibilityFormFromAssignment,
  toggleStaffResponsibilityNumber,
  toggleStaffResponsibilityString,
  validateStaffResponsibilityForm,
  type StaffResponsibilityFormState,
} from '@/features/admin/staff/utils/staff-responsibility-assignment-contract';
import {
  STAFF_RESPONSIBILITY_COPY,
  staffResponsibilityErrorMessage,
} from '@/features/admin/staff/utils/staff-responsibility-copy';
import type { StaffOptions } from '@/types/academic-setup';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';

function validationMessage(
  code: ReturnType<typeof validateStaffResponsibilityForm>,
  copy: (typeof STAFF_RESPONSIBILITY_COPY)['ar'],
): string | null {
  if (!code) return null;
  if (code === 'capability_required') return copy.selectAtLeastOneCapability;
  if (code === 'scope_target_required') return copy.selectScopeTargets;
  if (code === 'academic_year_required') return copy.error.year_required;
  return copy.error.period_invalid;
}

export function StaffResponsibilityAssignmentsSection({
  userId,
  options,
  canManage,
  onChanged,
}: {
  userId: number;
  options?: StaffOptions;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const copy = STAFF_RESPONSIBILITY_COPY[locale];
  const toast = useToast();
  const assignments = useStaffResponsibilityAssignments(userId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffResponsibilityAssignment | null>(null);
  const [form, setForm] = useState<StaffResponsibilityFormState>(emptyStaffResponsibilityForm);
  const [saving, setSaving] = useState(false);
  const [endTarget, setEndTarget] = useState<StaffResponsibilityAssignment | null>(null);
  const [academicOptions, setAcademicOptions] = useState<AcademicContextOptionsResponse | null>(null);
  const [academicOptionsError, setAcademicOptionsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminAcademicContextOptions({ scope: 'assignment' }).then((response) => {
      if (cancelled) return;
      if (response.success) {
        setAcademicOptions(response.data);
        setAcademicOptionsError(false);
      } else {
        setAcademicOptions(null);
        setAcademicOptionsError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const grantableCapabilities = useMemo(
    () => (options?.capabilities ?? []).filter((option) => option.grantable !== false),
    [options?.capabilities],
  );
  const levelName = useMemo(
    () => new Map((options?.levels ?? []).map((item) => [item.id, item.name])),
    [options?.levels],
  );
  const className = useMemo(
    () => new Map((options?.classes ?? []).map((item) => [item.id, item.name])),
    [options?.classes],
  );
  const cycleName = useMemo(
    () => new Map((academicOptions?.cycles ?? []).map((item) => [item.id, item.name])),
    [academicOptions?.cycles],
  );
  const academicYearName = useMemo(
    () => new Map((academicOptions?.academic_years ?? []).map((item) => [item.id, item.name])),
    [academicOptions?.academic_years],
  );

  const scopeOptions: Array<{ value: StaffResponsibilityAssignmentScopeType; label: string }> = [
    { value: 'school', label: copy.scopeSchool },
    { value: 'cycle', label: copy.scopeCycle },
    { value: 'levels', label: copy.scopeLevels },
    { value: 'classes', label: copy.scopeClasses },
  ];

  function capabilityLabel(code: string): string {
    return resolveStaffPermissionLabel(code, locale, t) ?? code;
  }

  function namedTargets(ids: number[], names: Map<number, string>): string {
    const resolved = ids.map((id) => names.get(id)).filter((value): value is string => Boolean(value));
    if (resolved.length === ids.length && resolved.length) return resolved.join(', ');
    return ids.length ? copy.selectedCount(ids.length) : copy.unknownScope;
  }

  function scopeLabel(item: StaffResponsibilityAssignment): string {
    if (item.scope_type === 'school') return copy.scopeSchool;
    if (item.scope_type === 'cycle') {
      return `${copy.scopeCycle}: ${namedTargets(item.cycle_ids ?? [], cycleName)}`;
    }
    if (item.scope_type === 'levels') {
      return `${copy.scopeLevels}: ${namedTargets(item.level_ids ?? [], levelName)}`;
    }
    if (item.scope_type === 'classes') {
      return `${copy.scopeClasses}: ${namedTargets(item.class_ids ?? [], className)}`;
    }
    return copy.unknownScope;
  }

  function yearLabel(item: StaffResponsibilityAssignment): string {
    if (item.year_policy === 'unbounded') return copy.yearUnbounded;
    if (item.year_policy === 'follows_request_context') return copy.yearFollowsContext;
    if (item.year_policy === 'bound') {
      return item.academic_year_id
        ? academicYearName.get(item.academic_year_id) ?? copy.yearBound
        : copy.yearBound;
    }
    return copy.yearFollowsContext;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyStaffResponsibilityForm());
    setFormOpen(true);
  }

  function openEdit(item: StaffResponsibilityAssignment) {
    if (!canEditStaffResponsibilityAssignment(item)) return;
    setEditing(item);
    setForm(staffResponsibilityFormFromAssignment(item));
    setFormOpen(true);
  }

  async function saveForm() {
    const validation = validateStaffResponsibilityForm(form);
    if (validation) {
      toast.error(validationMessage(validation, copy) ?? copy.error.generic);
      return;
    }
    setSaving(true);
    try {
      const payload = buildStaffResponsibilityWritePayload(form);
      const response = editing
        ? await assignments.update(editing.id, payload)
        : await assignments.create(payload);
      if (!response) return;
      if (!response.success) {
        const kind = classifyStaffResponsibilityError(response.error.code);
        toast.error(staffResponsibilityErrorMessage(copy, kind, response.error.message));
        return;
      }
      toast.success(editing ? copy.updated : copy.created);
      setFormOpen(false);
      setEditing(null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function endAssignment() {
    if (!endTarget) return;
    const response = await assignments.end(endTarget.id, {
      end_reason: 'ended_from_staff_profile',
    });
    if (!response) return;
    if (!response.success) {
      const kind = classifyStaffResponsibilityError(response.error.code);
      toast.error(staffResponsibilityErrorMessage(copy, kind, response.error.message));
      return;
    }
    toast.success(copy.ended);
    setEndTarget(null);
    onChanged?.();
  }

  return (
    <Card className="staff-center-section">
      <SectionHead
        title={copy.title}
        action={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
              {copy.add}
            </button>
          ) : undefined
        }
      />
      <p className="muted" style={{ marginTop: 0 }}>{copy.description}</p>

      {assignments.summary ? (
        <div
          data-testid="responsibility-summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {[
            [copy.summaryTotal, assignments.summary.total],
            [copy.summaryActive, assignments.summary.active],
            [copy.summaryManual, assignments.summary.manual_count],
            [copy.summaryLegacy, assignments.summary.legacy_header_count],
          ].map(([label, value]) => (
            <div key={String(label)} className="info-banner" style={{ padding: '8px 10px' }}>
              <div className="tiny muted">{label}</div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {academicOptionsError ? (
        <div className="info-banner" style={{ marginBottom: 10 }}>
          <span className="muted">{copy.academicContextUnavailable}</span>
        </div>
      ) : null}

      {assignments.loading ? <p className="muted">{copy.loading}</p> : null}
      {assignments.error ? (
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">
            {staffResponsibilityErrorMessage(
              copy,
              classifyStaffResponsibilityError(assignments.error.code),
              assignments.error.message,
            )}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void assignments.reload()}>
            {copy.retry}
          </button>
        </div>
      ) : null}

      {!assignments.loading && !assignments.error && !assignments.items.length ? (
        <p className="muted">{copy.empty}</p>
      ) : null}

      <div className="col" style={{ gap: 10 }}>
        {assignments.items.map((item) => {
          const canEdit = canManage && canEditStaffResponsibilityAssignment(item);
          const canEnd = canManage && canEndStaffResponsibilityAssignment(item);
          return (
            <article
              key={item.id}
              data-testid={`responsibility-assignment-${item.id}`}
              style={{
                border: '1px solid var(--c-border)',
                borderRadius: 12,
                padding: 12,
                display: 'grid',
                gap: 10,
              }}
            >
              <div className="between" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <Badge tone={item.origin === 'manual' ? 'blue' : 'slate'}>
                    {item.origin === 'manual' ? copy.manual : copy.legacy}
                  </Badge>
                  <Badge tone={item.is_effective ? 'green' : 'amber'}>
                    {item.is_effective ? copy.effective : copy.inactive}
                  </Badge>
                  {item.origin !== 'manual' || !item.active || item.state !== 'active' ? (
                    <span className="tiny muted">{copy.readOnly}</span>
                  ) : null}
                </div>
                {canEdit || canEnd ? (
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {canEdit ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(item)}>
                        {copy.edit}
                      </button>
                    ) : null}
                    {canEnd ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEndTarget(item)}>
                        {copy.end}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div><strong>{copy.scope}:</strong> <span>{scopeLabel(item)}</span></div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{copy.capabilities}:</strong>
                  {(item.capability_codes ?? []).map((code) => (
                    <Badge key={code} tone="blue">{capabilityLabel(code)}</Badge>
                  ))}
                </div>
                <div className="muted tiny">{copy.yearPolicy}: {yearLabel(item)}</div>
                <div className="muted tiny">
                  {copy.dates}: {copy.from} {item.effective_from ?? '—'} · {copy.to} {item.effective_to ?? copy.openEnded}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmationDialog
        open={formOpen}
        title={editing ? copy.editTitle : copy.createTitle}
        confirmLabel={copy.save}
        cancelLabel={copy.cancel}
        size="form"
        loading={saving}
        closeOnBackdrop={!saving}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onConfirm={saveForm}
        body={
          <div className="col" style={{ gap: 14 }}>
            <label className="field">
              <span className="field__label">{copy.chooseScope}</span>
              <select
                className="input"
                value={form.scopeType}
                onChange={(event) => {
                  const next = event.target.value as StaffResponsibilityAssignmentScopeType;
                  setForm((current) => ({
                    ...current,
                    scopeType: next,
                    cycleIds: next === 'cycle' ? current.cycleIds : [],
                    levelIds: next === 'levels' ? current.levelIds : [],
                    classIds: next === 'classes' ? current.classIds : [],
                  }));
                }}
              >
                {scopeOptions.map((scope) => (
                  <option key={scope.value} value={scope.value}>{scope.label}</option>
                ))}
              </select>
            </label>

            {form.scopeType === 'cycle' ? (
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label">{copy.scopeCycle}</legend>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  {(academicOptions?.cycles ?? []).map((cycle) => (
                    <label key={cycle.id} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.cycleIds.includes(cycle.id)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          cycleIds: toggleStaffResponsibilityNumber(current.cycleIds, cycle.id),
                        }))}
                      />
                      <span>{cycle.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {form.scopeType === 'levels' ? (
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label">{copy.scopeLevels}</legend>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  {(options?.levels ?? []).map((level) => (
                    <label key={level.id} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.levelIds.includes(level.id)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          levelIds: toggleStaffResponsibilityNumber(current.levelIds, level.id),
                        }))}
                      />
                      <span>{level.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {form.scopeType === 'classes' ? (
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label">{copy.scopeClasses}</legend>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {(options?.classes ?? []).map((klass) => (
                    <label key={klass.id} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.classIds.includes(klass.id)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          classIds: toggleStaffResponsibilityNumber(current.classIds, klass.id),
                        }))}
                      />
                      <span>{klass.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field__label">{copy.chooseCapabilities}</legend>
              {grantableCapabilities.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                  {grantableCapabilities.map((capability) => (
                    <label key={capability.code} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.capabilityCodes.includes(capability.code)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          capabilityCodes: toggleStaffResponsibilityString(
                            current.capabilityCodes,
                            capability.code,
                          ),
                        }))}
                      />
                      <span>{capabilityLabel(capability.code)}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <span className="muted">{copy.noGrantableCapabilities}</span>
              )}
            </fieldset>

            <label className="field">
              <span className="field__label">{copy.yearPolicy}</span>
              <select
                className="input"
                value={form.yearPolicy}
                onChange={(event) => {
                  const next = event.target.value as StaffResponsibilityFormState['yearPolicy'];
                  setForm((current) => ({
                    ...current,
                    yearPolicy: next,
                    academicYearId: next === 'bound' ? current.academicYearId : null,
                  }));
                }}
              >
                <option value="follows_request_context">{copy.yearFollowsContext}</option>
                <option value="bound">{copy.yearBound}</option>
                <option value="unbounded">{copy.yearUnbounded}</option>
              </select>
            </label>

            {form.yearPolicy === 'bound' ? (
              <label className="field">
                <span className="field__label">{copy.academicYear}</span>
                <select
                  className="input"
                  value={form.academicYearId ?? ''}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    academicYearId: event.target.value ? Number(event.target.value) : null,
                  }))}
                >
                  <option value="">{copy.selectAcademicYear}</option>
                  {(academicOptions?.academic_years ?? []).map((year) => (
                    <option key={year.id} value={year.id}>{year.name}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <label className="field">
                <span className="field__label">{copy.effectiveFrom}</span>
                <input
                  type="date"
                  className="input"
                  value={form.effectiveFrom}
                  onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">{copy.effectiveTo}</span>
                <input
                  type="date"
                  className="input"
                  value={form.effectiveTo}
                  onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))}
                />
              </label>
            </div>
          </div>
        }
      />

      <ConfirmationDialog
        open={Boolean(endTarget)}
        title={copy.endTitle}
        body={copy.endBody}
        confirmLabel={copy.endConfirm}
        cancelLabel={copy.cancel}
        variant="danger"
        onClose={() => setEndTarget(null)}
        onConfirm={endAssignment}
      />
    </Card>
  );
}
