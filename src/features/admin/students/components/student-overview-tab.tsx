'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { displayCountryState } from '../utils/student-profile';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { isRelationshipActive } from '../utils/relationship-types';
import { StudentFinanceOverviewCard } from './student-finance-overview-card';
import type { StudentDetailsData } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

export function StudentOverviewTab({
  details,
  canManage,
  showDocuments = false,
  showHealth = false,
  showFinance = false,
  onOpenTab,
  onAccountChanged,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  showDocuments?: boolean;
  showHealth?: boolean;
  showFinance?: boolean;
  onOpenTab?: (tab: 'documents' | 'health' | 'finance') => void;
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

  const hasContact = !!(s.phone || s.mobile || s.email || s.street || s.city || s.zip);
  const hasEmergency = !!(
    s.emergency_contact_name ||
    s.emergency_phone ||
    s.emergency_phone_alt
  );

  return (
    <div className="grid grid--cards student-360-overview">
      <Card>
        <SectionHead title={t('admin.student360.sections.identity')} />
        <DefinitionList
          items={[
            { label: t('admin.personalName'), value: dash(t, s.first_name) },
            { label: t('admin.familyName'), value: dash(t, s.last_name) },
            { label: t('admin.fullName'), value: getStudentDisplayName(s) },
            { label: t('admin.student360.nameAr'), value: dash(t, s.name_ar) },
            { label: t('admin.student360.nameLatin'), value: dash(t, s.name_latin) },
            {
              label: t('admin.gender'),
              value:
                s.gender === 'male'
                  ? t('admin.male')
                  : s.gender === 'female'
                    ? t('admin.female')
                    : dash(t, s.gender ?? undefined),
            },
            { label: t('admin.dateOfBirth'), value: formatDate(s.date_of_birth) },
            { label: t('admin.student360.birthPlace'), value: dash(t, s.birth_place) },
            {
              label: t('admin.student360.nationality'),
              value: s.nationality?.name ?? t('common.dash'),
            },
            { label: t('admin.massarCode'), value: <span className="mono">{dash(t, s.massar_code)}</span> },
            {
              label: t('admin.student360.schoolNumber'),
              value: <span className="mono">{dash(t, s.school_number ?? s.code)}</span>,
            },
            { label: t('admin.student360.studentStatus'), value: dash(t, String(s.status)) },
            { label: t('admin.admissionDate'), value: formatDate(s.admission_date) },
            {
              label: t('admin.student360.departureReason'),
              value: dash(t, s.departure_reason ?? enrollment?.departure_reason),
            },
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
            { label: t('admin.student360.enrollmentState'), value: enrollment?.state ?? t('common.dash') },
          ]}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.contact')} />
        {hasContact ? (
          <DefinitionList
            items={[
              { label: t('admin.phone'), value: dash(t, s.phone) },
              { label: t('admin.student360.mobile'), value: dash(t, s.mobile) },
              { label: t('admin.email'), value: dash(t, s.email) },
              { label: t('admin.student360.street'), value: dash(t, s.street) },
              { label: t('admin.student360.district'), value: dash(t, s.district) },
              { label: t('admin.student360.city'), value: dash(t, s.city) },
              { label: t('admin.student360.zip'), value: dash(t, s.zip) },
              { label: t('admin.student360.country'), value: displayCountryState(s.country) || t('common.dash') },
              { label: t('admin.student360.state'), value: displayCountryState(s.state) || t('common.dash') },
            ]}
          />
        ) : (
          <p className="tiny muted">{t('admin.student360.emptyContact')}</p>
        )}
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.emergency')} />
        {hasEmergency ? (
          <DefinitionList
            items={[
              { label: t('admin.student360.emergencyContactName'), value: dash(t, s.emergency_contact_name) },
              {
                label: t('admin.student360.emergencyRelationship'),
                value: dash(t, s.emergency_relationship),
              },
              { label: t('admin.student360.emergencyPhone'), value: dash(t, s.emergency_phone) },
              { label: t('admin.student360.emergencyPhoneAlt'), value: dash(t, s.emergency_phone_alt) },
              { label: t('admin.student360.emergencyNotes'), value: dash(t, s.emergency_notes) },
            ]}
          />
        ) : (
          <p className="tiny muted">{t('admin.student360.emptyEmergency')}</p>
        )}
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.family')} />
        <DefinitionList
          items={[
            { label: t('admin.student360.activeGuardiansCount'), value: String(activeRels.length) },
            { label: t('admin.student360.primaryContact'), value: primary?.guardian.name ?? t('common.dash') },
            { label: t('admin.student360.legalGuardian'), value: legal?.guardian.name ?? t('common.dash') },
            { label: t('admin.student360.financialResponsible'), value: financial?.guardian.name ?? t('common.dash') },
          ]}
        />
      </Card>

      {showDocuments && details.document_summary ? (
        <Card>
          <SectionHead
            title={t('admin.student360.documents.summaryTitle')}
            action={
              onOpenTab ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onOpenTab('documents')}
                >
                  {t('admin.student360.documents.openTab')}
                </button>
              ) : null
            }
          />
          <DefinitionList
            items={[
              {
                label: t('admin.student360.documents.summaryTotal'),
                value: String(details.document_summary.total),
              },
              {
                label: t('admin.student360.documents.summaryExpired'),
                value: String(details.document_summary.expired),
              },
              {
                label: t('admin.student360.documents.summaryMissing'),
                value: String(details.document_summary.missing_required),
              },
            ]}
          />
        </Card>
      ) : null}

      {showHealth && details.health_summary ? (
        <Card>
          <SectionHead
            title={t('admin.student360.health.summaryTitle')}
            action={
              onOpenTab ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onOpenTab('health')}
                >
                  {t('admin.student360.health.openTab')}
                </button>
              ) : null
            }
          />
          <DefinitionList
            items={[
              {
                label: t('admin.student360.health.hasProfile'),
                value: details.health_summary.has_profile
                  ? t('common.yes')
                  : t('common.no'),
              },
              ...(details.health_summary.has_critical_alert
                ? [
                    {
                      label: t('admin.student360.health.criticalAlert'),
                      value: t('common.yes'),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      ) : null}

      {showFinance && details.finance_summary ? (
        <StudentFinanceOverviewCard
          summary={details.finance_summary}
          onOpenFinance={onOpenTab ? () => onOpenTab('finance') : undefined}
        />
      ) : null}

      <Card>
        <SectionHead title={t('admin.student360.sections.system')} />
        <DefinitionList
          items={[
            { label: t('admin.student360.studentId'), value: <span className="mono">{s.id}</span> },
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
