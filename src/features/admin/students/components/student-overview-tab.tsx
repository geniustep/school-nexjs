'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { isRelationshipActive } from '../utils/relationship-types';
import type { StudentDetailsData } from '@/types/student-360';

export function StudentOverviewTab({
  details,
  canManage,
  onAccountChanged,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  onAccountChanged: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const activeRels = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const primary = activeRels.find((r) => r.is_primary_contact);
  const legal = activeRels.find((r) => r.is_legal_guardian);
  const financial = activeRels.find((r) => r.is_financial_responsible);

  return (
    <div className="grid grid--cards student-360-overview">
      <Card>
        <SectionHead title={t('admin.student360.sections.identity')} />
        <DefinitionList
          items={[
            { label: t('admin.personalName'), value: s.first_name?.trim() || t('common.dash') },
            { label: t('admin.familyName'), value: s.last_name?.trim() || t('common.dash') },
            { label: t('admin.fullName'), value: getStudentDisplayName(s) },
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
            { label: t('admin.massarCode'), value: <span className="mono">{s.massar_code ?? t('common.dash')}</span> },
            {
              label: t('admin.matriculeNumber'),
              value: <span className="mono">{s.matricule ?? s.code ?? t('common.dash')}</span>,
            },
            { label: t('academic.status'), value: statusLabel(t, s.status) },
          ]}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.currentStudy')} />
        <DefinitionList
          items={[
            { label: t('admin.finance.activeSchool'), value: refOrStringLabel(enrollment?.school ?? s.school) },
            { label: t('admin.academicYearId'), value: refOrStringLabel(enrollment?.academic_year) },
            {
              label: t('nav.levels'),
              value: enrollment?.level
                ? studentLevelLabel(enrollment.level)
                : s.level
                  ? studentLevelLabel(s.level)
                  : t('common.dash'),
            },
            {
              label: t('nav.classes'),
              value: enrollment?.class
                ? studentClassLabel(enrollment.class)
                : s.class
                  ? studentClassLabel(s.class)
                  : t('common.dash'),
            },
            {
              label: t('admin.student360.enrollmentState'),
              value: enrollment?.state ?? t('common.dash'),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.family')} />
        <DefinitionList
          items={[
            {
              label: t('admin.student360.activeGuardiansCount'),
              value: String(activeRels.length),
            },
            {
              label: t('admin.student360.primaryContact'),
              value: primary?.guardian.name ?? t('common.dash'),
            },
            {
              label: t('admin.student360.legalGuardian'),
              value: legal?.guardian.name ?? t('common.dash'),
            },
            {
              label: t('admin.student360.financialResponsible'),
              value: financial?.guardian.name ?? t('common.dash'),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.system')} />
        <DefinitionList
          items={[
            { label: t('admin.student360.studentId'), value: <span className="mono">{s.id}</span> },
            { label: t('admin.email'), value: s.email ?? t('common.dash') },
            { label: t('admin.phone'), value: s.phone ?? t('common.dash') },
            { label: t('admin.student360.createdAt'), value: formatDate(s.create_date) },
            { label: t('admin.student360.updatedAt'), value: formatDate(s.write_date) },
          ]}
        />
      </Card>

      {canManage && (
        <Card>
          <SectionHead title={t('admin.account.accountInformation')} />
          <EntityAccountPanel
            entity={s}
            entityLabel={getStudentDisplayName(s)}
            accountEndpoint={endpoints.admin.studentAccount(s.id)}
            managePermission="manage_students"
            defaultEmail={s.email ?? ''}
            onAccountChanged={onAccountChanged}
          />
        </Card>
      )}
    </div>
  );
}
