'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { AcademicSegmentedControl } from '@/features/admin/academic-setup/components/academic-segmented-control';
import { GuardianSearchPanel } from './guardian-search-panel';
import { GuardianQuickCreateForm } from './guardian-quick-create-form';
import {
  DEFAULT_RELATIONSHIP_FORM,
  GuardianRelationshipForm,
  relationshipFormToCreatePayload,
  type RelationshipFormValues,
} from './guardian-relationship-form';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import type { GuardianSummary } from '@/types/student-360';

type Step = 'pick' | 'relationship';
type PickMode = 'search' | 'create';

export function GuardianAddDialog({
  open,
  studentId,
  onClose,
  onLinked,
}: {
  open: boolean;
  studentId: number;
  onClose: () => void;
  onLinked: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [pickMode, setPickMode] = useState<PickMode>('search');
  const [step, setStep] = useState<Step>('pick');
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianSummary | null>(null);
  const [formValues, setFormValues] = useState<RelationshipFormValues>(DEFAULT_RELATIONSHIP_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep('pick');
    setPickMode('search');
    setSelectedGuardian(null);
    setFormValues(DEFAULT_RELATIONSHIP_FORM);
    setFieldError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleGuardianPicked(guardian: GuardianSummary) {
    setSelectedGuardian(guardian);
    setStep('relationship');
    setFieldError(null);
  }

  async function linkRelationship(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuardian) return;
    setSaving(true);
    setFieldError(null);
    const payload = relationshipFormToCreatePayload(selectedGuardian.id, formValues);
    const res = await api.post(endpoints.admin.studentGuardians(studentId), payload);
    setSaving(false);

    if (res.success) {
      toast.success(t('admin.student360.guardianLinked'));
      handleClose();
      onLinked();
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    setFieldError(mapped.message);
    if (!mapped.matches?.length) {
      toast.error(mapped.message);
    }
  }

  if (!open) return null;

  return (
    <SetupDrawer
      open={open}
      title={step === 'pick' ? t('admin.student360.addGuardian') : t('admin.student360.relationshipProperties')}
      onClose={handleClose}
    >
      {step === 'pick' ? (
        <div className="col" style={{ gap: 16 }}>
          <AcademicSegmentedControl
            ariaLabel={t('admin.student360.addGuardianMode')}
            value={pickMode}
            onChange={setPickMode}
            options={[
              { value: 'search', label: t('admin.student360.searchExisting') },
              { value: 'create', label: t('admin.student360.createNew') },
            ]}
          />
          {pickMode === 'search' ? (
            <GuardianSearchPanel studentId={studentId} onSelect={handleGuardianPicked} />
          ) : (
            <GuardianQuickCreateForm onCreated={handleGuardianPicked} onSelectExisting={handleGuardianPicked} />
          )}
        </div>
      ) : (
        <form className="col" style={{ gap: 16 }} onSubmit={linkRelationship}>
          {selectedGuardian && (
            <p className="tiny muted">
              {t('admin.student360.linkingGuardian')}: <strong>{selectedGuardian.name}</strong>
            </p>
          )}
          <GuardianRelationshipForm
            values={formValues}
            onChange={setFormValues}
            fieldError={fieldError}
          />
          <div className="row" style={{ gap: 8 }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? t('common.saving') : t('admin.student360.linkGuardian')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep('pick')}>
              {t('common.back')}
            </button>
          </div>
        </form>
      )}
    </SetupDrawer>
  );
}
