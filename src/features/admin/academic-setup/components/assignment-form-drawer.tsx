'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

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
import { resolveGuidedAssignmentClasses } from '../utils/assignment-class-options';
import { SetupDrawer } from './setup-drawer';
import './assignment-form-drawer.css';

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

const ASSIGNMENT_ROLES = ['main', 'assistant', 'substitute', 'co_teacher'] as const;

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
    : missingIssue?.title ?? t('admin.academicSetup.addAssignment');

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
  const guidedClasses = resolveGuidedAssignmentClasses(
    classes,
    contextClasses,
    {
      cycleId: context.selection.cycleId,
      levelId: context.selection.levelId,
    },
    academicYearId,
  );

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

  const selectedClass =
    contextClasses.find((item) => item.id === classId) ??
    guidedClasses.find((item) => item.id === classId);
  const selectedSubject = contextSubjects.find((item) => item.id === subjectId);
  const selectedCycle = cycles.find((item) => String(item.id) === context.selection.cycleId);
  const selectedLevel = levels.find((item) => String(item.id) === context.selection.levelId);
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
  const selectedLevelName =
    selectedLevel?.display_alias ?? selectedLevel?.display_name ?? selectedLevel?.name;

  const scopeReady = Boolean(classId && subjectId);
  const detailsReady =
    scopeReady &&
    Number(weeklyHours) > 0 &&
    (!offeringAmbiguous || Boolean(offeringId));
  const teacherReady = detailsReady && selectionValid;
  const activeStep = !scopeReady ? 1 : !detailsReady ? 2 : !teacherReady ? 3 : 4;

  const progressItems = [
    t('admin.academicSetup.assignmentScopeTitle'),
    t('admin.academicSetup.assignmentDetailsTitle'),
    t('admin.academicSetup.teacherSelectionTitle'),
    t('admin.academicSetup.assignmentReviewTitle'),
  ];

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

  function handlePrimaryAction() {
    if (!classId || !subjectId || !selection.teacherId) return;
    if (!reviewing) {
      setReviewing(true);
      return;
    }

    if (assignment) {
      onUpdate(assignment.id, {
        teacher_id: selection.teacherId,
        weekly_hours: Number(weeklyHours) || undefined,
        role,
        teaching_offering_id: offeringId ? Number(offeringId) : null,
        ...buildOverrideFields(),
      });
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
  }

  const primaryDisabled = assignment
    ? !canSubmit
    : !canSubmit || !classId || !subjectId;

  const footer = (
    <div className="assignment-drawer-footer">
      {assignment ? (
        <button
          type="button"
          className="btn btn--ghost btn--sm assignment-drawer-footer__delete"
          disabled={saving}
          onClick={() => onDelete(assignment)}
        >
          {t('admin.academicSetup.removeAssignment')}
        </button>
      ) : null}
      <div className="assignment-drawer-footer__spacer" />
      <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={onClose}>
        {t('common.close')}
      </button>
      <button
        type="button"
        className="btn btn--primary btn--sm assignment-drawer-footer__primary"
        disabled={primaryDisabled}
        onClick={handlePrimaryAction}
      >
        {reviewing
          ? t('admin.academicSetup.confirmAssignment')
          : t('admin.academicSetup.previewAssignment')}
      </button>
    </div>
  );

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
      footer={footer}
    >
      <div className="assignment-drawer-workspace">
        <nav className="assignment-drawer-progress" aria-label={t('admin.academicSetup.assignmentReviewTitle')}>
          {progressItems.map((label, index) => {
            const step = index + 1;
            const stateClass =
              step < activeStep
                ? ' assignment-drawer-progress__item--complete'
                : step === activeStep
                  ? ' assignment-drawer-progress__item--active'
                  : '';
            return (
              <div key={label} className={`assignment-drawer-progress__item${stateClass}`}>
                <span className="assignment-drawer-progress__index" aria-hidden>
                  {step < activeStep ? '✓' : step}
                </span>
                <span className="assignment-drawer-progress__label">{label}</span>
              </div>
            );
          })}
        </nav>

        <div className="assignment-drawer-body">
          {!canManage ? <p className="muted tiny">{t('admin.pageForbidden')}</p> : null}

          {(selectedCycle || selectedLevelName || selectedClassName || selectedSubjectName) ? (
            <div className="assignment-drawer-context-strip" aria-live="polite">
              {selectedCycle ? (
                <span className="assignment-drawer-context-chip">
                  {t('academicContext.fields.cycle')}
                  <strong dir="auto">{selectedCycle.name}</strong>
                </span>
              ) : null}
              {selectedLevelName ? (
                <span className="assignment-drawer-context-chip">
                  {t('academicContext.fields.level')}
                  <strong dir="auto">{selectedLevelName}</strong>
                </span>
              ) : null}
              {selectedClassName ? (
                <span className="assignment-drawer-context-chip">
                  {t('academicContext.fields.class')}
                  <strong dir="auto">{selectedClassName}</strong>
                </span>
              ) : null}
              {selectedSubjectName ? (
                <span className="assignment-drawer-context-chip">
                  {t('academicContext.fields.subject')}
                  <strong dir="auto">{selectedSubjectName}</strong>
                </span>
              ) : null}
            </div>
          ) : null}

          <section className="assignment-drawer-panel">
            <div className="assignment-drawer-panel__head">
              <span className="assignment-drawer-panel__step" aria-hidden>1</span>
              <div>
                <h3>{t('admin.academicSetup.assignmentScopeTitle')}</h3>
                <p>{t('admin.academicSetup.assignmentScopeDescription')}</p>
              </div>
            </div>
            <div className="assignment-drawer-panel__body">
              {isGuidedCreate ? (
                <div className="assignment-drawer-context-grid">
                  <label className="assignment-drawer-select">
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

                  <label className="assignment-drawer-select">
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

                  <label className="assignment-drawer-select">
                    <span>{t('academicContext.fields.class')}</span>
                    <select
                      value={context.selection.classId}
                      disabled={!context.selection.levelId || saving || contextBusy}
                      onChange={(event) => updateGuidedContext('class', event.target.value)}
                    >
                      <option value="">{t('academicContext.placeholders.class')}</option>
                      {guidedClasses.map((item) => (
                        <option key={item.id} value={item.id} dir="auto">
                          {item.display_alias || item.display_name || item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="assignment-drawer-select">
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
                    <p className="tiny assignment-drawer-error" role="alert">
                      {t('errors.loadFailedRetry')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="assignment-drawer-review-grid">
                  <div className="assignment-drawer-review-item">
                    <span>{t('academicContext.fields.class')}</span>
                    <strong dir="auto">{selectedClassName ?? '—'}</strong>
                  </div>
                  <div className="assignment-drawer-review-item">
                    <span>{t('academicContext.fields.subject')}</span>
                    <strong dir="auto">{selectedSubjectName ?? '—'}</strong>
                  </div>
                  <div className="assignment-drawer-review-item">
                    <span>{t('admin.academicSetup.assignmentRole')}</span>
                    <strong>{t(`admin.academicSetup.assignmentRoles.${role}`)}</strong>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="assignment-drawer-panel">
            <div className="assignment-drawer-panel__head">
              <span className="assignment-drawer-panel__step" aria-hidden>2</span>
              <div>
                <h3>{t('admin.academicSetup.assignmentDetailsTitle')}</h3>
                <p>{t('admin.academicSetup.assignmentDetailsDescription')}</p>
              </div>
            </div>
            <div className="assignment-drawer-panel__body">
              <span className="assignment-drawer-role-label">{t('admin.academicSetup.assignmentRole')}</span>
              <div className="assignment-drawer-role-grid" role="group" aria-label={t('admin.academicSetup.assignmentRole')}>
                {ASSIGNMENT_ROLES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`assignment-drawer-role${role === value ? ' assignment-drawer-role--active' : ''}`}
                    aria-pressed={role === value}
                    disabled={saving}
                    onClick={() => {
                      setRole(value);
                      resetTeacherChoice();
                    }}
                  >
                    {t(`admin.academicSetup.assignmentRoles.${value}`)}
                  </button>
                ))}
              </div>

              <div className="assignment-drawer-details-grid">
                <label className="assignment-drawer-detail-card">
                  <span>{t('admin.academicSetup.weeklyHours')}</span>
                  <input
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

                {classId && subjectId && offeringAmbiguous ? (
                  <label className="assignment-drawer-detail-card">
                    <span>{t('academicContext.fields.offering')}</span>
                    <select
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
                ) : (
                  <div className="assignment-drawer-detail-card" aria-hidden={!selectedOffering}>
                    <span>{t('academicContext.fields.offering')}</span>
                    <strong dir="auto">
                      {selectedOffering ? formatOfferingContextLabel(selectedOffering) : '—'}
                    </strong>
                  </div>
                )}
              </div>

              {offeringAmbiguous && !offeringId ? (
                <p className="muted tiny" role="status">
                  {t('academicContext.hints.ambiguousOfferings')}
                </p>
              ) : null}

              {(selectedOffering?.teaching_language || selectedOffering?.teaching_reference) ? (
                <div className="assignment-drawer-offering-meta">
                  {selectedOffering?.teaching_language ? (
                    <span dir="auto">
                      {t('academicContext.language.derivedFromOffering', {
                        language: selectedOffering.teaching_language.name,
                      })}
                    </span>
                  ) : null}
                  {selectedOffering?.teaching_reference ? (
                    <span dir="auto">
                      {t('academicContext.fields.reference')}: {selectedOffering.teaching_reference.name}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {!assignment?.teaching_offering_id && assignment ? (
                <p className="muted tiny">{t('academicContext.hints.legacyMissingOffering')}</p>
              ) : null}
            </div>
          </section>

          <section className="assignment-drawer-panel assignment-drawer-panel--teacher">
            <div className="assignment-drawer-panel__head">
              <span className="assignment-drawer-panel__step" aria-hidden>3</span>
              <div>
                <h3>{t('admin.academicSetup.teacherSelectionTitle')}</h3>
                <p>{t('admin.academicSetup.teacherSelectionDescription')}</p>
              </div>
            </div>
            <div className="assignment-drawer-panel__body">
              <div className="assignment-drawer-teacher-intro">
                <p className="muted tiny">
                  {assignment
                    ? t('admin.academicSetup.assignmentSummary', {
                        teacher: assignment.teacher.name,
                        subject: assignment.subject.name,
                        class: assignment.class.name,
                      })
                    : t('admin.academicSetup.pickTeacherHint')}
                </p>
                {recheckNotice ? (
                  <span className="assignment-drawer-teacher-state" role="status">
                    ✓ {t('admin.teacherDomain.eligibleTeachers.rechecked')}
                  </span>
                ) : null}
              </div>

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

          {reviewing && selection.teacherId ? (
            <section className="assignment-drawer-panel assignment-drawer-panel--review" role="status">
              <div className="assignment-drawer-panel__head">
                <span className="assignment-drawer-panel__step" aria-hidden>4</span>
                <div>
                  <h3>{t('admin.academicSetup.assignmentReviewTitle')}</h3>
                  <p>{t('admin.academicSetup.assignmentReviewDescription')}</p>
                </div>
              </div>
              <div className="assignment-drawer-panel__body">
                <div className="assignment-drawer-review-grid">
                  <div className="assignment-drawer-review-item">
                    <span>{t('academicContext.fields.class')}</span>
                    <strong dir="auto">{selectedClassName ?? '—'}</strong>
                  </div>
                  <div className="assignment-drawer-review-item">
                    <span>{t('academicContext.fields.subject')}</span>
                    <strong dir="auto">{selectedSubjectName ?? '—'}</strong>
                  </div>
                  <div className="assignment-drawer-review-item">
                    <span>{t('admin.academicSetup.assignmentRole')}</span>
                    <strong>{t(`admin.academicSetup.assignmentRoles.${role}`)}</strong>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </SetupDrawer>
  );
}
