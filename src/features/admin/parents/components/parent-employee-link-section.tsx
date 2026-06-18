'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { GuardianSearchPanel } from '@/features/admin/students/components/guardian-search-panel';
import { canLinkPersonAsGuardian } from '@/features/admin/students/utils/guardian-profile-contract';
import { formatMoroccanPhoneDisplay } from '@/features/admin/students/utils/normalize-moroccan-phone';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import {
  linkPartnerAsGuardian,
  normalizeGuardianLinkPartnerResponse,
} from '../utils/guardian-link-partner';
import { mapGuardianLinkPartnerError } from '../utils/map-guardian-link-partner-error';
import {
  buildLinkPartnerPayload,
  resolveGuardianIdFromLinkResponse,
} from '../utils/normalize-guardian-link-partner';
import {
  formatExistingPersonRoles,
  parentEmployeeLinkSearchLabels,
} from '../utils/parent-employee-link-presentation';
import type { PersonSearchResult } from '@/types/student-360';
import '@/features/admin/students/components/guardian-flow.css';

const LANGUAGE_CODES = ['ar', 'fr', 'en', 'es'] as const;

export function ParentEmployeeLinkSection({
  onLinked,
  onCancel,
}: {
  onLinked: (guardianId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState('ar');
  const [notificationOptIn, setNotificationOptIn] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const searchLabels = parentEmployeeLinkSearchLabels(t);

  function handleSelect(person: PersonSearchResult) {
    setSelectedPerson(person);
    setLinkError(null);
  }

  async function submitLink() {
    if (!selectedPerson || linking) return;

    const canLink = canLinkPersonAsGuardian(selectedPerson, false);
    if (!canLink) {
      setLinkError(t('admin.parents.employeeLink.errors.forbidden'));
      return;
    }

    setLinking(true);
    setLinkError(null);

    const res = await linkPartnerAsGuardian(
      buildLinkPartnerPayload({
        partnerId: selectedPerson.partner_id,
        preferredLanguage,
        notificationOptIn,
      }),
    );

    setLinking(false);

    if (res.success) {
      const normalized = normalizeGuardianLinkPartnerResponse(res.data);
      const guardianId = resolveGuardianIdFromLinkResponse(normalized);
      if (guardianId == null) {
        setLinkError(t('admin.parents.employeeLink.errors.linkFailed'));
        toast.error(t('admin.parents.employeeLink.errors.linkFailed'));
        return;
      }
      toast.success(t('admin.parents.employeeLink.linkedSuccess'));
      onLinked(guardianId);
      return;
    }

    const message = mapGuardianLinkPartnerError(res.error, t);
    setLinkError(message);
    toast.error(message);
  }

  const roleLine =
    formatRoleLabels(selectedPerson?.role_labels) ||
    formatExistingPersonRoles(t, selectedPerson?.existing_roles);

  return (
    <div className="parent-employee-link col" style={{ gap: 16 }}>
      <SectionHead title={t('admin.parents.employeeLink.sectionTitle')} />

      <GuardianSearchPanel
        onSelect={handleSelect}
        showArchivedToggle={false}
        showCreateOnEmpty={false}
        labels={searchLabels}
      />

      {selectedPerson ? (
        <div className="guardian-selected-summary parent-employee-link__selected" role="status">
          <p className="tiny muted">{t('admin.student360.selectedPerson')}</p>
          <strong dir="auto">{selectedPerson.name}</strong>
          {selectedPerson.phone ? (
            <span className="tiny mono" dir="ltr">
              {formatMoroccanPhoneDisplay(selectedPerson.phone)}
            </span>
          ) : null}
          {selectedPerson.email ? (
            <span className="tiny" dir="ltr">
              {selectedPerson.email}
            </span>
          ) : null}
          {roleLine ? (
            <p className="tiny muted">
              {t('admin.parentProfile.currentRoles')}: {roleLine}
            </p>
          ) : null}
          {!canLinkPersonAsGuardian(selectedPerson, false) ? (
            <p className="tiny guardian-create-field__error">
              {t('admin.parents.employeeLink.errors.forbidden')}
            </p>
          ) : (
            <div className="guardian-account-reuse-note">
              <p>{t('admin.parents.employeeLink.selectedWarning')}</p>
            </div>
          )}
        </div>
      ) : null}

      {selectedPerson && canLinkPersonAsGuardian(selectedPerson, false) ? (
        <div className="parent-employee-link__prefs row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="col" style={{ gap: 4, minWidth: 160 }}>
            <span className="tiny muted">{t('admin.preferredLanguage')}</span>
            <select
              className="input"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              disabled={linking}
            >
              {LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>
                  {t(`admin.preferredLanguages.${code}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 20 }}>
            <input
              type="checkbox"
              checked={notificationOptIn}
              onChange={(e) => setNotificationOptIn(e.target.checked)}
              disabled={linking}
            />
            <span className="tiny">{t('admin.notificationOptIn')}</span>
          </label>
        </div>
      ) : null}

      {linkError ? (
        <p className="tiny guardian-create-field__error" role="alert">
          {linkError}
        </p>
      ) : null}

      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={
            !selectedPerson ||
            linking ||
            !canLinkPersonAsGuardian(selectedPerson, false)
          }
          onClick={submitLink}
        >
          {linking ? t('admin.student360.linkingPersonProgress') : t('admin.parents.employeeLink.linkButton')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={linking}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
