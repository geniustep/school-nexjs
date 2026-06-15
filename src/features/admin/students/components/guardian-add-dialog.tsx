'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
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
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import { isRelationshipActive } from '../utils/relationship-types';
import type { GuardianRelationship, GuardianSummary } from '@/types/student-360';
import './guardian-flow.css';

type Step = 'pick' | 'relationship' | 'success' | 'partial';
type PickMode = 'search' | 'create';

export function GuardianAddDialog({
  open,
  studentId,
  relationships,
  onClose,
  onLinked,
}: {
  open: boolean;
  studentId: number;
  relationships: GuardianRelationship[];
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
  const [createPrefill, setCreatePrefill] = useState<{ query?: string }>({});
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingPrimaryConfirm, setPendingPrimaryConfirm] = useState(false);

  const linkedGuardianIds = useMemo(
    () =>
      new Set(
        relationships
          .filter((r) => isRelationshipActive(r.state, r.active))
          .map((r) => r.guardian.id),
      ),
    [relationships],
  );

  const currentPrimary = useMemo(
    () =>
      relationships.find(
        (r) => isRelationshipActive(r.state, r.active) && r.is_primary_contact,
      ) ?? null,
    [relationships],
  );

  function reset() {
    setStep('pick');
    setPickMode('search');
    setSelectedGuardian(null);
    setFormValues(DEFAULT_RELATIONSHIP_FORM);
    setFieldError(null);
    setSaving(false);
    setCreatePrefill({});
    setAccountDialogOpen(false);
    setPendingPrimaryConfirm(false);
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

  function switchToCreate(prefill: { query?: string }) {
    setCreatePrefill(prefill);
    setPickMode('create');
  }

  async function linkRelationship(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedGuardian) return;

    if (
      formValues.is_primary_contact &&
      currentPrimary &&
      currentPrimary.guardian.id !== selectedGuardian.id &&
      !pendingPrimaryConfirm
    ) {
      setPendingPrimaryConfirm(true);
      return;
    }

    setSaving(true);
    setFieldError(null);
    const payload = relationshipFormToCreatePayload(selectedGuardian.id, formValues);
    const res = await api.post(endpoints.admin.studentGuardians(studentId), payload);
    setSaving(false);
    setPendingPrimaryConfirm(false);

    if (res.success) {
      toast.success(t('admin.student360.guardianLinked'));
      setStep('success');
      onLinked();
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    setFieldError(mapped.message);
    setStep('partial');
    toast.error(mapped.message);
  }

  async function retryLinkOnly() {
    if (!selectedGuardian) return;
    await linkRelationship();
  }

  function finishSuccess() {
    handleClose();
  }

  const drawerTitle =
    step === 'pick'
      ? t('admin.student360.addGuardian')
      : step === 'relationship'
        ? t('admin.student360.relationshipStepTitle')
        : step === 'partial'
          ? t('admin.student360.guardianPartialTitle')
          : t('admin.student360.guardianSuccessTitle');

  if (!open) return null;

  return (
    <>
      <SetupDrawer open={open} title={drawerTitle} onClose={handleClose}>
        {step === 'pick' ? (
          <div className="guardian-flow-drawer__body">
            <AcademicSegmentedControl
              ariaLabel={t('admin.student360.addGuardianMode')}
              value={pickMode}
              onChange={setPickMode}
              options={[
                { value: 'search', label: t('admin.student360.searchExistingGuardian') },
                { value: 'create', label: t('admin.student360.createNewGuardian') },
              ]}
            />
            {pickMode === 'search' ? (
              <GuardianSearchPanel
                studentId={studentId}
                linkedGuardianIds={linkedGuardianIds}
                onSelect={handleGuardianPicked}
                onCreateNew={switchToCreate}
                initialQuery={createPrefill.query}
              />
            ) : (
              <GuardianQuickCreateForm
                prefill={createPrefill}
                onCreated={handleGuardianPicked}
                onSelectExisting={handleGuardianPicked}
              />
            )}
          </div>
        ) : null}

        {step === 'relationship' && selectedGuardian ? (
          <form className="guardian-flow-drawer__body guardian-flow-drawer__form" onSubmit={linkRelationship}>
            <div className="guardian-selected-summary">
              <p className="tiny muted">{t('admin.student360.selectedGuardian')}</p>
              <strong dir="auto">{selectedGuardian.name}</strong>
              {selectedGuardian.phone ? (
                <span className="tiny mono" dir="ltr">
                  {formatMoroccanPhoneDisplay(selectedGuardian.phone)}
                </span>
              ) : null}
              {selectedGuardian.email ? (
                <span className="tiny" dir="ltr">
                  {selectedGuardian.email}
                </span>
              ) : null}
            </div>

            <GuardianRelationshipForm values={formValues} onChange={setFormValues} fieldError={fieldError} />

            {pendingPrimaryConfirm && currentPrimary ? (
              <div className="guardian-primary-confirm" role="alert">
                <p>{t('admin.student360.primaryGuardianReplaceConfirm', { name: currentPrimary.guardian.name })}</p>
                <div className="row" style={{ gap: 8 }}>
                  <button type="submit" className="btn btn--primary btn--sm">
                    {t('admin.student360.confirmPrimaryReplace')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPendingPrimaryConfirm(false)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="guardian-flow-drawer__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? t('admin.student360.linkingGuardianProgress') : t('admin.student360.linkGuardianToStudent')}
              </button>
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => setStep('pick')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={handleClose}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'success' && selectedGuardian ? (
          <div className="guardian-flow-drawer__body">
            <p>{t('admin.student360.guardianLinkedSuccess')}</p>
            <div className="guardian-selected-summary">
              <strong dir="auto">{selectedGuardian.name}</strong>
              {selectedGuardian.phone ? (
                <span className="tiny mono" dir="ltr">
                  {formatMoroccanPhoneDisplay(selectedGuardian.phone)}
                </span>
              ) : null}
            </div>
            {!selectedGuardian.has_account ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAccountDialogOpen(true)}>
                {t('admin.account.createAccount')}
              </button>
            ) : null}
            <button type="button" className="btn btn--primary" onClick={finishSuccess}>
              {t('common.close')}
            </button>
          </div>
        ) : null}

        {step === 'partial' && selectedGuardian ? (
          <div className="guardian-flow-drawer__body">
            <p className="guardian-create-field__error">{t('admin.student360.guardianCreatedLinkFailed')}</p>
            {fieldError ? <p className="tiny guardian-create-field__error">{fieldError}</p> : null}
            <div className="guardian-selected-summary">
              <strong dir="auto">{selectedGuardian.name}</strong>
            </div>
            <div className="guardian-flow-drawer__actions">
              <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={retryLinkOnly}>
                {saving ? t('admin.student360.linkingGuardianProgress') : t('admin.student360.retryLinkGuardian')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => setStep('relationship')}>
                {t('common.back')}
              </button>
            </div>
          </div>
        ) : null}
      </SetupDrawer>

      {selectedGuardian ? (
        <CreateAccountDialog
          open={accountDialogOpen}
          title={t('admin.account.activateAccountTitle', { name: selectedGuardian.name })}
          endpoint={endpoints.admin.parentAccount(selectedGuardian.id)}
          defaultEmail={selectedGuardian.email ?? ''}
          onClose={() => setAccountDialogOpen(false)}
          onSuccess={() => {
            setAccountDialogOpen(false);
            onLinked();
          }}
        />
      ) : null}
    </>
  );
}
