'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { GuardianSearchPanel } from './guardian-search-panel';
import {
  GuardianNewPersonForm,
  validateNewPersonDraft,
  type NewPersonDraft,
} from './guardian-new-person-form';
import {
  DEFAULT_RELATIONSHIP_FORM,
  GuardianRelationshipForm,
  relationshipFormToCreatePayload,
  relationshipFormToLinkPersonPayload,
  type RelationshipFormValues,
} from './guardian-relationship-form';
import { GuardianRelationshipImpactAlert } from './guardian-relationship-impact-alert';
import { PersonSchoolIdentitySection } from './person-school-identity-section';
import { GuardianContactRequiredSection } from './guardian-contact-required-section';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import { buildGuardianQuickCreatePayload } from '../utils/guardian-quick-create-payload';
import {
  emptyIdentityDocumentFormValues,
  validateIdentityDocumentForm,
} from '@/features/admin/parents/utils/identity-document';
import { GuardianDuplicateAlert } from './guardian-duplicate-alert';
import { resolveGuardianLinkBlockerMessage } from '../utils/guardian-candidate-presentation';
import { canLinkPersonAsGuardian } from '../utils/guardian-profile-contract';
import {
  buildContactPatchPayload,
  EMPTY_CONTACT_PATCH_DRAFT,
  EMPTY_CONTACT_PATCH_TOUCHED,
  isGuardianContactPhoneRequiredError,
  isGuardianLinkActionDisabled,
  shouldShowContactRequiredSection,
  type ContactPatchDraft,
  type ContactPatchTouched,
} from '../utils/guardian-contact-requirements';
import {
  linkExistingPersonAsGuardian,
  normalizeLinkPersonResponse,
} from '../utils/guardian-link-person';
import { normalizeGuardianQuickCreateResponse } from '../utils/normalize-guardian';
import {
  formatMoroccanPhoneDisplay,
} from '../utils/normalize-moroccan-phone';
import { isPersonSearchResult } from '../utils/normalize-person-search';
import {
  formatRoleLabels,
  needsNewAccountFromLink,
  personHasTeacherRole,
} from '../utils/person-role-presentation';
import { personHasLoginAccount } from '../utils/person-school-identity';
import { isRelationshipActive } from '../utils/relationship-types';
import type {
  GuardianDuplicateField,
  GuardianDuplicateMatch,
  GuardianRelationship,
  GuardianSummary,
  LinkPersonAsGuardianResponse,
  PersonSearchResult,
} from '@/types/student-360';
import './guardian-flow.css';

