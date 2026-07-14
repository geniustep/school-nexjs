'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import { patchAdmissionRequestedServices } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  dedupeRequestedServiceIds,
  isAdmissionRequestedServicesLocked,
  mapAdmissionRequestedServicesError,
} from '../utils/admission-requested-services';
import { AdmissionRequestedServicesChips } from './admission-requested-services-chips';
import { AdmissionRequestedServicesPicker } from './admission-requested-services-picker';

export function AdmissionRequestedServicesSection({
  detail,
  canEdit,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const locked = isAdmissionRequestedServicesLocked(detail);
  const editable = canEdit && !locked;

  const currentIds = dedupeRequestedServiceIds(
    detail.requested_service_ids ?? detail.requested_services?.map((s) => s.id) ?? [],
  );

  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<number[]>(currentIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraftIds(currentIds);
      setError(null);
    }
  }, [currentIds, editing]);

  async function handleSave() {
    if (activeSchoolId == null || locked) return;
    setSaving(true);
    setError(null);
    const res = await patchAdmissionRequestedServices(detail.id, draftIds, {
      active_school_id: activeSchoolId,
    });
    setSaving(false);
    if (res.success) {
      toast.success(t('admin.admissions.requestedServices.saved'));
      setEditing(false);
      onUpdated();
      return;
    }
    const code = typeof res.error?.code === 'string' ? res.error.code : undefined;
    const mapped = mapAdmissionRequestedServicesError(code, t);
    const unknown = t('admin.admissions.requestedServices.errors.unknown');
    const fallback = admissionApiErrorMessage(res.error, t);
    setError(mapped !== unknown ? mapped : fallback || mapped);
  }

  return (
    <section
      className="card admissions-overview-card admissions-overview-card--full admission-requested-services-section"
      data-testid="admission-requested-services-section"
    >
      <div className="admission-requested-services-section__head">
        <h2 className="admissions-overview-card__title">
          {t('admin.admissions.requestedServices.title')}
        </h2>
        {editable && !editing ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setDraftIds(currentIds);
              setError(null);
              setEditing(true);
            }}
          >
            {t('admin.admissions.requestedServices.edit')}
          </button>
        ) : null}
      </div>

      <p className="muted tiny admission-requested-services-section__hint">
        {t('admin.admissions.requestedServices.hintNoFinance')}
      </p>

      {locked ? (
        <p className="muted tiny" data-testid="admission-requested-services-locked-note">
          {t('admin.admissions.requestedServices.lockedNote')}
        </p>
      ) : null}

      {editing && editable ? (
        <div className="admission-requested-services-section__editor">
          <AdmissionRequestedServicesPicker
            selectedIds={draftIds}
            onChange={setDraftIds}
            disabled={saving}
          />
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="admission-requested-services-section__actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {t('admin.admissions.requestedServices.save')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setEditing(false);
                setDraftIds(currentIds);
                setError(null);
              }}
              disabled={saving}
            >
              {t('admin.admissions.requestedServices.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <AdmissionRequestedServicesChips services={detail.requested_services} maxVisible={6} />
      )}
    </section>
  );
}
