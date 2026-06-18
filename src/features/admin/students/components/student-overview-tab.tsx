'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Card, SectionHead } from '@/components/ui/primitives';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useStudentFinancialOverview } from '@/features/admin/student-finance/hooks/use-student-financial-overview';
import { resolveFinanceYearId } from '@/features/admin/student-finance/utils/resolve-finance-year-id';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { displayCountryState } from '../utils/student-profile';
import { computeStudentAge } from '../utils/student-age';
import { Student360FieldGrid } from './student-360-field-grid';
import { StudentStatusSummary } from './student-status-summary';
import { StudentOverviewAlerts } from './student-overview-alerts';
import { StudentOverviewCards } from './student-overview-cards';
import type { StudentOverviewData } from '@/types/student-overview';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

function buildStudentRefFields(
  t: (k: string) => string,
  dashFn: typeof dash,
  schoolNumber: string | null | undefined,
  code: string | null | undefined,
  massarCode: string | null | undefined,
): Array<{ label: string; value: ReactNode }> {
  const massar = massarCode?.trim() || '';
  const school = (schoolNumber ?? code)?.trim() || '';

  if (massar && school && massar === school) {
    return [
      {
        label: t('admin.student360.schoolNumber'),
        value: (
          <span className="mono" dir="auto">
            {massar}
          </span>
        ),
      },
    ];
  }

  const items: Array<{ label: string; value: ReactNode }> = [];
  if (massar) {
    items.push({
      label: t('admin.massarCode'),
      value: (
        <span className="mono" dir="auto">
          {massar}
        </span>
      ),
    });
  }
  if (school && school !== massar) {
    items.push({
      label: t('admin.student360.schoolNumber'),
      value: (
        <span className="mono" dir="auto">
          {school}
        </span>
      ),
    });
  }
  if (items.length === 0) {
    items.push({
      label: t('admin.student360.schoolNumber'),
      value: (
        <span className="mono student-360-field__value--empty" dir="auto">
          {dashFn(t, undefined)}
        </span>
      ),
    });
  }
  return items;
}

function scrollToLoginAccount() {
  const target = document.getElementById('student-login-account');
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const createBtn = target?.querySelector<HTMLButtonElement>('.entity-account-panel__create-btn');
  createBtn?.focus();
}

