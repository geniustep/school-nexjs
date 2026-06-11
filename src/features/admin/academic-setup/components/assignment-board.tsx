'use client';

import { useMemo, useState } from 'react';
import { Card, InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { DerivedAssignment } from '../types';
import { AssignmentByClass } from './assignment-by-class';
import { AssignmentByTeacher } from './assignment-by-teacher';
import { AssignmentBySubject } from './assignment-by-subject';
import { MissingAssignmentsDrawer } from './missing-assignments-drawer';

export type AssignmentViewMode = 'class' | 'teacher' | 'subject';

export function AssignmentBoard({
  classes,
  teachers,
  assignments,
  canManage,
  initialClassId,
  initialSubjectId,
}: {
  classes: SchoolClass[];
  teachers: Teacher[];
  assignments: DerivedAssignment[];
  canManage: boolean;
  initialClassId?: number | null;
  initialSubjectId?: number | null;
}) {
  const t = useT();
  const [view, setView] = useState<AssignmentViewMode>('class');
  const [missingOpen, setMissingOpen] = useState(false);
  const unassigned = useMemo(
    () => assignments.filter((a) => a.status === 'unassigned'),
    [assignments],
  );

  return (
    <div className="academic-setup-assignment-board">
      <InfoBanner
        tone="amber"
        icon="⚠️"
        title={t('admin.academicSetup.assignmentsApiGapTitle')}
        description={t('admin.academicSetup.assignmentsApiGapDesc')}
      />

      <div className="between academic-setup-filters">
        <div className="academic-setup-view-tabs" role="tablist">
          {(['class', 'teacher', 'subject'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              className={`academic-setup-view-tab${view === mode ? ' academic-setup-view-tab--active' : ''}`}
              onClick={() => setView(mode)}
            >
              {t(`admin.academicSetup.viewBy.${mode}`)}
            </button>
          ))}
        </div>
        {unassigned.length > 0 && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setMissingOpen(true)}>
            {t('admin.academicSetup.completeMissing')} ({unassigned.length})
          </button>
        )}
      </div>

      <Card pad={false}>
        {view === 'class' && (
          <AssignmentByClass
            classes={classes}
            teachers={teachers}
            assignments={assignments}
            canManage={canManage}
            initialClassId={initialClassId}
            initialSubjectId={initialSubjectId}
          />
        )}
        {view === 'teacher' && (
          <AssignmentByTeacher assignments={assignments} teachers={teachers} />
        )}
        {view === 'subject' && <AssignmentBySubject assignments={assignments} />}
      </Card>

      <MissingAssignmentsDrawer
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
        unassigned={unassigned}
        classes={classes}
        teachers={teachers}
        canManage={canManage}
      />
    </div>
  );
}
