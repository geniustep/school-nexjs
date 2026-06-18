'use client';

import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatHealthTriStateValue } from '../utils/normalize-student-health';
import type { StudentHealthProfile } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

function HealthField({
  label,
  value,
  critical = false,
}: {
  label: string;
  value: string;
  critical?: boolean;
}) {
  const t = useT();
  const empty = !value?.trim() || value === t('common.dash');

  return (
    <div
      className={[
        'student-health-field',
        critical ? 'student-health-field--critical' : '',
        empty ? 'student-health-field--empty' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="student-health-field__head">
        <span className="student-health-field__label">{label}</span>
        {critical && !empty ? (
          <span className="student-health-field__badge">{t('admin.student360.health.criticalFieldBadge')}</span>
        ) : null}
      </div>
      <span className="student-health-field__value" dir="auto">
        {value}
      </span>
    </div>
  );
}

export function StudentHealthProfileView({
  profile,
  bloodTypeLabel,
  criticalFieldKeys,
  showCriticalStyling,
}: {
  profile: StudentHealthProfile;
  bloodTypeLabel: string;
  criticalFieldKeys: Set<string>;
  showCriticalStyling: boolean;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const isFieldCritical = (fieldKey: string) =>
    showCriticalStyling && criticalFieldKeys.has(fieldKey);

  const basicFields = [
    { key: 'blood_type', label: t('admin.student360.health.bloodType'), value: bloodTypeLabel, critical: false },
    {
      key: 'allergies',
      label: t('admin.student360.health.allergies'),
      value: formatHealthTriStateValue(profile.has_allergies, profile.allergies_description, t),
      critical: isFieldCritical('allergies'),
    },
    {
      key: 'chronic_conditions',
      label: t('admin.student360.health.chronicConditions'),
      value: formatHealthTriStateValue(
        profile.has_chronic_conditions,
        profile.chronic_conditions_description,
        t,
      ),
      critical: isFieldCritical('chronic_conditions'),
    },
    {
      key: 'regular_medication',
      label: t('admin.student360.health.regularMedications'),
      value: formatHealthTriStateValue(
        profile.has_regular_medication,
        profile.regular_medication_description,
        t,
      ),
      critical: isFieldCritical('regular_medication') || isFieldCritical('regular_medications'),
    },
    {
      key: 'special_needs',
      label: t('admin.student360.health.specialNeeds'),
      value: formatHealthTriStateValue(profile.has_special_needs, profile.special_needs_description, t),
      critical: isFieldCritical('special_needs'),
    },
  ];

  const emergencyFields = [
    {
      key: 'emergency_instructions',
      label: t('admin.student360.health.emergencyInstructions'),
      value: formatHealthTriStateValue(
        profile.has_emergency_instructions,
        profile.emergency_instructions,
        t,
      ),
      critical: isFieldCritical('emergency_instructions') || isFieldCritical('health_emergency_instructions'),
    },
    { key: 'doctor_name', label: t('admin.student360.health.doctorName'), value: dash(t, profile.doctor_name), critical: false },
    { key: 'doctor_phone', label: t('admin.student360.health.doctorPhone'), value: dash(t, profile.doctor_phone), critical: false },
  ];

  const insuranceFields = [
    {
      key: 'insurance_provider',
      label: t('admin.student360.health.insuranceProvider'),
      value: dash(t, profile.insurance_provider),
    },
    {
      key: 'insurance_number',
      label: t('admin.student360.health.insuranceNumber'),
      value: dash(t, profile.insurance_number),
    },
    {
      key: 'insurance_expiry_date',
      label: t('admin.student360.health.insuranceExpiry'),
      value: formatDate(profile.insurance_expiry_date) || t('common.dash'),
    },
  ];

  const notes = dash(t, profile.notes);

  return (
    <div className="student-health-profile">
      <article className="student-health-profile__block">
        <h3 className="student-health-profile__block-title">
          <span className="student-health-profile__block-icon" aria-hidden="true">
            ✚
          </span>
          {t('admin.student360.health.sections.basic')}
        </h3>
        <div className="student-health-profile__fields">
          {basicFields.map((field) => (
            <HealthField
              key={field.key}
              label={field.label}
              value={field.value}
              critical={field.critical}
            />
          ))}
        </div>
      </article>

      <div className="student-health-profile__duo">
        <article className="student-health-profile__block">
          <h3 className="student-health-profile__block-title">
            <span
              className="student-health-profile__block-icon student-health-profile__block-icon--alert"
              aria-hidden="true"
            >
              ⚠
            </span>
            {t('admin.student360.health.sections.emergency')}
          </h3>
          <div className="student-health-profile__fields">
            {emergencyFields.map((field) => (
              <HealthField
                key={field.key}
                label={field.label}
                value={field.value}
                critical={field.critical}
              />
            ))}
          </div>
        </article>

        <article className="student-health-profile__block">
          <h3 className="student-health-profile__block-title">
            <span className="student-health-profile__block-icon" aria-hidden="true">
              ▣
            </span>
            {t('admin.student360.health.sections.insurance')}
          </h3>
          <div className="student-health-profile__fields">
            {insuranceFields.map((field) => (
              <HealthField key={field.key} label={field.label} value={field.value} />
            ))}
          </div>
        </article>
      </div>

      <article className="student-health-profile__block student-health-profile__block--notes">
        <h3 className="student-health-profile__block-title">
          <span className="student-health-profile__block-icon" aria-hidden="true">
            ✎
          </span>
          {t('admin.student360.health.sections.notes')}
        </h3>
        <p className="student-health-profile__notes" dir="auto">
          {notes}
        </p>
      </article>
    </div>
  );
}
