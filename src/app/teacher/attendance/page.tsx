'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttendanceBatch } from '@/features/attendance/attendance-batch';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import {
  TeacherEmptyState,
  TeacherPageHeader,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

function AttendanceInner() {
  const t = useT();
  const params = useSearchParams();
  const preset = params.get('class');
  const [selected, setSelected] = useState<string>(preset ?? '');
  const state = useResource<TeacherClass[]>(endpoints.teacher.classes);

  return (
    <ResourceView
      state={state}
      loadingLabel={t('attendance.loadingClasses')}
      isEmpty={(d) => d.length === 0}
      empty={
        <TeacherEmptyState
          icon="🏫"
          title={t('attendance.noClasses')}
          description={t('attendance.noClassesDesc')}
        />
      }
    >
      {(classes) => {
        const current = selected || String(classes[0]?.id ?? '');
        const classId = Number(current);

        if (!current) {
          return (
            <div className="teacher-workspace">
              <TeacherPageHeader title={t('attendance.title')} subtitle={t('attendance.subtitle')} />
              <TeacherEmptyState
                icon="🏫"
                title={t('attendance.selectClass')}
                description={t('attendance.noClassesDesc')}
              />
            </div>
          );
        }

        return (
          <ClassHubShell classId={classId} activeTab="attendance">
            <TeacherWorkspaceCard title={t('attendance.title')} icon="🗓️" className="t-attendance-ws">
              <div className="attendance-toolbar attendance-toolbar--premium">
                <label className="attendance-toolbar__field">
                  <span className="attendance-toolbar__label">{t('attendance.classLabel')}</span>
                  <select
                    className="select"
                    value={current}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <AttendanceBatch key={current} classId={classId} />
            </TeacherWorkspaceCard>
          </ClassHubShell>
        );
      }}
    </ResourceView>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={null}>
      <AttendanceInner />
    </Suspense>
  );
}
