'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, Badge, DefinitionList, Avatar, SectionHead } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { formatDate } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useT } from '@/features/i18n/locale-context';
import type { Student } from '@/types/student';

export default function StudentProfilePage() {
  const t = useT();
  // Own profile only (server-enforced).
  const state = useResource<Student>(endpoints.student.profile);

  return (
    <>
      <PageHeader title={t('nav.myProfile')} subtitle={t('admin.profile')} />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(s) => (
          <Card>
            <div className="row" style={{ marginBlockEnd: 16 }}>
              <Avatar name={getStudentDisplayName(s)} />
              <div className="col" style={{ gap: 2 }}>
                <strong style={{ fontSize: 16 }}>{getStudentDisplayName(s)}</strong>
                {s.status && (
                  <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
                    {statusLabel(t, s.status)}
                  </Badge>
                )}
              </div>
            </div>
            <SectionHead title={t('admin.profile')} />
            <DefinitionList
              items={[
                { label: t('admin.personalName'), value: s.first_name?.trim() || t('common.dash') },
                { label: t('admin.familyName'), value: s.last_name?.trim() || t('common.dash') },
                { label: t('admin.fullName'), value: getStudentDisplayName(s) },
                { label: t('admin.massarCode'), value: s.massar_code ?? t('common.dash') },
                { label: t('admin.matriculeNumber'), value: s.matricule ?? s.code ?? t('common.dash') },
                { label: t('nav.classes'), value: s.class?.name ?? t('common.dash') },
                { label: t('nav.levels'), value: s.level?.name ?? t('common.dash') },
                {
                  label: t('admin.gender'),
                  value:
                    s.gender === 'male'
                      ? t('admin.male')
                      : s.gender === 'female'
                        ? t('admin.female')
                        : t('common.dash'),
                },
                { label: t('admin.dateOfBirth'), value: formatDate(s.date_of_birth) },
                { label: t('admin.admissionDate'), value: formatDate(s.admission_date) },
                { label: t('admin.email'), value: s.email ?? t('common.dash') },
                { label: t('admin.phone'), value: s.phone ?? t('common.dash') },
              ]}
            />
          </Card>
        )}
      </ResourceView>
    </>
  );
}
