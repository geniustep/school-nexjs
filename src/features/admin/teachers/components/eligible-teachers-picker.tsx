'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { fetchTeachingAssignmentEligibleTeachers } from '@/features/admin/teachers/api/teaching-assignment-eligible-teachers-api';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import {
  canSelectCandidate,
  candidateNeedsOverride,
  candidateStateLabelKey,
  formatAvailabilityState,
  formatTimetableConflict,
  formatWeeklyLoadValue,
  isValidOverrideReason,
  partitionCandidates,
  translateCandidateReason,
} from '@/features/admin/teachers/utils/teaching-assignment-eligible-teachers-present';
import { useT } from '@/features/i18n/locale-context';
import type {
  TeachingAssignmentCandidate,
  TeachingAssignmentCandidatesAllowedActions,
  TeachingAssignmentCandidatesQuery,
  TeachingAssignmentCandidatesSummary,
} from '@/types/teacher-domain';
import '@/features/admin/teachers/teachers-domain.css';

export type EligibleTeachersPickerValue = {
  teacherId: number | null;
  override: boolean;
  overrideReason: string;
};

export function EligibleTeachersPicker({
  context,
  selectedTeacherId,
  currentTeacherId = null,
  canManage,
  disabled = false,
  onChange,
  onCandidatesReloaded,
}: {
  context: Omit<TeachingAssignmentCandidatesQuery, 'include_ineligible'> | null;
  selectedTeacherId: number | null;
  currentTeacherId?: number | null;
  canManage: boolean;
  disabled?: boolean;
  onChange: (next: EligibleTeachersPickerValue) => void;
  onCandidatesReloaded?: () => void;
}) {
  const t = useT();
  const requestIdRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeIneligible, setIncludeIneligible] = useState(false);
  const [candidates, setCandidates] = useState<TeachingAssignmentCandidate[]>([]);
  const [summary, setSummary] = useState<TeachingAssignmentCandidatesSummary | null>(null);
  const [allowed, setAllowed] = useState<TeachingAssignmentCandidatesAllowedActions>({});
  const [overrideReason, setOverrideReason] = useState('');

  const contextKey = useMemo(() => {
    if (!context) return '';
    return JSON.stringify({
      class_id: context.class_id,
      subject_id: context.subject_id,
      academic_year_id: context.academic_year_id ?? null,
      teaching_offering_id: context.teaching_offering_id ?? null,
      role: context.role ?? 'main',
      effective_from: context.effective_from ?? null,
      effective_to: context.effective_to ?? null,
      weekly_hours: context.weekly_hours ?? null,
    });
  }, [context]);

  useEffect(() => {
    if (!context?.class_id || !context?.subject_id) {
      setCandidates([]);
      setSummary(null);
      setAllowed({});
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    void fetchTeachingAssignmentEligibleTeachers({
      ...context,
      include_ineligible: includeIneligible,
    }).then((res) => {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      if (!res.success) {
        setCandidates([]);
        setSummary(null);
        setAllowed({});
        setError(mapTeacherDomainError(res.error, t));
        return;
      }
      setCandidates(res.data.candidates);
      setSummary(res.data.summary);
      setAllowed(res.data.allowed_actions ?? {});
      onCandidatesReloaded?.();

      if (selectedTeacherId != null) {
        const selected = res.data.candidates.find((c) => c.teacher_id === selectedTeacherId);
        if (!selected || !canSelectCandidate(selected, res.data.allowed_actions, { currentTeacherId })) {
          onChange({ teacherId: null, override: false, overrideReason: '' });
          setOverrideReason('');
          return;
        }
        const needsOverride = candidateNeedsOverride(selected, { currentTeacherId });
        if (!needsOverride) {
          setOverrideReason('');
          onChange({ teacherId: selectedTeacherId, override: false, overrideReason: '' });
        } else {
          onChange({
            teacherId: selectedTeacherId,
            override: true,
            overrideReason,
          });
        }
      }
    });
  }, [contextKey, includeIneligible, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const { selectable, ineligible } = useMemo(
    () => partitionCandidates(candidates),
    [candidates],
  );

  const selected = candidates.find((c) => c.teacher_id === selectedTeacherId) ?? null;
  const needsOverride = candidateNeedsOverride(selected, { currentTeacherId });
  const canViewIneligible = allowed.can_view_ineligible_candidates === true;
  const canCreate = allowed.can_create_assignment !== false;

  function selectCandidate(candidate: TeachingAssignmentCandidate) {
    if (disabled || !canManage || !canCreate) return;
    if (!canSelectCandidate(candidate, allowed, { currentTeacherId })) return;
    const override = candidateNeedsOverride(candidate, { currentTeacherId });
    if (!override) setOverrideReason('');
    onChange({
      teacherId: candidate.teacher_id,
      override,
      overrideReason: override ? overrideReason : '',
    });
  }

  function updateOverrideReason(value: string) {
    setOverrideReason(value);
    if (selectedTeacherId == null) return;
    onChange({
      teacherId: selectedTeacherId,
      override: needsOverride,
      overrideReason: needsOverride ? value : '',
    });
  }

  if (!context?.class_id || !context?.subject_id) {
    return (
      <p className="muted tiny">{t('admin.teacherDomain.eligibleTeachers.contextIncomplete')}</p>
    );
  }

  return (
    <div className="teacher-domain-eligible">
      {summary ? (
        <p className="tiny muted teacher-domain-eligible__summary" role="status">
          {t('admin.teacherDomain.eligibleTeachers.summaryLine', {
            eligible: summary.eligible_count,
            warning: summary.eligible_with_warning_count,
            override: summary.override_required_count,
            ineligible: summary.not_eligible_count,
          })}
        </p>
      ) : null}

      {loading ? (
        <p className="muted tiny">{t('admin.teacherDomain.eligibleTeachers.loading')}</p>
      ) : null}

      {error ? (
        <p className="tiny teacher-domain-eligible__error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && selectable.length === 0 && ineligible.length === 0 ? (
        <div className="teacher-domain-eligible__empty">
          <p className="muted">{t('admin.teacherDomain.eligibleTeachers.empty')}</p>
          <p className="tiny muted">{t('admin.teacherDomain.eligibleTeachers.emptyHint')}</p>
        </div>
      ) : null}

      <ul className="teacher-domain-eligible__list">
        {selectable.map((candidate) => {
          const selectableNow = canSelectCandidate(candidate, allowed, { currentTeacherId });
          const selectedNow = selectedTeacherId === candidate.teacher_id;
          const tt = formatTimetableConflict(candidate.has_timetable_conflict, t);
          return (
            <li key={candidate.teacher_id}>
              <button
                type="button"
                className={
                  selectedNow
                    ? 'teacher-domain-eligible__item teacher-domain-eligible__item--selected'
                    : 'teacher-domain-eligible__item'
                }
                disabled={disabled || !canManage || !canCreate || !selectableNow}
                onClick={() => selectCandidate(candidate)}
              >
                <span className="teacher-domain-eligible__item-main">
                  <strong dir="auto">{candidate.display_name ?? `#${candidate.teacher_id}`}</strong>
                  <Badge
                    tone={
                      candidate.eligibility_state === 'eligible'
                        ? 'green'
                        : candidate.eligibility_state === 'eligible_with_warning'
                          ? 'amber'
                          : 'slate'
                    }
                  >
                    {t(candidateStateLabelKey(candidate.eligibility_state))}
                  </Badge>
                </span>
                <span className="tiny muted teacher-domain-eligible__meta">
                  {t('admin.teacherDomain.eligibleTeachers.weeklyLoad')}:{' '}
                  {formatWeeklyLoadValue(candidate.current_weekly_load, t)}
                  {' · '}
                  {t('admin.teacherDomain.eligibleTeachers.weeklyMax')}:{' '}
                  {formatWeeklyLoadValue(candidate.maximum_weekly_load, t)}
                  {' · '}
                  {t('admin.teacherDomain.eligibleTeachers.remainingCapacity')}:{' '}
                  {formatWeeklyLoadValue(candidate.remaining_weekly_capacity, t)}
                </span>
                <span className="tiny muted">
                  {t('admin.teacherDomain.eligibleTeachers.availabilityLabel')}:{' '}
                  {formatAvailabilityState(candidate.availability_state, t)}
                  {tt ? ` · ${tt}` : ''}
                </span>
                {candidate.warning_reasons.length > 0 ? (
                  <span className="tiny teacher-domain-eligible__warnings">
                    {candidate.warning_reasons
                      .map((reason) => translateCandidateReason(reason, t))
                      .join(' · ')}
                  </span>
                ) : null}
                {canManage ? (
                  <Link
                    href={`/admin/teachers/${candidate.teacher_id}`}
                    className="tiny teacher-domain-eligible__profile-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('admin.teacherDomain.eligibleTeachers.openAcademicProfile')}
                  </Link>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {canViewIneligible ? (
        <label className="teacher-domain-eligible__toggle">
          <input
            type="checkbox"
            checked={includeIneligible}
            disabled={disabled || loading}
            onChange={(e) => setIncludeIneligible(e.target.checked)}
          />
          <span>{t('admin.teacherDomain.eligibleTeachers.showIneligible')}</span>
        </label>
      ) : null}

      {includeIneligible && ineligible.length > 0 ? (
        <div className="teacher-domain-eligible__ineligible">
          <p className="tiny muted">{t('admin.teacherDomain.eligibleTeachers.ineligibleSection')}</p>
          <ul className="teacher-domain-eligible__list">
            {ineligible.map((candidate) => (
              <li key={candidate.teacher_id}>
                <div className="teacher-domain-eligible__item teacher-domain-eligible__item--disabled">
                  <span className="teacher-domain-eligible__item-main">
                    <strong dir="auto">
                      {candidate.display_name ?? `#${candidate.teacher_id}`}
                    </strong>
                    <Badge tone="red">
                      {t(candidateStateLabelKey('not_eligible'))}
                    </Badge>
                  </span>
                  <span className="tiny muted">
                    {candidate.blocking_reasons
                      .map((reason) => translateCandidateReason(reason, t))
                      .join(' · ')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {needsOverride && selected ? (
        <div className="teacher-domain-eligible__override">
          <p className="tiny muted">{t('admin.teacherDomain.eligibleTeachers.overrideHint')}</p>
          <ul className="tiny muted">
            {(selected.override_reasons?.length
              ? selected.override_reasons
              : selected.warning_reasons
            ).map((reason) => (
              <li key={reason.code}>{translateCandidateReason(reason, t)}</li>
            ))}
          </ul>
          <label className="field">
            <span>{t('admin.teacherDomain.eligibleTeachers.overrideReason')}</span>
            <textarea
              value={overrideReason}
              disabled={disabled || !canManage}
              rows={3}
              onChange={(e) => updateOverrideReason(e.target.value)}
            />
          </label>
          {!isValidOverrideReason(overrideReason) ? (
            <p className="tiny teacher-domain-eligible__error" role="alert">
              {t('admin.teacherDomain.eligibleTeachers.overrideReasonRequired')}
            </p>
          ) : (
            <p className="tiny muted">
              {t('admin.teacherDomain.eligibleTeachers.overrideAuditNote')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function eligibleTeachersSelectionValid(input: {
  teacherId: number | null;
  override: boolean;
  overrideReason: string;
}): boolean {
  if (input.teacherId == null) return false;
  if (input.override) return isValidOverrideReason(input.overrideReason);
  return true;
}
