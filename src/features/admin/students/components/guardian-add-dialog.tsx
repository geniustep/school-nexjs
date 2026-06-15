'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
  relationshipFormToLinkPersonPayload,
  type RelationshipFormValues,
} from './guardian-relationship-form';
import { GuardianRelationshipImpactAlert } from './guardian-relationship-impact-alert';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import {
  linkExistingPersonAsGuardian,
  normalizeLinkPersonResponse,
} from '../utils/guardian-link-person';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import { isPersonSearchResult } from '../utils/normalize-person-search';
import {
  formatRoleLabels,
  needsNewAccountFromLink,
  personHasTeacherRole,
} from '../utils/person-role-presentation';
import { isRelationshipActive } from '../utils/relationship-types';
import type {
  GuardianRelationship,
  GuardianSummary,
  LinkPersonAsGuardianResponse,
  PersonSearchResult,
} from '@/types/student-360';
import './guardian-flow.css';

type Step = 'pick' | 'relationship' | 'success' | 'partial' | 'already_linked';
type PickMode = 'search' | 'create';
type SelectedPerson = PersonSearchResult | GuardianSummary;

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
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);
  const [linkResult, setLinkResult] = useState<LinkPersonAsGuardianResponse | null>(null);
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

  const linkedRelationship = useMemo(() => {
    if (!selectedPerson) return null;
    const targetId = selectedPerson.guardian_id ?? selectedPerson.id;
    return (
      relationships.find(
        (r) =>
          isRelationshipActive(r.state, r.active) &&
          (r.guardian.id === targetId || r.guardian.partner_id === selectedPerson.partner_id),
      ) ?? null
    );
  }, [relationships, selectedPerson]);

  function reset() {
    setStep('pick');
    setPickMode('search');
    setSelectedPerson(null);
    setLinkResult(null);
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

  function handlePersonPicked(person: SelectedPerson) {
    setSelectedPerson(person);
    setLinkResult(null);
    setStep('relationship');
    setFieldError(null);
  }

  function switchToCreate(prefill: { query?: string }) {
    setCreatePrefill(prefill);
    setPickMode('create');
  }

  function selectedPersonId(): number | null {
    if (!selectedPerson) return null;
    return selectedPerson.guardian_id ?? selectedPerson.id;
  }

  async function linkRelationship(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedPerson) return;

    const personId = selectedPersonId();
    if (
      formValues.is_primary_contact &&
      currentPrimary &&
      personId != null &&
      currentPrimary.guardian.id !== personId &&
      !pendingPrimaryConfirm
    ) {
      setPendingPrimaryConfirm(true);
      return;
    }

    setSaving(true);
    setFieldError(null);

    const res = isPersonSearchResult(selectedPerson)
      ? await linkExistingPersonAsGuardian(
          studentId,
          relationshipFormToLinkPersonPayload(selectedPerson, formValues),
        )
      : await api.post(
          endpoints.admin.studentGuardians(studentId),
          relationshipFormToCreatePayload(selectedPerson.id, formValues),
        );

    setSaving(false);
    setPendingPrimaryConfirm(false);

    if (res.success) {
      const normalized = isPersonSearchResult(selectedPerson)
        ? normalizeLinkPersonResponse(res.data) ?? { guardian: selectedPerson }
        : null;

      if (normalized) {
        setSelectedPerson(normalized.guardian);
        setLinkResult(normalized);
      }

      const successName = normalized?.guardian.name ?? selectedPerson.name;
      toast.success(t('admin.student360.linkPersonSuccess', { name: successName }));

      if (normalized?.account?.needs_new_account === false) {
        toast.success(t('admin.student360.accountReusedWithGuardianRole'));
      }

      setStep('success');
      onLinked();
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    const code = String(res.error?.code ?? '');
    if (code === 'guardian_relation_already_exists' || code === 'guardian_already_linked') {
      setFieldError(mapped.message);
      setStep('already_linked');
      return;
    }

    setFieldError(mapped.message);
    setStep('partial');
    toast.error(mapped.message);
  }

  async function retryLinkOnly() {
    if (!selectedPerson) return;
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
          : step === 'already_linked'
            ? t('admin.student360.guardianSuccessTitle')
            : t('admin.student360.guardianSuccessTitle');

  const personHasAccount =
    linkResult?.account?.has_user_account ??
    selectedPerson?.has_user_account ??
    selectedPerson?.has_account ??
    false;

  const showCreateAccount =
    selectedPerson != null &&
    needsNewAccountFromLink(linkResult?.account, personHasAccount) &&
    linkResult?.account?.can_assign_password !== false;

  const showManageAccount =
    selectedPerson != null &&
    !needsNewAccountFromLink(linkResult?.account, personHasAccount) &&
    personHasAccount;

  if (!open) return null;

  return (
    <>
      <SetupDrawer open={open} title={drawerTitle} onClose={handleClose} size="medium">
        {step === 'pick' ? (
          <div className="guardian-flow-drawer__body">
            <AcademicSegmentedControl
              ariaLabel={t('admin.student360.addGuardianMode')}
              value={pickMode}
              onChange={setPickMode}
              options={[
                { value: 'search', label: t('admin.student360.searchExistingPerson') },
                { value: 'create', label: t('admin.student360.createNewGuardian') },
              ]}
            />
            {pickMode === 'search' ? (
              <GuardianSearchPanel
                studentId={studentId}
                linkedGuardianIds={linkedGuardianIds}
                onSelect={handlePersonPicked}
                onCreateNew={switchToCreate}
                initialQuery={createPrefill.query}
              />
            ) : (
              <GuardianQuickCreateForm
                prefill={createPrefill}
                onCreated={handlePersonPicked}
                onSelectExisting={handlePersonPicked}
              />
            )}
          </div>
        ) : null}

        {step === 'relationship' && selectedPerson ? (
          <form className="guardian-flow-drawer__body guardian-flow-drawer__form" onSubmit={linkRelationship}>
            <div className="guardian-selected-summary">
              <p className="tiny muted">{t('admin.student360.selectedPerson')}</p>
              <strong dir="auto">{selectedPerson.name}</strong>
              {selectedPerson.role_labels?.length ? (
                <p className="tiny">
                  {t('admin.student360.currentRoles')}: {formatRoleLabels(selectedPerson.role_labels)}
                </p>
              ) : null}
              <p className="tiny">
                {t('admin.student360.currentAccountStatus')}:{' '}
                {selectedPerson.has_user_account || selectedPerson.has_account
                  ? t('admin.student360.accountExists')
                  : t('admin.student360.accountMissing')}
              </p>
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
            </div>

            {selectedPerson.has_user_account || selectedPerson.has_account ? (
              <div className="guardian-account-reuse-note" role="status">
                <p>{t('admin.student360.willReuseExistingAccount')}</p>
                {personHasTeacherRole(selectedPerson) ? (
                  <p className="tiny muted">{t('admin.student360.teacherRoleAddedNote')}</p>
                ) : null}
              </div>
            ) : null}

            <p className="tiny muted">{t('admin.parentProfile.responsibilitiesScopeNote')}</p>

            <GuardianRelationshipImpactAlert
              values={formValues}
              personContact={{
                phone: selectedPerson.phone,
                email: selectedPerson.email,
              }}
              currentPrimaryName={currentPrimary?.guardian.name ?? null}
              parentProfileHref={
                selectedPerson.guardian_id != null
                  ? `/admin/parents/${selectedPerson.guardian_id}`
                  : selectedPerson.id
                    ? `/admin/parents/${selectedPerson.id}`
                    : undefined
              }
            />

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
                {saving ? t('admin.student360.linkingPersonProgress') : t('admin.student360.linkPersonAsGuardian')}
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

        {step === 'success' && selectedPerson ? (
          <div className="guardian-flow-drawer__body">
            <p>{t('admin.student360.linkPersonSuccess', { name: selectedPerson.name })}</p>
            {linkResult?.account?.needs_new_account === false ? (
              <p className="tiny muted">{t('admin.student360.accountRoleAddedGuardian')}</p>
            ) : null}
            <div className="guardian-selected-summary">
              <strong dir="auto">{selectedPerson.name}</strong>
              {selectedPerson.role_labels?.length ? (
                <p className="tiny">
                  {t('admin.student360.accountRoles')}: {formatRoleLabels(selectedPerson.role_labels)}
                </p>
              ) : null}
              {selectedPerson.phone ? (
                <span className="tiny mono" dir="ltr">
                  {formatMoroccanPhoneDisplay(selectedPerson.phone)}
                </span>
              ) : null}
            </div>
            {showCreateAccount && selectedPersonId() != null ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAccountDialogOpen(true)}>
                {t('admin.account.createAccount')}
              </button>
            ) : null}
            {showManageAccount && selectedPersonId() != null ? (
              <Link href={`/admin/parents/${selectedPersonId()}`} className="btn btn--secondary btn--sm">
                {t('admin.student360.guardiansManageLoginAccount')}
              </Link>
            ) : null}
            <button type="button" className="btn btn--primary" onClick={finishSuccess}>
              {t('common.close')}
            </button>
          </div>
        ) : null}

        {step === 'already_linked' && selectedPerson ? (
          <div className="guardian-flow-drawer__body">
            <p>{t('admin.student360.personAlreadyLinkedAsGuardian')}</p>
            <div className="guardian-selected-summary">
              <strong dir="auto">{selectedPerson.name}</strong>
            </div>
            {linkedRelationship ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={handleClose}>
                {t('admin.student360.viewExistingRelationship')}
              </button>
            ) : null}
            <button type="button" className="btn btn--ghost" onClick={handleClose}>
              {t('common.close')}
            </button>
          </div>
        ) : null}

        {step === 'partial' && selectedPerson ? (
          <div className="guardian-flow-drawer__body">
            <p className="guardian-create-field__error">{t('admin.student360.guardianCreatedLinkFailed')}</p>
            {fieldError ? <p className="tiny guardian-create-field__error">{fieldError}</p> : null}
            <div className="guardian-selected-summary">
              <strong dir="auto">{selectedPerson.name}</strong>
            </div>
            <div className="guardian-flow-drawer__actions">
              <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={retryLinkOnly}>
                {saving ? t('admin.student360.linkingPersonProgress') : t('admin.student360.retryLinkGuardian')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => setStep('relationship')}>
                {t('common.back')}
              </button>
            </div>
          </div>
        ) : null}
      </SetupDrawer>

      {selectedPerson && selectedPersonId() != null && showCreateAccount ? (
        <CreateAccountDialog
          open={accountDialogOpen}
          title={t('admin.account.activateAccountTitle', { name: selectedPerson.name })}
          endpoint={endpoints.admin.parentAccount(selectedPersonId()!)}
          defaultEmail={selectedPerson.email ?? ''}
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
