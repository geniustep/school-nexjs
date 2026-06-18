'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { getGuardianEmailPresentation } from '../utils/guardian-email-presentation';
import { formatMoroccanPhoneDisplay, validateMoroccanPhone } from '../utils/normalize-moroccan-phone';
import type { RelationshipFormValues } from './guardian-relationship-form';

export interface PersonContactInfo {
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
}

function hasValidPhone(contact: PersonContactInfo): boolean {
  return validateMoroccanPhone(contact.mobile ?? '') || validateMoroccanPhone(contact.phone ?? '');
}

function hasValidEmail(contact: PersonContactInfo): boolean {
  const presentation = getGuardianEmailPresentation(contact.email);
  return presentation.kind === 'usable';
}

export function GuardianRelationshipImpactAlert({
  values,
  initialValues,
  personContact,
  currentPrimaryName,
  parentProfileHref,
  financialImpactMessage,
  inDialog = false,
}: {
  values: RelationshipFormValues;
  initialValues?: RelationshipFormValues;
  personContact: PersonContactInfo;
  currentPrimaryName?: string | null;
  parentProfileHref?: string;
  financialImpactMessage?: string | null;
  inDialog?: boolean;
}) {
  const t = useT();
  const alerts: React.ReactNode[] = [];

  if (
    values.is_primary_contact &&
    currentPrimaryName &&
    (!initialValues || !initialValues.is_primary_contact)
  ) {
    alerts.push(
      <div key="primary" className="guardian-relationship-impact" role="status">
        <p>{t('admin.parentProfile.primaryGuardianReplaceWarning', { name: currentPrimaryName })}</p>
      </div>,
    );
  }

  const financialChanged =
    initialValues != null
      ? values.is_financial_responsible !== initialValues.is_financial_responsible
      : values.is_financial_responsible;

  if (financialChanged && (financialImpactMessage || values.is_financial_responsible)) {
    alerts.push(
      <div key="financial" className="guardian-relationship-impact" role="status">
        <p>{financialImpactMessage ?? t('admin.parentProfile.financialResponsibleImpact')}</p>
      </div>,
    );
  }

  if (values.is_emergency_contact && !hasValidPhone(personContact)) {
    alerts.push(
      <div key="emergency" className="guardian-relationship-impact guardian-relationship-impact--warn" role="alert">
        <p>{t('admin.parentProfile.emergencyContactPhoneRequired')}</p>
      </div>,
    );
  }

  if (values.receives_notifications && !hasValidPhone(personContact) && !hasValidEmail(personContact)) {
    alerts.push(
      <div key="notifications" className="guardian-relationship-impact guardian-relationship-impact--warn" role="alert">
        <p>{t('admin.parentProfile.notificationsContactMissing')}</p>
        {!inDialog && parentProfileHref ? (
          <Link href={parentProfileHref} className="btn btn--ghost btn--sm">
            {t('admin.parentProfile.editParentContact')}
          </Link>
        ) : null}
      </div>,
    );
  }

  if (!alerts.length) return null;

  return <div className="guardian-relationship-impact-list">{alerts}</div>;
}

export function formatPersonContactLine(contact: PersonContactInfo): string | null {
  const phone = contact.phone?.trim();
  const mobile = contact.mobile?.trim();
  if (phone && mobile && formatMoroccanPhoneDisplay(phone) === formatMoroccanPhoneDisplay(mobile)) {
    return formatMoroccanPhoneDisplay(phone);
  }
  if (mobile) return formatMoroccanPhoneDisplay(mobile);
  if (phone) return formatMoroccanPhoneDisplay(phone);
  return null;
}
