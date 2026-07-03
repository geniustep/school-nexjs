'use client';

import type { ReactNode } from 'react';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { useSession } from '@/features/auth/session-context';
import { canManageStudentAccounts } from '@/lib/permissions/academic-capabilities';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { statusLabel } from '@/lib/utils/labels';
import { computeStudentAge } from '../utils/student-age';
import {
  nationalityLabel,
  refDisplayLabel,
} from '../utils/student-profile-display';
import { Student360FieldGrid } from './student-360-field-grid';
import type { StudentDetailsData } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

function monoValue(
  t: (k: string) => string,
  value: string | null | undefined,
): ReactNode {
  if (!value?.trim()) {
    return <span className="student-360-field__value--empty">{t('common.dash')}</span>;
  }
  return (
    <span className="mono" dir="auto">
      {value}
    </span>
  );
}

function ProfileBlock({
  title,
  icon,
  iconTone,
  children,
}: {
  title: string;
  icon: string;
  iconTone?: 'alert';
  children: ReactNode;
}) {
  return (
    <article className="student-profile-panel__block">
      <h3 className="student-profile-panel__block-title">
        <span
          className={[
            'student-profile-panel__block-icon',
            iconTone === 'alert' ? 'student-profile-panel__block-icon--alert' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </article>
  );
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
  const user = useSession();
  const canManageAccount = canManageStudentAccounts(user);
  const { formatDate } = useFormat();
  const s = details.student;
  const age = computeStudentAge(s.date_of_birth);

  const genderLabel =
    s.gender === 'male'
      ? t('admin.male')
      : s.gender === 'female'
        ? t('admin.female')
        : dash(t, s.gender ?? undefined);

  const nameFields = [
    { label: t('admin.firstName'), value: dash(t, s.first_name) },
    { label: t('admin.lastName'), value: dash(t, s.last_name) },
    { label: t('admin.student360.nameAr'), value: dash(t, s.name_ar) },
    {
      label: t('admin.student360.nameLatin'),
      value: s.name_latin?.trim() ? (
        <span dir="ltr">{s.name_latin}</span>
      ) : (
        t('common.dash')
      ),
    },
  ];

  const identityFields = [
    { label: t('admin.gender'), value: genderLabel },
    { label: t('admin.dateOfBirth'), value: formatDate(s.date_of_birth) },
    {
      label: t('admin.student360.header.age'),
      value: age != null ? t('admin.student360.header.ageYears', { age }) : t('common.dash'),
    },
    { label: t('admin.student360.birthPlace'), value: dash(t, s.birth_place) },
    { label: t('admin.student360.nationality'), value: dash(t, nationalityLabel(s) || undefined) },
    { label: t('admin.massarCode'), value: monoValue(t, s.massar_code) },
    {
      label: t('admin.student360.schoolNumber'),
      value: monoValue(t, s.school_number),
    },
    { label: t('admin.studentCode'), value: monoValue(t, s.code) },
    { label: t('admin.student360.studentStatus'), value: statusLabel(t, s.status) },
  ];

  const contactFields = [
    { label: t('admin.phone'), value: dash(t, s.phone) },
    { label: t('admin.student360.mobile'), value: dash(t, s.mobile) },
    { label: t('admin.email'), value: dash(t, s.email) },
    { label: t('admin.student360.street'), value: dash(t, s.street) },
    { label: t('admin.student360.district'), value: dash(t, s.district) },
    { label: t('admin.student360.city'), value: dash(t, s.city) },
    { label: t('admin.student360.zip'), value: dash(t, s.zip) },
    {
      label: t('admin.student360.country'),
      value: refDisplayLabel(s.country) || t('common.dash'),
    },
    {
      label: t('admin.student360.state'),
      value: refDisplayLabel(s.state) || t('common.dash'),
    },
  ];

  const emergencyFields = [
    { label: t('admin.student360.emergencyContactName'), value: dash(t, s.emergency_contact_name) },
    { label: t('admin.student360.emergencyRelationship'), value: dash(t, s.emergency_relationship) },
    { label: t('admin.student360.emergencyPhone'), value: dash(t, s.emergency_phone) },
    { label: t('admin.student360.emergencyPhoneAlt'), value: dash(t, s.emergency_phone_alt) },
    { label: t('admin.student360.emergencyNotes'), value: dash(t, s.emergency_notes) },
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
              {getStudentDisplayName(s)}
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
        <ProfileBlock title={t('admin.student360.sections.basicInfo')} icon="◫">
          <div className="student-profile-panel__identity-grid student-profile-panel__identity-grid--names">
            {nameFields.map((field) => (
              <div key={field.label} className="student-profile-field-chip">
                <span className="student-profile-field-chip__label">{field.label}</span>
                <span className="student-profile-field-chip__value" dir="auto">
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </ProfileBlock>

        <ProfileBlock title={t('admin.student360.sections.identity')} icon="◎">
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
        </ProfileBlock>

        <div className="student-profile-panel__duo">
          <ProfileBlock title={t('admin.student360.sections.contact')} icon="✉">
            <Student360FieldGrid columns={2} compact items={contactFields} />
          </ProfileBlock>

          <ProfileBlock title={t('admin.student360.sections.emergency')} icon="⚠" iconTone="alert">
            <Student360FieldGrid
              columns={1}
              compact
              hideEmpty
              emptyMessage={t('admin.student360.profile.noEmergencyData')}
              items={emergencyFields}
            />
          </ProfileBlock>
        </div>

        {canManageAccount ? (
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
