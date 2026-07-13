'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useAcademicContextOptions } from '@/features/academic-context';
import { formatOfferingContextLabel } from '@/features/academic-context/utils/academic-context-display';
import type {
  SetupReadinessIssue,
  TeachingAssignment,
  TeachingAssignmentSuggestion,
  TeachingAssignmentSuggestionsResponse,
} from '@/types/academic-setup';
import { mapSuggestionReason } from '../utils/api-errors';
import { TeacherSuggestionList } from './teacher-suggestion-list';
import { SetupDrawer } from './setup-drawer';

export function AssignmentFormDrawer({
  open,
  onClose,
  assignment,
  missingIssue,
  canManage,
  saving,
  fetchSuggestions,
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
  fetchSuggestions: (classId: number, subjectId: number) => Promise<TeachingAssignmentSuggestionsResponse | null>;
  onCreate: (payload: {
    class_id: number;
    subject_id: number;
    teacher_id: number;
    weekly_hours?: number;
    role?: string;
    teaching_offering_id?: number;
  }) => void;
  onUpdate: (
    id: number,
    payload: Partial<{
      teacher_id: number;
      weekly_hours: number;
      role: string;
      teaching_offering_id: number | null;
    }>,
  ) => void;
  onDelete: (assignment: TeachingAssignment) => void;
}) {
  const t = useT();
  const [suggestions, setSuggestions] = useState<TeachingAssignmentSuggestion[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [weeklyHours, setWeeklyHours] = useState('2');
  const [offeringId, setOfferingId] = useState('');

  const classId = assignment?.class.id ?? Number(missingIssue?.target.query?.class_id ?? 0);
  const subjectId = assignment?.subject.id ?? Number(missingIssue?.target.query?.subject_id ?? 0);
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
    if (!open || !classId || !subjectId) return;
    let active = true;
    fetchSuggestions(classId, subjectId).then((res) => {
      if (!active) return;
      setSuggestions(res?.suggestions ?? []);
      // Edit mode keeps the assigned teacher; only create/missing flows auto-pick.
      if (!assignment) {
        const top = res?.suggestions?.find((s) => s.eligible);
        setSelectedTeacherId(top?.teacher.id ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, [open, classId, subjectId, fetchSuggestions, assignment]);

  useEffect(() => {
    if (assignment) {
      setSelectedTeacherId(assignment.teacher.id);
      setWeeklyHours(String(assignment.weekly_hours ?? 2));
      setOfferingId(
        assignment.teaching_offering_id ? String(assignment.teaching_offering_id) : '',
      );
    }
  }, [assignment]);

  const offerings = context.options?.offerings ?? [];
  const offeringAmbiguous = offerings.length > 1;
  const selectedOffering = offerings.find((o) => String(o.id) === offeringId);

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
      {assignment ? (
        <div className="col" style={{ gap: 12 }}>
          <p className="muted tiny">
            {t('admin.academicSetup.assignmentSummary', {
              teacher: assignment.teacher.name,
              subject: assignment.subject.name,
              class: assignment.class.name,
            })}
          </p>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.weeklyHours')}</span>
            <input
              className="input"
              type="number"
              min={1}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
            />
          </label>
          <TeacherSuggestionList
            suggestions={suggestions.map((s) => ({
              teacher: {
                id: s.teacher.id,
                name: s.teacher.name,
                code: null,
                phone: null,
                email: null,
                classes: [],
                subjects: [],
                status: 'active',
                qualification: null,
                specialization: null,
              },
              tier: s.label === 'recommended' ? 'best' : s.label === 'suitable' ? 'suitable' : s.label === 'review' ? 'review' : s.label === 'not_recommended' ? 'not_recommended' : 'ineligible',
              reasons: s.reasons.map((r) => mapSuggestionReason(r, t)),
              classCount: s.current_hours ?? 0,
              teachesSubject: s.eligible,
              inClass: false,
            }))}
            selectedTeacherId={selectedTeacherId}
            onSelect={setSelectedTeacherId}
            canConfirm={false}
          />
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={saving || !selectedTeacherId}
              onClick={() =>
                onUpdate(assignment.id, {
                  teacher_id: selectedTeacherId!,
                  weekly_hours: Number(weeklyHours) || undefined,
                  teaching_offering_id: offeringId ? Number(offeringId) : null,
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
          </div>
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <p className="muted tiny">{t('admin.academicSetup.pickTeacherHint')}</p>
          <TeacherSuggestionList
            suggestions={suggestions.map((s) => ({
              teacher: {
                id: s.teacher.id,
                name: s.teacher.name,
                code: null,
                phone: null,
                email: null,
                classes: [],
                subjects: [],
                status: 'active',
                qualification: null,
                specialization: null,
              },
              tier: s.label === 'recommended' ? 'best' : s.label === 'suitable' ? 'suitable' : s.label === 'review' ? 'review' : s.label === 'not_recommended' ? 'not_recommended' : 'ineligible',
              reasons: s.reasons.map((r) => mapSuggestionReason(r, t)),
              classCount: s.current_hours ?? 0,
              teachesSubject: s.eligible,
              inClass: false,
            }))}
            selectedTeacherId={selectedTeacherId}
            onSelect={setSelectedTeacherId}
            canConfirm={canManage && !!selectedTeacherId}
            onConfirm={() => {
              if (!classId || !subjectId || !selectedTeacherId) return;
              if (offeringAmbiguous && !offeringId) return;
              onCreate({
                class_id: classId,
                subject_id: subjectId,
                teacher_id: selectedTeacherId,
                weekly_hours: Number(weeklyHours) || 2,
                role: 'main',
                teaching_offering_id: offeringId ? Number(offeringId) : undefined,
              });
            }}
          />
        </div>
      )}
    </SetupDrawer>
  );
}
