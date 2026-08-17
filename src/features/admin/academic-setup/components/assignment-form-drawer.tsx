'use client';

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
  useAcademicContextOptions,
} from '@/features/academic-context';
import { formatOfferingContextLabel } from '@/features/academic-context/utils/academic-context-display';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';
import type { SchoolClass, Subject } from '@/types/class';
import {
  EligibleTeachersPicker,
  eligibleTeachersSelectionValid,
  type EligibleTeachersPickerValue,
} from '@/features/admin/teachers/components/eligible-teachers-picker';
import { SetupDrawer } from './setup-drawer';

export type AssignmentFormCreatePayload = {
  academic_year_id?: number;
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
  classes,
  subjects,
  academicYearId: pageAcademicYearId,
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
  classes: SchoolClass[];
  subjects: Subject[];
  academicYearId?: number;
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
  const [role, setRole] = useState('main');
  const [reviewing, setReviewing] = useState(false);
  const [academicSelection, setAcademicSelection] = useState<AcademicContextSelection>(() => ({
    ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
  }));

  const context = useAcademicContextOptions({
    scope: 'assignment',
    enabled: open,
    selection: academicSelection,
    onSelectionChange: setAcademicSelection,
  });

  const classId =
    assignment?.class.id ??
    Number(missingIssue?.target.query?.class_id ?? context.selection.classId ?? 0);
  const subjectId =
    assignment?.subject.id ??
    Number(missingIssue?.target.query?.subject_id ?? context.selection.subjectId ?? 0);
  const assignmentAcademicYearId = (
    assignment as { academic_year?: { id?: number } } | null
  )?.academic_year?.id;
  const academicYearId =
    Number(
      assignmentAcademicYearId ??
        missingIssue?.target.query?.academic_year_id ??
        (context.selection.academicYearId || pageAcademicYearId || 0),
    ) || undefined;

  const title = assignment
    ? `${assignment.subject.name} · ${assignment.class.name}`
    : missingIssue?.title ?? t('admin.academicSetup.confirmAssignment');

  useEffect(() => {
    if (!open) return;

    setAcademicSelection({
      ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
      academicYearId: String(
        assignmentAcademicYearId ??
          missingIssue?.target.query?.academic_year_id ??
          pageAcademicYearId ??
          '',
      ),
      classId: String(assignment?.class.id ?? missingIssue?.target.query?.class_id ?? ''),
      subjectId: String(assignment?.subject.id ?? missingIssue?.target.query?.subject_id ?? ''),
      offeringId: assignment?.teaching_offering_id
        ? String(assignment.teaching_offering_id)
        : '',
    });

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
      setRole(assignment.role ?? 'main');
    } else {
      setSelection({ teacherId: null, override: false, overrideReason: '' });
      setWeeklyHours('2');
      setOfferingId('');
      setRole('main');
    }
    setRecheckNotice(false);
    setReviewing(false);
  }, [
    open,
    assignment,
    missingIssue,
    pageAcademicYearId,
    assignmentAcademicYearId,
  ]);

  const options = context.options;
  const cycles = options?.cycles ?? [];
  const levels = options?.levels ?? [];
  const contextClasses = options?.classes ?? [];
  const contextSubjects = options?.subjects ?? [];
  const offerings = options?.offerings ?? [];
  const offeringAmbiguous = offerings.length > 1;
  const selectedOffering = offerings.find((offering) => String(offering.id) === offeringId);
  const contextBusy = context.loading || context.refetching;
  const isGuidedCreate = !assignment && !missingIssue;

  useEffect(() => {
    if (!open || !classId || !subjectId || contextBusy) return;
    if (offerings.length !== 1) return;
    const nextOfferingId = String(offerings[0].id);
    if (offeringId !== nextOfferingId) setOfferingId(nextOfferingId);
  }, [open, classId, subjectId, contextBusy, offerings, offeringId]);

  const candidatesContext = useMemo(() => {
    if (!classId || !subjectId) return null;
    return {
      class_id: classId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
      teaching_offering_id: offeringId ? Number(offeringId) : undefined,
      role,
      weekly_hours: Number(weeklyHours) || undefined,
    };
  }, [classId, subjectId, academicYearId, offeringId, weeklyHours, role]);

  const selectionValid = eligibleTeachersSelectionValid(selection);
  const offeringBlocksCreate = !assignment && offeringAmbiguous && !offeringId;
  const canSubmit = canManage && selectionValid && !offeringBlocksCreate && !saving;

  const selectedClass = contextClasses.find((item) => item.id === classId);
  const selectedSubject = contextSubjects.find((item) => item.id === subjectId);
  const selectedClassName =
    selectedClass?.display_alias ??
    selectedClass?.display_name ??
    selectedClass?.name ??
    classes.find((item) => item.id === classId)?.name ??
    assignment?.class.name;
  const selectedSubjectName =
    selectedSubject?.display_label ??
    selectedSubject?.name ??
    subjects.find((item) => item.id === subjectId)?.name ??
    assignment?.subject.name;

  function resetTeacherChoice() {
    setSelection({ teacherId: null, override: false, overrideReason: '' });
    setRecheckNotice(false);
    setReviewing(false);
  }

  function updateGuidedContext(
    field: 'cycle' | 'level' | 'class' | 'subject',
    value: string,
  ) {
    context.setField(field, value);
    setOfferingId('');
    resetTeacherChoice();
  }

  function buildOverrideFields(): { override?: true; override_reason?: string } {
    if (!selection.override) return {};
    return {
      override: true,
      override_reason: selection.overrideReason.trim(),
    };
  }

  return (
    <SetupDrawer
      open={open}
      title={title}
      subtitle={
        assignment
          ? t('admin.academicSetup.editAssignmentSubtitle')
          : t('admin.academicSetup.newAssignmentSubtitle')
      }
      onClose={onClose}
      size="wide"
      className="academic-setup-assignment-drawer"
      iconClose
    >
      {!canManage && <p className="muted tiny">{t('admin.pageForbidden')}</p>}
      <section className="academic-setup-assignment-form-section">
        <div className="academic-setup-assignment-form-section__head">
          <span>1</span>
          <div>
            <h3>{t('admin.academicSetup.assignmentScopeTitle')}</h3>
            <p>{t('admin.academicSetup.assignmentScopeDescription')}</p>
          </div>
        </div>

        {isGuidedCreate ? (
          <div className="grid grid--form">
            <label className="field">
              <span>{t('academicContext.fields.cycle')}</span>
              <select
                value={context.selection.cycleId}
                disabled={saving || contextBusy}
                onChange={(event) => updateGuidedContext('cycle', event.target.value)}
              >
                <option value="">{t('academicContext.placeholders.cycle')}</option>
                {cycles.map((item) => (
                  <option key={item.id} value={item.id} dir="auto">
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('academicContext.fields.level')}</span>
              <select
                value={context.selection.levelId}
                disabled={!context.selection.cycleId || saving || contextBusy}
                onChange={(event) => updateGuidedContext('level', event.target.value)}
              >
                <option value="">{t('academicContext.placeholders.level')}</option>
                {levels.map((item) => (
                  <option key={item.id} value={item.id} dir="auto">
                    {item.display_alias || item.display_name || item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('academicContext.fields.class')}</span>
              <select
                value={context.selection.classId}
                disabled={!context.selection.levelId || saving || contextBusy}
                onChange={(event) => updateGuidedContext('class', event.target.value)}
              >
                <option value="">{t('academicContext.placeholders.class')}</option>
                {contextClasses.map((item) => (
                  <option key={item.id} value={item.id} dir="auto">
                    {item.display_alias || item.display_name || item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('academicContext.fields.subject')}</span>
              <select
                value={context.selection.subjectId}
                disabled={!context.selection.classId || saving || contextBusy}
                onChange={(event) => updateGuidedContext('subject', event.target.value)}
              >
                <option value="">{t('academicContext.placeholders.subject')}</option>
                {contextSubjects.map((item) => (
                  <option key={item.id} value={item.id} dir="auto">
                    {item.display_label || item.name}
                  </option>
                ))}
              </select>
            </label>

            {context.error ? (
              <p className="muted tiny" role="alert">
                {t('errors.loadFailedRetry')}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="academic-setup-assignment-form-section">
        <div className="academic-setup-assignment-form-section__head">
          <span>2</span>
          <div>
            <h3>{t('admin.academicSetup.assignmentDetailsTitle')}</h3>
            <p>{t('admin.academicSetup.assignmentDetailsDescription')}</p>
          </div>
        </div>

        <label className="field">
          <span>{t('admin.academicSetup.assignmentRole')}</span>
          <select
            value={role}
            disabled={saving}
            onChange={(event) => {
              setRole(event.target.value);
              resetTeacherChoice();
            }}
          >
            {(['main', 'assistant', 'substitute', 'co_teacher'] as const).map((value) => (
              <option key={value} value={value}>
                {t(`admin.academicSetup.assignmentRoles.${value}`)}
              </option>
            ))}
          </select>
        </label>

        {classId && subjectId ? (
          <div className="col" style={{ gap: 8 }}>
            {offeringAmbiguous ? (
              <label className="col" style={{ gap: 4 }}>
                <span className="tiny muted">{t('academicContext.fields.offering')}</span>
                <select
                  className="input"
                  value={offeringId}
                  onChange={(event) => {
                    setOfferingId(event.target.value);
                    resetTeacherChoice();
                  }}
                  disabled={!canManage || saving}
                >
                  <option value="">{t('academicContext.placeholders.offering')}</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {formatOfferingContextLabel(offering)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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
      </section>

      <section className="academic-setup-assignment-form-section">
        <div className="academic-setup-assignment-form-section__head">
          <span>3</span>
          <div>
            <h3>{t('admin.academicSetup.teacherSelectionTitle')}</h3>
            <p>{t('admin.academicSetup.teacherSelectionDescription')}</p>
          </div>
        </div>
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
              onChange={(event) => {
                setWeeklyHours(event.target.value);
                resetTeacherChoice();
              }}
            />
          </label>

          {recheckNotice ? (
            <p className="tiny" role="status">
              {t('admin.teacherDomain.eligibleTeachers.rechecked')}
            </p>
          ) : null}

          {candidatesContext ? (
            <EligibleTeachersPicker
              context={candidatesContext}
              selectedTeacherId={selection.teacherId}
              currentTeacherId={assignment?.teacher.id ?? null}
              canManage={canManage}
              disabled={saving}
              onChange={setSelection}
              onCandidatesReloaded={() => setRecheckNotice(true)}
            />
          ) : (
            <p className="muted tiny">{t('admin.academicSetup.pickTeacherHint')}</p>
          )}
        </div>
      </section>

      <section className="academic-setup-assignment-form-section academic-setup-assignment-form-section--final">
        <div className="academic-setup-assignment-form-section__head">
          <span>4</span>
          <div>
            <h3>{t('admin.academicSetup.assignmentReviewTitle')}</h3>
            <p>{t('admin.academicSetup.assignmentReviewDescription')}</p>
          </div>
        </div>

        {reviewing && selection.teacherId ? (
          <div className="info-banner" role="status">
            <strong>{t('admin.academicSetup.previewAssignment')}</strong>
            <p className="tiny muted">
              {selectedClassName} · {selectedSubjectName} ·{' '}
              {t(`admin.academicSetup.assignmentRoles.${role}`)}
            </p>
          </div>
        ) : null}

        <div className="row" style={{ gap: 8 }}>
          {assignment ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={!canSubmit}
                onClick={() => {
                  if (!reviewing) {
                    setReviewing(true);
                    return;
                  }
                  onUpdate(assignment.id, {
                    teacher_id: selection.teacherId!,
                    weekly_hours: Number(weeklyHours) || undefined,
                    role,
                    teaching_offering_id: offeringId ? Number(offeringId) : null,
                    ...buildOverrideFields(),
                  });
                }}
              >
                {reviewing
                  ? t('admin.academicSetup.confirmAssignment')
                  : t('admin.academicSetup.previewAssignment')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => onDelete(assignment)}
              >
                {t('admin.academicSetup.removeAssignment')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!canSubmit || !classId || !subjectId}
              onClick={() => {
                if (!classId || !subjectId || !selection.teacherId) return;
                if (!reviewing) {
                  setReviewing(true);
                  return;
                }
                onCreate({
                  academic_year_id: academicYearId,
                  class_id: classId,
                  subject_id: subjectId,
                  teacher_id: selection.teacherId,
                  weekly_hours: Number(weeklyHours) || 2,
                  role,
                  teaching_offering_id: offeringId ? Number(offeringId) : undefined,
                  ...buildOverrideFields(),
                });
              }}
            >
              {reviewing
                ? t('admin.academicSetup.confirmAssignment')
                : t('admin.academicSetup.previewAssignment')}
            </button>
          )}
        </div>
      </section>
    </SetupDrawer>
  );
}
