'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessIssue, TeachingAssignmentSuggestionsResponse } from '@/types/academic-setup';
import { SetupDrawer } from './setup-drawer';

export function MissingAssignmentsDrawer({
  open,
  onClose,
  issues,
  canManage,
  fetchSuggestions,
  onPickIssue,
  onConfirmCreate,
}: {
  open: boolean;
  onClose: () => void;
  issues: SetupReadinessIssue[];
  canManage: boolean;
  fetchSuggestions: (classId: number, subjectId: number) => Promise<TeachingAssignmentSuggestionsResponse | null>;
  onPickIssue: (issue: SetupReadinessIssue) => void;
  onConfirmCreate: (payload: {
    class_id: number;
    subject_id: number;
    teacher_id: number;
    weekly_hours?: number;
    role?: string;
  }) => void;
}) {
  const t = useT();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function adoptTopSuggestion(issue: SetupReadinessIssue) {
    const classId = Number(issue.target.query?.class_id);
    const subjectId = Number(issue.target.query?.subject_id);
    if (!classId || !subjectId) {
      onPickIssue(issue);
      return;
    }
    setBusyId(issue.id);
    const res = await fetchSuggestions(classId, subjectId);
    const top = res?.suggestions?.find((s) => s.eligible && s.label === 'recommended')
      ?? res?.suggestions?.find((s) => s.eligible);
    setBusyId(null);
    if (top) {
      onConfirmCreate({
        class_id: classId,
        subject_id: subjectId,
        teacher_id: top.teacher.id,
        weekly_hours: 2,
        role: 'main',
      });
    } else {
      onPickIssue(issue);
    }
  }

  return (
    <SetupDrawer open={open} title={t('admin.academicSetup.completeMissing')} onClose={onClose}>
      <p className="muted tiny">{t('admin.academicSetup.missingCount', { count: issues.length })}</p>
      <div className="col" style={{ gap: 8, marginTop: 12 }}>
        {issues.map((issue) => (
          <div key={issue.id} className="academic-setup-class-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <strong>{issue.title}</strong>
            {issue.description && <span className="tiny muted">{issue.description}</span>}
            <div className="row mt-2" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={!canManage || busyId === issue.id}
                onClick={() => onPickIssue(issue)}
              >
                {t('admin.academicSetup.chooseTeacher')}
              </button>
              {canManage && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={busyId === issue.id}
                  onClick={() => adoptTopSuggestion(issue)}
                >
                  {t('admin.academicSetup.adoptSuggestion')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </SetupDrawer>
  );
}