type Step = 'pick' | 'relationship' | 'success' | 'already_linked';
type PickMode = 'existing' | 'new';
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
  onLinked: (result?: LinkPersonAsGuardianResponse) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [pickMode, setPickMode] = useState<PickMode>('existing');
  const [step, setStep] = useState<Step>('pick');
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);
  const [newPersonDraft, setNewPersonDraft] = useState<NewPersonDraft | null>(null);
  const [isNewPersonFlow, setIsNewPersonFlow] = useState(false);
  const [linkResult, setLinkResult] = useState<LinkPersonAsGuardianResponse | null>(null);
  const [formValues, setFormValues] = useState<RelationshipFormValues>(DEFAULT_RELATIONSHIP_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [identityConflictField, setIdentityConflictField] = useState<GuardianDuplicateField | null>(
    null,
  );
  const [identityConflictMatches, setIdentityConflictMatches] = useState<GuardianDuplicateMatch[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [searchPrefill, setSearchPrefill] = useState('');
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingPrimaryConfirm, setPendingPrimaryConfirm] = useState(false);
  const [contactPatch, setContactPatch] = useState<ContactPatchDraft>(EMPTY_CONTACT_PATCH_DRAFT);
  const [contactPatchTouched, setContactPatchTouched] = useState<ContactPatchTouched>(
    EMPTY_CONTACT_PATCH_TOUCHED,
  );
  const [contactRequiredForced, setContactRequiredForced] = useState(false);

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

  const displayPerson = useMemo((): SelectedPerson | null => {
    if (selectedPerson) return selectedPerson;
    if (!newPersonDraft) return null;
    const name = [newPersonDraft.firstName.trim(), newPersonDraft.lastName.trim()]
      .filter(Boolean)
      .join(' ');
    return {
      id: 0,
      partner_id: 0,
      name,
      phone: newPersonDraft.phone.trim() || null,
      email: newPersonDraft.email.trim().toLowerCase() || null,
      existing_roles: [],
      role_labels: [],
      has_user_account: false,
      can_link_as_guardian: true,
    } as PersonSearchResult;
  }, [newPersonDraft, selectedPerson]);

  function reset() {
    setStep('pick');
    setPickMode('existing');
    setSelectedPerson(null);
    setNewPersonDraft(null);
    setIsNewPersonFlow(false);
    setLinkResult(null);
    setFormValues(DEFAULT_RELATIONSHIP_FORM);
    setFieldError(null);
    setIdentityConflictField(null);
    setIdentityConflictMatches([]);
    setSaving(false);
    setSearchPrefill('');
    setAccountDialogOpen(false);
    setPendingPrimaryConfirm(false);
    setContactPatch(EMPTY_CONTACT_PATCH_DRAFT);
    setContactPatchTouched(EMPTY_CONTACT_PATCH_TOUCHED);
    setContactRequiredForced(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleExistingPersonPicked(person: PersonSearchResult) {
    setSelectedPerson(person);
    setNewPersonDraft(null);
    setIsNewPersonFlow(false);
    setLinkResult(null);
    setContactPatch(EMPTY_CONTACT_PATCH_DRAFT);
    setContactPatchTouched(EMPTY_CONTACT_PATCH_TOUCHED);
    setContactRequiredForced(false);
    setStep('relationship');
    setFieldError(null);
  }

  function handleNewPersonContinue(draft: NewPersonDraft) {
    setNewPersonDraft(draft);
    setSelectedPerson(null);
    setIsNewPersonFlow(true);
    setLinkResult(null);
    setContactPatch(EMPTY_CONTACT_PATCH_DRAFT);
    setContactPatchTouched(EMPTY_CONTACT_PATCH_TOUCHED);
    setContactRequiredForced(false);
    setStep('relationship');
    setFieldError(null);
  }

  function handleUseExistingFromNewFlow(person: PersonSearchResult) {
    setPickMode('existing');
    handleExistingPersonPicked(person);
  }

  function selectedPersonId(): number | null {
    if (!selectedPerson) return null;
    return selectedPerson.guardian_id ?? selectedPerson.id;
  }

  async function createNewPersonGuardian(): Promise<GuardianSummary | null> {
    if (!newPersonDraft) return null;
    const payload = buildGuardianQuickCreatePayload({
      firstName: newPersonDraft.firstName,
      lastName: newPersonDraft.lastName,
      phone: newPersonDraft.phone,
      email: newPersonDraft.email,
      identityDocument: newPersonDraft.identityDocument ?? emptyIdentityDocumentFormValues(),
    });
    const res = await api.post<unknown>(endpoints.admin.guardiansQuickCreate, payload);
    if (!res.success) {
      const mapped = mapGuardianApiError(res.error, t);
      setFieldError(mapped.message);
      if (mapped.duplicateField || mapped.matches?.length) {
        setIdentityConflictField(mapped.duplicateField ?? 'national_id');
        setIdentityConflictMatches(mapped.matches ?? []);
      } else {
        setIdentityConflictField(null);
        setIdentityConflictMatches([]);
      }
      toast.error(mapped.message);
      return null;
    }
    setIdentityConflictField(null);
    setIdentityConflictMatches([]);
    return normalizeGuardianQuickCreateResponse(res.data);
  }

  async function linkRelationship(e?: React.FormEvent) {
    e?.preventDefault();
    if (!displayPerson) return;

    if (!canLinkSelectedPerson) {
      setFieldError(
        isPersonSearchResult(displayPerson)
          ? resolveGuardianLinkBlockerMessage(t, displayPerson)
          : t('admin.student360.guardianCandidateCannotLink'),
      );
      return;
    }

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

    let personForLink: SelectedPerson | null = selectedPerson;

    if (isNewPersonFlow && !selectedPerson) {
      const created = await createNewPersonGuardian();
      if (!created) {
        setSaving(false);
        setPendingPrimaryConfirm(false);
        return;
      }
      personForLink = created;
      setSelectedPerson(created);
      setIsNewPersonFlow(false);
    }

    if (!personForLink) {
      setSaving(false);
      return;
    }

    const partnerId =
      typeof personForLink.partner_id === 'number' && personForLink.partner_id > 0
        ? personForLink.partner_id
        : null;

    const res =
      partnerId != null
        ? await linkExistingPersonAsGuardian(
            studentId,
            relationshipFormToLinkPersonPayload(
              { partner_id: partnerId },
              formValues,
              buildContactPatchPayload(contactPatch, contactPatchTouched),
            ),
          )
        : await api.post(
            endpoints.admin.studentGuardians(studentId),
            relationshipFormToCreatePayload(personForLink.id, formValues),
          );

    setSaving(false);
    setPendingPrimaryConfirm(false);

    if (res.success) {
      const normalized =
        partnerId != null
          ? normalizeLinkPersonResponse(res.data) ?? { guardian: personForLink }
          : null;

      if (normalized) {
        setSelectedPerson(normalized.guardian);
        setLinkResult(normalized);
      }

      const successName = normalized?.guardian.name ?? personForLink.name;
      toast.success(t('admin.student360.linkPersonSuccess', { name: successName }));

      if (normalized?.account?.needs_new_account === false) {
        toast.success(t('admin.student360.accountReusedWithGuardianRole'));
      }

      setStep('success');
      onLinked(normalized ?? undefined);
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    const code = String(res.error?.code ?? '');

    if (code === 'guardian_relation_already_exists' || code === 'guardian_already_linked') {
      setFieldError(mapped.message);
      setStep('already_linked');
      return;
    }

    if (isGuardianContactPhoneRequiredError(code)) {
      setContactRequiredForced(true);
      setFieldError(mapped.message);
      setStep('relationship');
      return;
    }

    setFieldError(mapped.message);
    toast.error(mapped.message);
  }

  function finishSuccess() {
    handleClose();
  }

  const drawerTitle =
    step === 'pick'
      ? t('admin.student360.addGuardian')
      : step === 'relationship'
        ? t('admin.student360.relationshipStepTitle')
        : step === 'already_linked'
          ? t('admin.student360.guardianSuccessTitle')
          : t('admin.student360.guardianSuccessTitle');

  const canLinkSelectedPerson = useMemo(() => {
    if (isNewPersonFlow && newPersonDraft) return true;
    if (!selectedPerson || !isPersonSearchResult(selectedPerson)) return true;
    return canLinkPersonAsGuardian(selectedPerson, Boolean(linkedRelationship));
  }, [isNewPersonFlow, linkedRelationship, newPersonDraft, selectedPerson]);

  const selectedPersonLinkBlocker = useMemo(() => {
    if (!selectedPerson || !isPersonSearchResult(selectedPerson) || canLinkSelectedPerson) return null;
    return resolveGuardianLinkBlockerMessage(t, selectedPerson);
  }, [canLinkSelectedPerson, selectedPerson, t]);

  const newPersonPhoneValid = useMemo(() => {
    if (!newPersonDraft) return false;
    if (Object.keys(validateNewPersonDraft(newPersonDraft, t)).length > 0) return false;
    const identity = newPersonDraft.identityDocument ?? emptyIdentityDocumentFormValues();
    return Object.keys(validateIdentityDocumentForm(identity, t)).length === 0;
  }, [newPersonDraft, t]);

  const existingPersonForContact =
    displayPerson && isPersonSearchResult(displayPerson) && displayPerson.partner_id > 0
      ? displayPerson
      : null;

  const showContactRequired = shouldShowContactRequiredSection(
    formValues,
    existingPersonForContact,
    contactPatch,
    contactPatchTouched,
    contactRequiredForced,
  );

  const submitDisabled = isGuardianLinkActionDisabled(formValues, {
    canLink: canLinkSelectedPerson,
    person: existingPersonForContact,
    patch: contactPatch,
    touched: contactPatchTouched,
    isNewPerson: isNewPersonFlow && !selectedPerson,
    newPersonPhoneValid,
  });

  const personHasAccount =
    linkResult?.account?.has_user_account ??
    (selectedPerson ? personHasLoginAccount(selectedPerson) : false);

  const showCreateAccount =
    selectedPerson != null &&
    needsNewAccountFromLink(linkResult?.account, personHasAccount) &&
    linkResult?.account?.can_assign_password !== false;

  const showManageAccount =
    selectedPerson != null &&
    !needsNewAccountFromLink(linkResult?.account, personHasAccount) &&
    personHasAccount;

  const submitLabel = isNewPersonFlow && !selectedPerson
    ? t('admin.student360.createAndLinkPersonAsGuardian')
    : t('admin.student360.linkPersonAsGuardian');

  const effectiveContact = useMemo(
    () => ({
      phone:
        contactPatchTouched.phone && contactPatch.phone.trim()
          ? contactPatch.phone
          : displayPerson?.phone,
      email:
        contactPatchTouched.email && contactPatch.email.trim()
          ? contactPatch.email
          : displayPerson?.email,
    }),
    [contactPatch, contactPatchTouched, displayPerson],
  );

  if (!open) return null;

  return (
    <>
      <SetupDrawer open={open} title={drawerTitle} onClose={handleClose} size="medium">
        {step === 'pick' ? (
          <div className="guardian-flow-drawer__body">
            <fieldset className="guardian-source-picker">
              <legend className="guardian-source-picker__title">{t('admin.student360.guardianSourceTitle')}</legend>
              <label className="guardian-source-picker__option">
                <input
                  type="radio"
                  name="guardian-source"
                  value="existing"
                  checked={pickMode === 'existing'}
                  onChange={() => setPickMode('existing')}
                />
                <span>{t('admin.student360.guardianSourceExisting')}</span>
              </label>
              <label className="guardian-source-picker__option">
                <input
                  type="radio"
                  name="guardian-source"
                  value="new"
                  checked={pickMode === 'new'}
                  onChange={() => setPickMode('new')}
                />
                <span>{t('admin.student360.guardianSourceNew')}</span>
              </label>
            </fieldset>

            {pickMode === 'existing' ? (
              <GuardianSearchPanel
                studentId={studentId}
                linkedGuardianIds={linkedGuardianIds}
                onSelect={handleExistingPersonPicked}
                initialQuery={searchPrefill}
                showCreateOnEmpty={false}
              />
            ) : (
              <GuardianNewPersonForm
                studentId={studentId}
                prefill={searchPrefill ? { query: searchPrefill } : undefined}
                onContinue={handleNewPersonContinue}
                onUseExisting={handleUseExistingFromNewFlow}
              />
            )}
          </div>
        ) : null}

        {step === 'relationship' && displayPerson ? (
          <form className="guardian-flow-drawer__body guardian-flow-drawer__form" onSubmit={linkRelationship}>
            <div className="guardian-selected-summary">
              <p className="tiny muted">{t('admin.student360.selectedPerson')}</p>
              <strong dir="auto">{displayPerson.name}</strong>
              {displayPerson.phone ? (
                <span className="tiny mono" dir="ltr">
                  {formatMoroccanPhoneDisplay(displayPerson.phone)}
                </span>
              ) : null}
              {displayPerson.email ? (
                <span className="tiny" dir="ltr">
                  {displayPerson.email}
                </span>
              ) : null}
            </div>

            {isPersonSearchResult(displayPerson) && displayPerson.partner_id > 0 ? (
              <PersonSchoolIdentitySection
                person={displayPerson}
                canLink={canLinkSelectedPerson}
                warnings={displayPerson.warnings}
              />
            ) : null}

            {showContactRequired ? (
              <GuardianContactRequiredSection
                patch={contactPatch}
                touched={contactPatchTouched}
                onPatch={(partial) => setContactPatch((prev) => ({ ...prev, ...partial }))}
                onTouch={(partial) => setContactPatchTouched((prev) => ({ ...prev, ...partial }))}
                error={contactRequiredForced ? fieldError : null}
                open
              />
            ) : null}

            {personHasTeacherRole(displayPerson) ? (
              <p className="tiny muted">{t('admin.parentProfile.responsibilitiesScopeNote')}</p>
            ) : null}

            <GuardianRelationshipImpactAlert
              values={formValues}
              personContact={effectiveContact}
              currentPrimaryName={currentPrimary?.guardian.name ?? null}
              inDialog
            />

            <GuardianRelationshipForm values={formValues} onChange={setFormValues} fieldError={fieldError} />

            {identityConflictField && identityConflictMatches.length > 0 ? (
              <GuardianDuplicateAlert
                field={identityConflictField}
                matches={identityConflictMatches}
                onLinkExisting={(match) => {
                  setIdentityConflictField(null);
                  setIdentityConflictMatches([]);
                  setFieldError(null);
                  setIsNewPersonFlow(false);
                  setNewPersonDraft(null);
                  if (isPersonSearchResult(match)) {
                    handleExistingPersonPicked(match);
                  } else {
                    setSelectedPerson(match);
                    setStep('relationship');
                  }
                }}
                onEditInput={() => {
                  setIdentityConflictField(null);
                  setIdentityConflictMatches([]);
                  setFieldError(null);
                  setStep('pick');
                  setPickMode('new');
                }}
              />
            ) : null}

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

            {selectedPersonLinkBlocker ? (
              <p className="tiny guardian-create-field__error" role="alert">
                {selectedPersonLinkBlocker}
              </p>
            ) : null}

            <div className="guardian-flow-drawer__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving || submitDisabled}
                title={submitDisabled && selectedPersonLinkBlocker ? selectedPersonLinkBlocker : undefined}
              >
                {saving ? t('admin.student360.linkingPersonProgress') : submitLabel}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={saving}
                onClick={() => {
                  setStep('pick');
                  setContactRequiredForced(false);
                  setFieldError(null);
                }}
              >
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={handleClose}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'success' && displayPerson ? (
          <div className="guardian-flow-drawer__body">
            <p>{t('admin.student360.linkPersonSuccess', { name: displayPerson.name })}</p>
            {linkResult?.account?.needs_new_account === false ? (
              <p className="tiny muted">{t('admin.student360.accountRoleAddedGuardian')}</p>
            ) : null}
            <div className="guardian-selected-summary">
              <strong dir="auto">{displayPerson.name}</strong>
              {displayPerson.role_labels?.length ? (
                <p className="tiny">
                  {t('admin.student360.accountRoles')}: {formatRoleLabels(displayPerson.role_labels)}
                </p>
              ) : null}
              {displayPerson.phone ? (
                <span className="tiny mono" dir="ltr">
                  {formatMoroccanPhoneDisplay(displayPerson.phone)}
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

        {step === 'already_linked' && displayPerson ? (
          <div className="guardian-flow-drawer__body">
            <p>{t('admin.student360.personAlreadyLinkedAsGuardian')}</p>
            <div className="guardian-selected-summary">
              <strong dir="auto">{displayPerson.name}</strong>
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
