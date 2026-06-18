'use client';

import type { ReactNode } from 'react';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { displayCountryState } from '../utils/student-profile';
import { computeStudentAge } from '../utils/student-age';
import { Student360FieldGrid } from './student-360-field-grid';
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

export function StudentProfileDetailPanel({
  details,
  canManage,
  onEditProfile,
  onAccountChanged,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  onEditProfile?: () => void;
  onAccountChanged: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const s = details.student;
  const age = computeStudentAge(s.date_of_birth);

  const genderLabel =
    s.gender === 'male'
      ? t('admin.male')
      : s.gender === 'female'
        ? t('admin.female')
        : dash(t, s.gender ?? undefined);

  const identityFields = [
    { label: t('admin.gender'), value: genderLabel },
    { label: t('admin.dateOfBirth'), value: formatDate(s.date_of_birth) },
    {
      label: t('admin.student360.header.age'),
      value: age != null ? t('admin.student360.header.ageYears', { age }) : t('common.dash'),
    },
    ...buildStudentRefFields(t, dash, s.school_number, s.code, s.massar_code),
  ];

  const contactFields = [
    { label: t('admin.phone'), value: dash(t, s.phone) },
    { label: t('admin.student360.mobile'), value: dash(t, s.mobile) },
    { label: t('admin.email'), value: dash(t, s.email) },
    { label: t('admin.student360.city'), value: dash(t, s.city) },
    {
      label: t('admin.student360.country'),
      value: displayCountryState(s.country) || t('common.dash'),
    },
  ];

  const emergencyFields = [
    { label: t('admin.student360.emergencyContactName'), value: dash(t, s.emergency_contact_name) },
    { label: t('admin.student360.emergencyPhone'), value: dash(t, s.emergency_phone) },
    { label: t('admin.student360.emergencyPhoneAlt'), value: dash(t, s.emergency_phone_alt) },
  ];

  return (
    <section className="student-profile-panel card" aria-labelledby="student-profile-panel-title">
      <header className="student-profile-panel__hero">
        <div className="student-profile-panel__hero-main">
          <span className="student-profile-panel__glyph" aria-hidden="true">
            ◉
          </span>
          <div>
            <p className="student-profile-panel__eyebrow">{t('admin.student360.sections.profileDetail')}</p>
            <h2 id="student-profile-panel-title" className="student-profile-panel__title">
              {t('admin.student360.sections.basicInfo')}
            </h2>
            <p className="student-profile-panel__desc">{t('admin.student360.profile.detailDesc')}</p>
          </div>
        </div>
        {canManage && onEditProfile ? (
          <button type="button" className="student-profile-panel__edit-btn" onClick={onEditProfile}>
            {t('common.edit')}
          </button>
        ) : null}
      </header>

      <div className="student-profile-panel__body">
        <article className="student-profile-panel__block student-profile-panel__block--identity">
          <h3 className="student-profile-panel__block-title">
            <span className="student-profile-panel__block-icon" aria-hidden="true">
              ◫
            </span>
            {t('admin.student360.sections.identity')}
          </h3>
          <div className="student-profile-panel__identity-grid">
            {identityFields.map((field) => (
              <div key={field.label} className="student-profile-field-chip">
                <span className="student-profile-field-chip__label">{field.label}</span>
                <span className="student-profile-field-chip__value" dir="auto">
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </article>

        <div className="student-profile-panel__duo">
          <article className="student-profile-panel__block">
            <h3 className="student-profile-panel__block-title">
              <span className="student-profile-panel__block-icon" aria-hidden="true">
                ✉
              </span>
              {t('admin.student360.sections.contact')}
            </h3>
            <Student360FieldGrid
              columns={1}
              compact
              hideEmpty
              emptyMessage={t('admin.student360.profile.noContactData')}
              items={contactFields}
            />
          </article>

          <article className="student-profile-panel__block">
            <h3 className="student-profile-panel__block-title">
              <span className="student-profile-panel__block-icon student-profile-panel__block-icon--alert" aria-hidden="true">
                ⚠
              </span>
              {t('admin.student360.sections.emergency')}
            </h3>
            <Student360FieldGrid
              columns={1}
              compact
              hideEmpty
              emptyMessage={t('admin.student360.profile.noEmergencyData')}
              items={emergencyFields}
            />
          </article>
        </div>

        {canManage ? (
          <article
            className="student-profile-panel__block student-profile-panel__block--account"
            id="student-login-account"
          >
            <h3 className="student-profile-panel__block-title">
              <span className="student-profile-panel__block-icon" aria-hidden="true">
                ◈
              </span>
              {t('admin.account.accountInformation')}
            </h3>
            <p className="student-profile-panel__block-desc">{t('admin.student360.profile.accountDesc')}</p>
            <EntityAccountPanel
              entity={s}
              entityLabel={getStudentDisplayName(s)}
              accountEndpoint={endpoints.admin.studentAccount(s.id)}
              managePermission="manage_students"
              defaultEmail={s.email ?? ''}
              onAccountChanged={onAccountChanged}
              compact
            />
          </article>
        ) : null}
      </div>
    </section>
  );
}
