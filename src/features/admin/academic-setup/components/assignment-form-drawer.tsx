'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
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
  }) => void;
  onUpdate: (
    id: number,
    payload: Partial<{ teacher_id: number; weekly_hours: number; role: string }>,
  ) => void;
  onDelete: (assignment: TeachingAssignment) => void;
}) {
  const t = useT();
  const [suggestions, setSuggestions] = useState<TeachingAssignmentSuggestion[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [weeklyHours, setWeeklyHours] = useState('2');

  const classId = assignment?.class.id ?? Number(missingIssue?.target.query?.class_id ?? 0);
  const subjectId = assignment?.subject.id ?? Number(missingIssue?.target.query?.subject_id ?? 0);
  const title = assignment
    ? `${assignment.subject.name} · ${assignment.class.name}`
    : missingIssue?.title ?? t('admin.academicSetup.confirmAssignment');

  useEffect(() => {
    if (!open || !classId || !subjectId) return;
    let active = true;
    fetchSuggestions(classId, subjectId).then((res) => {
      if (!active) return;
      setSuggestions(res?.suggestions ?? []);
      const top = res?.suggestions?.find((s) => s.eligible);
      setSelectedTeacherId(top?.teacher.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [open, classId, subjectId, fetchSuggestions]);

  useEffect(() => {
    if (assignment) {
      setSelectedTeacherId(assignment.teacher.id);
      setWeeklyHours(String(assignment.weekly_hours ?? 2));
    }
  }, [assignment]);

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      {!canManage && <p className="muted tiny">{t('admin.pageForbidden')}</p>}
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
              onCreate({
                class_id: classId,
                subject_id: subjectId,
                teacher_id: selectedTeacherId,
                weekly_hours: Number(weeklyHours) || 2,
                role: 'main',
              });
            }}
          />
        </div>
      )}
    </SetupDrawer>
  );
}
