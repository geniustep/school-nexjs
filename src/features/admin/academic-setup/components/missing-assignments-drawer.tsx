'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessIssue } from '@/types/academic-setup';
import { fetchTeachingAssignmentEligibleTeachers } from '@/features/admin/teachers/api/teaching-assignment-eligible-teachers-api';
import type { AssignmentFormCreatePayload } from './assignment-form-drawer';
import {
  readinessIssueDescription,
  readinessIssueTitle,
} from '../utils/readiness-i18n';
import { SetupDrawer } from './setup-drawer';

export function MissingAssignmentsDrawer({
  open,
  onClose,
  issues,
  canManage,
  onPickIssue,
  onConfirmCreate,
}: {
  open: boolean;
  onClose: () => void;
  issues: SetupReadinessIssue[];
  canManage: boolean;
  onPickIssue: (issue: SetupReadinessIssue) => void;
  onConfirmCreate: (payload: AssignmentFormCreatePayload) => void;
}) {
  const t = useT();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function adoptTopEligible(issue: SetupReadinessIssue) {
    const classId = Number(issue.target.query?.class_id);
    const subjectId = Number(issue.target.query?.subject_id);
    if (!classId || !subjectId) {
      onPickIssue(issue);
      return;
    }
    setBusyId(issue.id);
    const res = await fetchTeachingAssignmentEligibleTeachers({
      class_id: classId,
      subject_id: subjectId,
      role: 'main',
      weekly_hours: 2,
    });
    setBusyId(null);
    if (!res.success) {
      onPickIssue(issue);
      return;
    }
    const top = res.data.candidates.find(
      (c) =>
        c.eligibility_state === 'eligible' &&
        c.can_assign === true &&
        c.requires_override !== true,
    );
    if (top) {
      onConfirmCreate({
        class_id: classId,
        subject_id: subjectId,
        teacher_id: top.teacher_id,
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
        {issues.map((issue) => {
          const description = readinessIssueDescription(issue, t);
          return (
            <div
              key={issue.id}
              className="academic-setup-class-row"
              style={{ flexDirection: 'column', alignItems: 'stretch' }}
            >
              <strong>{readinessIssueTitle(issue, t)}</strong>
              {description && <span className="tiny muted">{description}</span>}
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
                    onClick={() => adoptTopEligible(issue)}
                  >
                    {t('admin.academicSetup.adoptSuggestion')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SetupDrawer>
  );
}
