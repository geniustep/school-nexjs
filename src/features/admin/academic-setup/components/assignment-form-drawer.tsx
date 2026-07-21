'use client';

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useAcademicContextOptions } from '@/features/academic-context';
import { formatOfferingContextLabel } from '@/features/academic-context/utils/academic-context-display';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';
import {
  EligibleTeachersPicker,
  eligibleTeachersSelectionValid,
  type EligibleTeachersPickerValue,
} from '@/features/admin/teachers/components/eligible-teachers-picker';
import { SetupDrawer } from './setup-drawer';

export type AssignmentFormCreatePayload = {
  class_id: number;
  subject_id: number;
  teacher_id: number;
  weekly_hours?: number;
  role?: string;
  teaching_offering_id?: number;
  override?: true;
  override_reason?: string;
};

export type AssignmentFormUpdatePayload = Partial<{
  teacher_id: number;
  weekly_hours: number;
  role: string;
  teaching_offering_id: number | null;
  override: true;
  override_reason: string;
}>;

export function AssignmentFormDrawer({
  open,
  onClose,
  assignment,
  missingIssue,
  canManage,
  saving,
  onCreate,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  assignment: TeachingAssignment | null;
  missingIssue: SetupReadinessIssue | null;
  canManage: boolean;
  saving: boolean;
  onCreate: (payload: AssignmentFormCreatePayload) => void;
  onUpdate: (id: number, payload: AssignmentFormUpdatePayload) => void;
  onDelete: (assignment: TeachingAssignment) => void;
}) {
  const t = useT();
  const [selection, setSelection] = useState<EligibleTeachersPickerValue>({
    teacherId: null,
    override: false,
    overrideReason: '',
  });
  const [weeklyHours, setWeeklyHours] = useState('2');
  const [offeringId, setOfferingId] = useState('');
  const [recheckNotice, setRecheckNotice] = useState(false);

  const classId = assignment?.class.id ?? Number(missingIssue?.target.query?.class_id ?? 0);
  const subjectId = assignment?.subject.id ?? Number(missingIssue?.target.query?.subject_id ?? 0);
  const academicYearId =
    Number(
      (assignment as { academic_year?: { id?: number } } | null)?.academic_year?.id ??
        missingIssue?.target.query?.academic_year_id ??
        0,
    ) || undefined;

  const title = assignment
    ? `${assignment.subject.name} · ${assignment.class.name}`
    : missingIssue?.title ?? t('admin.academicSetup.confirmAssignment');

  const context = useAcademicContextOptions({
    scope: 'assignment',
    enabled: open && Boolean(classId && subjectId),
    initialSelection: {
      classId: classId ? String(classId) : '',
      subjectId: subjectId ? String(subjectId) : '',
      offeringId: assignment?.teaching_offering_id
        ? String(assignment.teaching_offering_id)
        : '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (assignment) {
      setSelection({
        teacherId: assignment.teacher.id,
        override: false,
        overrideReason: '',
      });
      setWeeklyHours(String(assignment.weekly_hours ?? 2));
      setOfferingId(
        assignment.teaching_offering_id ? String(assignment.teaching_offering_id) : '',
      );
    } else {
      setSelection({ teacherId: null, override: false, overrideReason: '' });
      setWeeklyHours('2');
      setOfferingId('');
    }
    setRecheckNotice(false);
  }, [open, assignment]);

  const offerings = context.options?.offerings ?? [];
  const offeringAmbiguous = offerings.length > 1;
  const selectedOffering = offerings.find((o) => String(o.id) === offeringId);

  const candidatesContext = useMemo(() => {
    if (!classId || !subjectId) return null;
    return {
      class_id: classId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
      teaching_offering_id: offeringId ? Number(offeringId) : undefined,
      role: 'main',
      weekly_hours: Number(weeklyHours) || undefined,
    };
  }, [classId, subjectId, academicYearId, offeringId, weeklyHours]);

  const selectionValid = eligibleTeachersSelectionValid(selection);
  const offeringBlocksCreate = !assignment && offeringAmbiguous && !offeringId;
  const canSubmit = canManage && selectionValid && !offeringBlocksCreate && !saving;

  function buildOverrideFields(): { override?: true; override_reason?: string } {
    if (!selection.override) return {};
    return {
      override: true,
      override_reason: selection.overrideReason.trim(),
    };
  }

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      {!canManage && <p className="muted tiny">{t('admin.pageForbidden')}</p>}
      {classId && subjectId ? (
        <div className="col" style={{ gap: 8 }}>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('academicContext.fields.offering')}</span>
            <select
              className="input"
              value={offeringId}
              onChange={(e) => setOfferingId(e.target.value)}
              disabled={!canManage || saving}
            >
              <option value="">
                {offeringAmbiguous
                  ? t('academicContext.placeholders.offeringRequired')
                  : t('academicContext.placeholders.offering')}
              </option>
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {formatOfferingContextLabel(offering)}
                </option>
              ))}
            </select>
          </label>
          {offeringAmbiguous && !offeringId ? (
            <p className="muted tiny" role="status">
              {t('academicContext.hints.ambiguousOfferings')}
            </p>
          ) : null}
          {selectedOffering?.teaching_language ? (
            <p className="muted tiny" dir="auto">
              {t('academicContext.language.derivedFromOffering', {
                language: selectedOffering.teaching_language.name,
              })}
            </p>
          ) : null}
          {selectedOffering?.teaching_reference ? (
            <p className="muted tiny" dir="auto">
              {t('academicContext.fields.reference')}: {selectedOffering.teaching_reference.name}
            </p>
          ) : null}
          {!assignment?.teaching_offering_id && assignment ? (
            <p className="muted tiny">{t('academicContext.hints.legacyMissingOffering')}</p>
          ) : null}
        </div>
      ) : null}

      <div className="col" style={{ gap: 12 }}>
        {assignment ? (
          <p className="muted tiny">
            {t('admin.academicSetup.assignmentSummary', {
              teacher: assignment.teacher.name,
              subject: assignment.subject.name,
              class: assignment.class.name,
            })}
          </p>
        ) : (
          <p className="muted tiny">{t('admin.academicSetup.pickTeacherHint')}</p>
        )}

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.academicSetup.weeklyHours')}</span>
          <input
            className="input"
            type="number"
            min={1}
            value={weeklyHours}
            disabled={!canManage || saving}
            onChange={(e) => setWeeklyHours(e.target.value)}
          />
        </label>

        {recheckNotice ? (
          <p className="tiny" role="status">
            {t('admin.teacherDomain.eligibleTeachers.rechecked')}
          </p>
        ) : null}

        <EligibleTeachersPicker
          context={candidatesContext}
          selectedTeacherId={selection.teacherId}
          currentTeacherId={assignment?.teacher.id ?? null}
          canManage={canManage}
          disabled={saving}
          onChange={setSelection}
          onCandidatesReloaded={() => setRecheckNotice(true)}
        />

        <div className="row" style={{ gap: 8 }}>
          {assignment ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={!canSubmit}
                onClick={() =>
                  onUpdate(assignment.id, {
                    teacher_id: selection.teacherId!,
                    weekly_hours: Number(weeklyHours) || undefined,
                    teaching_offering_id: offeringId ? Number(offeringId) : null,
                    ...buildOverrideFields(),
                  })
                }
              >
                {t('admin.academicSetup.confirmAssignment')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => onDelete(assignment)}
              >
                {t('admin.academicSetup.deactivateAssignment')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!canSubmit || !classId || !subjectId}
              onClick={() => {
                if (!classId || !subjectId || !selection.teacherId) return;
                onCreate({
                  class_id: classId,
                  subject_id: subjectId,
                  teacher_id: selection.teacherId,
                  weekly_hours: Number(weeklyHours) || 2,
                  role: 'main',
                  teaching_offering_id: offeringId ? Number(offeringId) : undefined,
                  ...buildOverrideFields(),
                });
              }}
            >
              {t('admin.academicSetup.confirmAssignment')}
            </button>
          )}
        </div>
      </div>
    </SetupDrawer>
  );
}