export function StudentOverviewTab({
  studentId,
  details,
  overview,
  overviewLoading,
  overviewEndpointUnavailable,
  canManage,
  showDocuments = false,
  showHealth = false,
  showFinance = false,
  setupMode = false,
  onOpenTab,
  onEditProfile,
  onAccountChanged,
}: {
  studentId: string;
  details: StudentDetailsData;
  overview: StudentOverviewData | null;
  overviewLoading: boolean;
  overviewEndpointUnavailable: boolean;
  canManage: boolean;
  showDocuments?: boolean;
  showHealth?: boolean;
  showFinance?: boolean;
  setupMode?: boolean;
  onOpenTab?: (tab: Student360TabId, options?: { financeSubTab?: string }) => void;
  onEditProfile?: () => void;
  onAccountChanged: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const s = details.student;
  const age = computeStudentAge(s.date_of_birth);
  const financeRefState = useFinanceReferenceData();
  const financeYearId = useMemo(
    () => resolveFinanceYearId(details, financeRefState.academicYears, ''),
    [details, financeRefState.academicYears],
  );
  const financialOverviewState = useStudentFinancialOverview(
    studentId,
    financeYearId,
    showFinance && !!financeYearId,
  );

  const openTab = (tab: Student360TabId, options?: { financeSubTab?: string }) =>
    onOpenTab?.(tab, options);

  const schoolingWarnings = [
    ...(overview?.schooling?.gaps ?? []),
    ...(overview?.schooling?.warnings ?? []),
  ];

  return (
    <div className="student-360-overview student-360-tab-panel">
      <StudentOverviewAlerts alerts={overview?.alerts ?? []} onOpenTab={(tab) => openTab(tab)} />

      {schoolingWarnings.length > 0 ? (
        <div className="student-360-overview__schooling-notes" role="status">
          <ul className="student-overview-card__warnings">
            {schoolingWarnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <StudentStatusSummary
        details={details}
        financialOverview={financialOverviewState.data}
        canManage={canManage}
        showDocuments={showDocuments}
        showHealth={showHealth}
        showFinance={showFinance}
        setupMode={setupMode}
        onOpenTab={(tab, options) => openTab(tab, options)}
        onEditProfile={onEditProfile}
        onCreateAccount={canManage ? scrollToLoginAccount : undefined}
      />

      <StudentOverviewCards
        overview={overview}
        loading={overviewLoading}
        endpointUnavailable={overviewEndpointUnavailable}
      />

      <Card className="student-360-section-card student-360-profile-sheet" pad={false}>
        <SectionHead
          title={t('admin.student360.sections.profileDetail')}
          action={
            canManage && onEditProfile ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onEditProfile}>
                {t('common.edit')}
              </button>
            ) : null
          }
        />
        <div className="student-360-section-card__body student-360-profile-sheet">
          <section className="student-360-profile-sheet__panel student-360-profile-sheet__panel--identity">
            <h3 className="student-360-profile-sheet__title">{t('admin.student360.sections.basicInfo')}</h3>
            <Student360FieldGrid
              columns={2}
              compact
              items={[
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
                {
                  label: t('admin.student360.header.age'),
                  value: age != null ? t('admin.student360.header.ageYears', { age }) : t('common.dash'),
                },
                ...buildStudentRefFields(t, dash, s.school_number, s.code, s.massar_code),
              ]}
            />
          </section>

          <div className="student-360-profile-sheet__duo">
            <section className="student-360-profile-sheet__panel">
              <h3 className="student-360-profile-sheet__title">{t('admin.student360.sections.contact')}</h3>
              <Student360FieldGrid
                columns={1}
                compact
                hideEmpty
                emptyMessage={t('admin.student360.profile.noContactData')}
                items={[
                  { label: t('admin.phone'), value: dash(t, s.phone) },
                  { label: t('admin.student360.mobile'), value: dash(t, s.mobile) },
                  { label: t('admin.email'), value: dash(t, s.email) },
                  { label: t('admin.student360.city'), value: dash(t, s.city) },
                  {
                    label: t('admin.student360.country'),
                    value: displayCountryState(s.country) || t('common.dash'),
                  },
                ]}
              />
            </section>

            <section className="student-360-profile-sheet__panel">
              <h3 className="student-360-profile-sheet__title">{t('admin.student360.sections.emergency')}</h3>
              <Student360FieldGrid
                columns={1}
                compact
                hideEmpty
                emptyMessage={t('admin.student360.profile.noEmergencyData')}
                items={[
                  { label: t('admin.student360.emergencyContactName'), value: dash(t, s.emergency_contact_name) },
                  { label: t('admin.student360.emergencyPhone'), value: dash(t, s.emergency_phone) },
                  { label: t('admin.student360.emergencyPhoneAlt'), value: dash(t, s.emergency_phone_alt) },
                ]}
              />
            </section>
          </div>

          {canManage ? (
            <section className="student-360-profile-sheet__panel student-360-profile-sheet__panel--account" id="student-login-account">
              <div className="student-360-profile-sheet__account-head">
                <h3 className="student-360-profile-sheet__title">{t('admin.account.accountInformation')}</h3>
              </div>
              <EntityAccountPanel
                entity={s}
                entityLabel={getStudentDisplayName(s)}
                accountEndpoint={endpoints.admin.studentAccount(s.id)}
                managePermission="manage_students"
                defaultEmail={s.email ?? ''}
                onAccountChanged={onAccountChanged}
                compact
              />
            </section>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
