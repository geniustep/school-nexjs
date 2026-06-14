'use client';

import { Card, SectionHead } from '@/components/ui/primitives';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { displayCountryState } from '../utils/student-profile';
import { computeStudentAge } from '../utils/student-age';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { Student360FieldGrid } from './student-360-field-grid';
import { StudentStatusSummary } from './student-status-summary';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

function scrollToLoginAccount() {
  const target = document.getElementById('student-login-account');
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const createBtn = target?.querySelector<HTMLButtonElement>('.entity-account-panel__create-btn');
  createBtn?.focus();
}

export function StudentOverviewTab({
  details,
  canManage,
  showDocuments = false,
  showHealth = false,
  showFinance = false,
  onOpenTab,
  onEditProfile,
  onAccountChanged,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  showDocuments?: boolean;
  showHealth?: boolean;
  showFinance?: boolean;
  onOpenTab?: (tab: Student360TabId) => void;
  onEditProfile?: () => void;
  onAccountChanged: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const age = computeStudentAge(s.date_of_birth);

  const openTab = (tab: Student360TabId) => onOpenTab?.(tab);

  return (
    <div className="student-360-overview student-360-tab-panel">
      <StudentStatusSummary
        details={details}
        canManage={canManage}
        showDocuments={showDocuments}
        showHealth={showHealth}
        showFinance={showFinance}
        onOpenTab={(tab) => openTab(tab)}
        onEditProfile={onEditProfile}
        onCreateAccount={canManage ? scrollToLoginAccount : undefined}
      />

      <Card className="student-360-section-card" pad={false}>
        <SectionHead
          title={t('admin.student360.sections.basicInfo')}
          action={
            canManage && onEditProfile ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onEditProfile}>
                {t('common.edit')}
              </button>
            ) : null
          }
        />
        <div className="student-360-section-card__body">
          <Student360FieldGrid
            items={[
              { label: t('admin.fullName'), value: getStudentDisplayName(s) },
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
              {
                label: t('admin.massarCode'),
                value: (
                  <span className="mono" dir="auto">
                    {dash(t, s.massar_code)}
                  </span>
                ),
              },
              {
                label: t('admin.student360.schoolNumber'),
                value: (
                  <span className="mono" dir="auto">
                    {dash(t, s.school_number ?? s.code)}
                  </span>
                ),
              },
              { label: t('admin.student360.studentStatus'), value: statusLabel(t, s.status) },
            ]}
          />
        </div>
      </Card>

      <Card className="student-360-section-card" pad={false}>
        <SectionHead title={t('admin.student360.sections.currentStudy')} />
        <div className="student-360-section-card__body">
          <Student360FieldGrid
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
                value: enrollment?.state ? statusLabel(t, enrollment.state) : t('common.dash'),
              },
            ]}
          />
        </div>
      </Card>

      <Card className="student-360-section-card" pad={false}>
        <SectionHead
          title={t('admin.student360.sections.contactAndEmergency')}
          action={
            canManage && onEditProfile ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onEditProfile}>
                {t('common.edit')}
              </button>
            ) : null
          }
        />
        <div className="student-360-section-card__body">
          <div className="student-360-overview__subgroups">
            <div className="student-360-overview__subgroup">
              <h3 className="student-360-overview__subtitle">{t('admin.student360.sections.contact')}</h3>
              <Student360FieldGrid
                columns={2}
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
            </div>
            <div className="student-360-overview__subgroup">
              <h3 className="student-360-overview__subtitle">{t('admin.student360.sections.emergency')}</h3>
              <Student360FieldGrid
                columns={2}
                items={[
                  { label: t('admin.student360.emergencyContactName'), value: dash(t, s.emergency_contact_name) },
                  { label: t('admin.student360.emergencyPhone'), value: dash(t, s.emergency_phone) },
                  { label: t('admin.student360.emergencyPhoneAlt'), value: dash(t, s.emergency_phone_alt) },
                ]}
              />
            </div>
          </div>

          {canManage ? (
            <div className="student-360-overview__account" id="student-login-account">
              <h3 className="student-360-overview__subtitle">{t('admin.account.accountInformation')}</h3>
              <EntityAccountPanel
                entity={s}
                entityLabel={getStudentDisplayName(s)}
                accountEndpoint={endpoints.admin.studentAccount(s.id)}
                managePermission="manage_students"
                defaultEmail={s.email ?? ''}
                onAccountChanged={onAccountChanged}
                compact
              />
            </div>
          ) : null}
        </div>
      </Card>

      <section className="student-360-performance-compact">
        <p className="student-360-performance-compact__title">{t('admin.student360.performance.title')}</p>
        <p className="student-360-performance-compact__desc">{t('admin.student360.performance.emptyDesc')}</p>
      </section>
    </div>
  );
}
