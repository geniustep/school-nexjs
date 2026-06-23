'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Card, DefinitionList, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';

type TeacherClassRow = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherProfilePage() {
  const user = useSession();
  const t = useT();
  const classesState = useResource<TeacherClassRow[]>(endpoints.teacher.classes);

  const subjectNames = new Set<string>();
  for (const row of classesState.data ?? []) {
    for (const subject of row.subjects ?? []) {
      const name = typeof subject === 'string' ? subject : subject.name;
      if (name?.trim()) subjectNames.add(name.trim());
    }
  }

  return (
    <div className="teacher-workspace">
      <PageHeader
        title={t('teacher.myProfileTitle')}
        subtitle={t('teacher.myProfileDesc')}
      />

      <Card className="staff-center-section">
        <SectionHead title={t('teacher.profileIdentityTitle')} />
        <DefinitionList
          items={[
            { label: t('admin.fullName'), value: user.name },
            {
              label: t('admin.staffCenter.primarySchool'),
              value: user.school?.name?.trim() || t('common.dash'),
            },
          ]}
        />
      </Card>

      <ResourceView state={classesState} loadingLabel={t('common.loading')}>
        {(classes) => (
          <>
            <Card className="staff-center-section">
              <SectionHead title={t('teacher.profileTeachingTitle')} />
              <DefinitionList
                items={[
                  {
                    label: t('nav.subjects'),
                    value: subjectNames.size
                      ? [...subjectNames].join('، ')
                      : t('common.dash'),
                  },
                  {
                    label: t('nav.myClasses'),
                    value: classes.length
                      ? classes.map((item) => item.name).join('، ')
                      : t('common.dash'),
                  },
                ]}
              />
            </Card>

            <Card className="staff-center-section">
              <SectionHead title={t('teacher.profileQuickLinksTitle')} />
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Link href="/teacher/timetable" className="btn btn--ghost btn--sm">
                  {t('nav.timetable')}
                </Link>
                <Link href="/teacher/attendance" className="btn btn--ghost btn--sm">
                  {t('nav.attendance')}
                </Link>
                <Link href="/teacher/homeworks" className="btn btn--ghost btn--sm">
                  {t('nav.homework')}
                </Link>
                <Link href="/teacher/resources" className="btn btn--ghost btn--sm">
                  {t('nav.teacherResources')}
                </Link>
                <Link href="/teacher/channels" className="btn btn--ghost btn--sm">
                  {t('nav.channels')}
                </Link>
              </div>
            </Card>
          </>
        )}
      </ResourceView>
    </div>
  );
}
