'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card } from '@/components/ui/primitives';
import { AttendanceBatch } from '@/features/attendance/attendance-batch';
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
    <>
      <PageHeader title={t('attendance.title')} subtitle={t('attendance.subtitle')} />
      <ResourceView
        state={state}
        loadingLabel={t('attendance.loadingClasses')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon="🏫"
            title={t('attendance.noClasses')}
            description={t('attendance.noClassesDesc')}
          />
        }
      >
        {(classes) => {
          const current = selected || String(classes[0]?.id ?? '');
          return (
            <>
              <div className="toolbar">
                <label className="row tiny" style={{ gap: 6 }}>
                  <span className="muted">{t('attendance.classLabel')}</span>
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
              {current ? (
                <AttendanceBatch key={current} classId={Number(current)} />
              ) : (
                <Card>
                  <p className="muted">{t('attendance.selectClass')}</p>
                </Card>
              )}
            </>
          );
        }}
      </ResourceView>
    </>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={null}>
      <AttendanceInner />
    </Suspense>
  );
}
