'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status reviewed-single-page
 * Family registration keeps the existing batch contract while presenting
 * guardians, children, review, and submit on one registration page.
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { PermissionDeniedState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionOptions } from '@/features/admin/admissions/hooks/use-admission-options';
import {
  filterStreamsByLevel,
  findAdmissionLevel,
} from '@/features/admin/admissions/utils/admission-options';
import {
  EnrollmentIntakeAcademicFields,
  EnrollmentIntakeIdentityFields,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import {
  intakeErrorsFromStudentProfile,
  intakeFromStudentProfile,
  patchStudentProfileFromIntake,
} from '@/features/admin/enrollment-intake/mappers';
import type { EnrollmentIntakePatch } from '@/features/admin/enrollment-intake/types';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { canCreateStudents } from '@/lib/permissions/academic-capabilities';
import type { PersonSearchResult, RelationshipType } from '@/types/student-360';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import type { BatchRegistrationResponse } from '@/types/student-batch-registration';
import { useStudentOptions } from '../hooks/use-student-options';
import { mapStudentApiError } from '../utils/student-api-errors';
import {
  buildEnrollmentClassScope,
  filterClassesForEnrollment,
} from '../utils/student-options';
import {
  buildEnrollmentCycleOptions,
  buildReferenceLevelCycleMap,
  filterLevelsByCycleId,
  resolveStudentLevelCycleId,
} from '../utils/student-enrollment-cycle';
import {
  localizeStudentGenderOptions,
  resolveDefaultAcademicYearId,
  resolveDefaultNationalityId,
  todayIsoDate,
  type StudentProfileFieldErrors,
} from '../utils/student-profile';
import type { BillingResponsibilityFieldErrors } from '../utils/student-create-billing-responsibility';
import {
  collectStudentCreateGuardianEntries,
  resolvePersonSchoolParentId,
} from '../utils/student-create-guardian-payload';
import {
  collectUsedGuardianIds,
  createEmptyAdditionalGuardianEntry,
  entryFromLinkedExistingGuardian,
} from '../utils/student-create-additional-guardians';
import {
  addFamilyRegistrationChild,
  applySharedDefaultsToChildren,
  childDisplayName,
  emptyFamilyRegistrationFormState,
  emptyFamilyRegistrationSubmitState,
  patchFamilyRegistrationChildProfile,
  removeFamilyRegistrationChild,
  type FamilyRegistrationFormState,
  type FamilyRegistrationSubmitState,
} from '../utils/family-registration-state';
import {
  summarizeFamilyRegistration,
  validateFamilyRegistrationChildrenStep,
  validateFamilyRegistrationGuardiansStep,
} from '../utils/family-registration-payload';
import {
  familySubmitOutcomeSummary,
  runFamilyRegistrationSubmit,
  shouldOfferFamilyFailedRetry,
} from '../utils/family-registration-submit';
import { FamilyBatchIdempotencyRegistry } from '../utils/family-registration-idempotency';
import {
  emptyFamilyFinanceSubmitState,
  reopenFamilyFinanceSetup,
  resolveFamilyFinanceDraftsForSetup,
  type FamilyChildFinanceDraft,
  type FamilyFinanceSubmitState,
} from '../utils/family-registration-finance-state';
import { applyResolvedGuardiansToFamilyForm } from '../utils/family-registration-apply-resolved';
import { relationshipTypeLabel, RELATIONSHIP_TYPE_CODES } from '../utils/relationship-types';
import { StudentCreateBillingStep } from './student-create-billing-step';
import { StudentCreateStyledSection } from './student-create-section-header';
import { FamilyRegistrationFinancePanel } from './family-registration-finance-panel';
import { RegistrationPostCreateCollectionEntry } from './registration-post-create-collection-entry';
import '../student-360.css';

type FamilyRegistrationView = 'registration' | 'result' | 'finance' | 'finance_result';

/** Route gate: options/submit hooks mount only when `students.create` is granted. */
export function FamilyRegistrationPage() {
  const t = useT();
  const user = useSession();

  if (!canCreateStudents(user)) {
    return (
      <div className="student-create-page" data-testid="family-registration-denied">
        <PermissionDeniedState description={t('admin.pageForbidden')} />
      </div>
    );
  }

  return <FamilyRegistrationSinglePage />;
}

function FamilyRegistrationSinglePage() {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const optionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const options = optionsState.options;
  const today = useMemo(() => todayIsoDate(), []);
  const batchIdempotencyRef = useRef(new FamilyBatchIdempotencyRegistry());

  const [view, setView] = useState<FamilyRegistrationView>('registration');
  const [form, setForm] = useState<FamilyRegistrationFormState>(() =>
    emptyFamilyRegistrationFormState(today),
  );
  const [billingErrors, setBillingErrors] = useState<BillingResponsibilityFieldErrors>({});
  const [childErrorsByLocalId, setChildErrorsByLocalId] = useState<
    Record<string, StudentProfileFieldErrors>
  >({});
  const [submitState, setSubmitState] = useState<FamilyRegistrationSubmitState>(() =>
    emptyFamilyRegistrationSubmitState(),
  );
  const [financeDrafts, setFinanceDrafts] = useState<FamilyChildFinanceDraft[]>([]);
  const [financeSubmitState, setFinanceSubmitState] = useState<FamilyFinanceSubmitState>(() =>
    emptyFamilyFinanceSubmitState(),
  );
  const [resolvedGuardianEntries, setResolvedGuardianEntries] = useState<
    StudentCreateGuardianEntry[] | null
  >(null);
  const [linkedGuardianPerson, setLinkedGuardianPerson] = useState<PersonSearchResult | null>(null);
  const [linkedGuardianPersonsByEntryKey, setLinkedGuardianPersonsByEntryKey] = useState<
    Record<string, PersonSearchResult>
  >({});
  const submittingRef = useRef(false);
  const defaultsAppliedRef = useRef(false);

  const resolvedSchoolId =
    typeof activeSchoolId === 'number' && activeSchoolId > 0 ? activeSchoolId : null;

  useEffect(() => {
    if (defaultsAppliedRef.current || optionsState.loading || !options) return;
    const yearId = resolveDefaultAcademicYearId(options.academicYears ?? []);
    const nationalityId = resolveDefaultNationalityId(options.nationalities);
    setForm((prev) => {
      const nextShared = {
        ...prev.shared,
        academicYearId: prev.shared.academicYearId || yearId,
      };
      let next = {
        ...prev,
        shared: nextShared,
        guardianHost: {
          ...prev.guardianHost,
          nationalityId: prev.guardianHost.nationalityId || nationalityId || '',
          emergencyRelationship: prev.guardianHost.emergencyRelationship || 'father',
          admissionDate: prev.guardianHost.admissionDate || today,
        },
      };
      next = applySharedDefaultsToChildren({
        ...next,
        children: next.children.map((child) => ({
          ...child,
          profile: {
            ...child.profile,
            academicYearId: child.profile.academicYearId || yearId,
            nationalityId: child.profile.nationalityId || nationalityId || '',
            admissionDate: child.profile.admissionDate || today,
          },
        })),
      });
      return next;
    });
    defaultsAppliedRef.current = true;
  }, [options, optionsState.loading, today]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const referenceLevels = levelOptionsState.options?.reference_levels ?? [];
  const levelCycles = levelOptionsState.options?.cycles ?? [];
  const enrollmentCycles = useMemo(
    () =>
      buildEnrollmentCycleOptions(
        options?.levels ?? [],
        referenceLevels,
        levelCycles,
      ),
    [options?.levels, referenceLevels, levelCycles],
  );
  const intakeCycles = useMemo(
    () =>
      enrollmentCycles.map((cycle) => ({
        mode: 'id' as const,
        id: cycle.id,
        name: cycle.name,
      })),
    [enrollmentCycles],
  );
  const cycleByCode = useMemo(
    () => buildReferenceLevelCycleMap(referenceLevels),
    [referenceLevels],
  );

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  const guardianHostIntake = intakeFromStudentProfile(form.guardianHost);
  const guardianEntriesForBilling = collectStudentCreateGuardianEntries(
    form.guardianHost,
    form.billing,
  );
  const usedGuardianIds = collectUsedGuardianIds(form.guardianHost, form.billing);
  const summary = useMemo(() => summarizeFamilyRegistration(form), [form]);
  const outcome = familySubmitOutcomeSummary(submitState.results);
  const succeededCollectionStudents = useMemo(
    () =>
      submitState.results.filter(
        (row) =>
          row.status === 'succeeded' && typeof row.studentId === 'number' && row.studentId > 0,
      ),
    [submitState.results],
  );
  const succeededCollectionStudentIds = useMemo(
    () => succeededCollectionStudents.map((row) => row.studentId as number),
    [succeededCollectionStudents],
  );
  const succeededCollectionStudentNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const row of succeededCollectionStudents) {
      if (row.studentId) map[row.studentId] = row.displayName;
    }
    return map;
  }, [succeededCollectionStudents]);
  const submitting = submitState.phase === 'submitting' || submittingRef.current;

  function resolveBillingResponsibleLabel(): string {
    if (summary.billingMode === 'student') {
      return t('admin.student360.create.billingResponsibility.partnerStudent');
    }
    if (summary.billingGuardianName) return summary.billingGuardianName;
    return t('admin.student360.familyRegistration.billingMissing');
  }

  function goToFinanceSetup() {
    const childrenByLocalId = new Map(
      form.children.map((child) => [
        child.localId,
        {
          academicYearId: child.profile.academicYearId,
          levelId: child.profile.levelId,
          displayName: childDisplayName(child.profile),
        },
      ]),
    );
    setFinanceDrafts((prev) =>
      resolveFamilyFinanceDraftsForSetup({
        existingDrafts: prev,
        results: submitState.results,
        childrenByLocalId,
        billingResponsibleLabel: resolveBillingResponsibleLabel(),
      }),
    );
    setView('finance');
  }

  function backToFinanceSetup() {
    setFinanceSubmitState((prev) => reopenFamilyFinanceSetup(prev));
    setView('finance');
  }

  function handleIntakePatch(patch: EnrollmentIntakePatch) {
    setForm((prev) => ({
      ...prev,
      guardianHost: { ...prev.guardianHost, ...patchStudentProfileFromIntake(patch) },
    }));
    setBillingErrors({});
  }

  function handleLinkExistingGuardian(person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    if (guardianId == null) return;
    setLinkedGuardianPerson(person);
    setForm((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        guardianSourceMode: 'existing',
        linkedGuardianId: guardianId,
      },
      guardianHost: {
        ...prev.guardianHost,
        emergencyContactName: person.name || prev.guardianHost.emergencyContactName,
        emergencyPhone: person.phone || prev.guardianHost.emergencyPhone,
        guardianEmail: person.email || prev.guardianHost.guardianEmail,
      },
    }));
    setBillingErrors({});
  }

  function handleClearLinkedGuardian() {
    setLinkedGuardianPerson(null);
    setForm((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        linkedGuardianId: null,
      },
    }));
  }

  function handleGuardianSourceModeChange(mode: StudentCreateBillingFormState['guardianSourceMode']) {
    setLinkedGuardianPerson(null);
    setForm((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        guardianSourceMode: mode,
        linkedGuardianId: mode === 'existing' ? prev.billing.linkedGuardianId : null,
      },
    }));
  }

  function handleAddAdditionalGuardian() {
    setForm((prev) => {
      const entry = createEmptyAdditionalGuardianEntry('mother');
      return {
        ...prev,
        billing: {
          ...prev.billing,
          guardianEntries: [...prev.billing.guardianEntries, entry],
          additionalGuardianSourceModeByEntryKey: {
            ...prev.billing.additionalGuardianSourceModeByEntryKey,
            [entry.entryKey]: 'new',
          },
        },
      };
    });
  }

  async function handleSubmitFamily(options?: { retryFailedOnly?: boolean }) {
    if (submittingRef.current) return;
    if (submitState.lockedAgainstFullResubmit && !options?.retryFailedOnly) return;

    const withShared = applySharedDefaultsToChildren(form);
    setForm(withShared);

    const guardiansCheck = validateFamilyRegistrationGuardiansStep(withShared, t);
    if (!guardiansCheck.valid) {
      setBillingErrors(guardiansCheck.errors.billingErrors ?? {});
      setView('registration');
      toast.error(
        guardiansCheck.errors.message ?? t('admin.student360.familyRegistration.errors.generic'),
      );
      return;
    }
    setBillingErrors({});

    const childrenCheck = validateFamilyRegistrationChildrenStep(withShared, t);
    if (!childrenCheck.valid) {
      setChildErrorsByLocalId(childrenCheck.errors.childErrorsByLocalId ?? {});
      setView('registration');
      toast.error(
        childrenCheck.errors.message ?? t('admin.student360.familyRegistration.errors.generic'),
      );
      return;
    }
    setChildErrorsByLocalId({});

    submittingRef.current = true;
    setView('result');

    const onlyLocalIds = options?.retryFailedOnly
      ? submitState.results
          .filter((row) => row.status === 'failed' && row.canRetrySafely)
          .map((row) => row.localId)
      : undefined;

    const final = await runFamilyRegistrationSubmit({
      form: withShared,
      schoolId: resolvedSchoolId,
      classes: optionsState.options?.classes ?? [],
      onlyLocalIds,
      priorResults: options?.retryFailedOnly ? submitState.results : undefined,
      resolvedGuardianEntries: resolvedGuardianEntries ?? undefined,
      idempotency: batchIdempotencyRef.current,
      postBatch: (payload) =>
        api.post<BatchRegistrationResponse>(endpoints.admin.studentsBatchRegistration, payload),
      mapErrorMessage: (error) =>
        error
          ? mapStudentApiError(error, t).message
          : t('admin.student360.familyRegistration.toast.failure'),
      t,
      onProgress: (next) => setSubmitState(next),
    });

    setSubmitState(final);
    setResolvedGuardianEntries(final.resolvedGuardianEntries);
    const applied = applyResolvedGuardiansToFamilyForm({
      guardianHost: withShared.guardianHost,
      billing: withShared.billing,
      resolvedEntries: final.resolvedGuardianEntries,
    });
    setForm((prev) => ({
      ...prev,
      guardianHost: applied.guardianHost,
      billing: applied.billing,
    }));

    submittingRef.current = false;

    const summaryOutcome = familySubmitOutcomeSummary(final.results);
    if (summaryOutcome.kind === 'full_success') {
      toast.success(t('admin.student360.familyRegistration.toast.fullSuccess'));
    } else if (summaryOutcome.kind === 'partial_success') {
      toast.error(t('admin.student360.familyRegistration.toast.partialSuccess'));
    } else {
      toast.error(t('admin.student360.familyRegistration.toast.failure'));
    }
  }

  function resetFamilyRegistration() {
    batchIdempotencyRef.current.reset();
    setForm(emptyFamilyRegistrationFormState(today));
    setSubmitState(emptyFamilyRegistrationSubmitState());
    setFinanceDrafts([]);
    setFinanceSubmitState(emptyFamilyFinanceSubmitState());
    setResolvedGuardianEntries(null);
    setLinkedGuardianPerson(null);
    setLinkedGuardianPersonsByEntryKey({});
    setBillingErrors({});
    setChildErrorsByLocalId({});
    setView('registration');
  }

  const localizedGenders = localizeStudentGenderOptions(options?.genders ?? [], t);
  const retryFailedOnly =
    submitState.lockedAgainstFullResubmit && shouldOfferFamilyFailedRetry(submitState.results);

  return (
    <div className="student-create-form family-registration">
      <header className="student-create-page__header">
        <h1 className="student-create-page__title">
          {t('admin.student360.familyRegistration.pageTitle')}
        </h1>
        <p className="student-create-page__desc">
          {t('admin.student360.familyRegistration.pageDesc')}
        </p>
      </header>

      {view === 'registration' ? (
        <>
          <StudentCreateBillingStep
            billingState={form.billing}
            billingErrors={billingErrors}
            guardianEntries={guardianEntriesForBilling}
            linkedGuardianPerson={linkedGuardianPerson}
            onBillingChange={(patch) => {
              setForm((prev) => ({ ...prev, billing: { ...prev.billing, ...patch } }));
              setBillingErrors({});
            }}
            intakeValues={guardianHostIntake}
            intakeErrors={intakeErrorsFromStudentProfile({})}
            onIntakePatch={handleIntakePatch}
            onLinkExistingGuardian={handleLinkExistingGuardian}
            onClearLinkedGuardian={handleClearLinkedGuardian}
            onGuardianSourceModeChange={handleGuardianSourceModeChange}
            onProvisionAccessChange={(entryKey, enabled) => {
              setForm((prev) => ({
                ...prev,
                billing: {
                  ...prev.billing,
                  provisionAccessByEntryKey: {
                    ...prev.billing.provisionAccessByEntryKey,
                    [entryKey]: enabled,
                  },
                },
              }));
            }}
            onAddAdditionalGuardian={handleAddAdditionalGuardian}
            onAdditionalGuardianSourceModeChange={(entryKey, mode) => {
              setForm((prev) => ({
                ...prev,
                billing: {
                  ...prev.billing,
                  additionalGuardianSourceModeByEntryKey: {
                    ...prev.billing.additionalGuardianSourceModeByEntryKey,
                    [entryKey]: mode,
                  },
                },
              }));
            }}
            onUpdateAdditionalGuardian={(entryKey, next) => {
              setForm((prev) => ({
                ...prev,
                billing: {
                  ...prev.billing,
                  guardianEntries: prev.billing.guardianEntries.map((entry) =>
                    entry.entryKey === entryKey ? next : entry,
                  ),
                },
              }));
            }}
            onLinkAdditionalGuardian={(entryKey, person) => {
              const guardianId = resolvePersonSchoolParentId(person);
              if (guardianId == null) return;
              setLinkedGuardianPersonsByEntryKey((prev) => ({ ...prev, [entryKey]: person }));
              setForm((prev) => {
                const current = prev.billing.guardianEntries.find(
                  (entry) => entry.entryKey === entryKey,
                );
                return {
                  ...prev,
                  billing: {
                    ...prev.billing,
                    guardianEntries: prev.billing.guardianEntries.map((entry) =>
                      entry.entryKey === entryKey
                        ? entryFromLinkedExistingGuardian(
                            entryKey,
                            guardianId,
                            person.name || '—',
                            current?.relationship_type ?? 'mother',
                            person.phone ?? undefined,
                            person.email ?? undefined,
                          )
                        : entry,
                    ),
                    additionalGuardianSourceModeByEntryKey: {
                      ...prev.billing.additionalGuardianSourceModeByEntryKey,
                      [entryKey]: 'existing',
                    },
                  },
                };
              });
            }}
            onClearAdditionalGuardian={(entryKey) => {
              setLinkedGuardianPersonsByEntryKey((prev) => {
                const next = { ...prev };
                delete next[entryKey];
                return next;
              });
              setForm((prev) => ({
                ...prev,
                billing: {
                  ...prev.billing,
                  guardianEntries: prev.billing.guardianEntries.map((entry) =>
                    entry.entryKey === entryKey
                      ? createEmptyAdditionalGuardianEntry(entry.relationship_type)
                      : entry,
                  ),
                },
              }));
            }}
            onRemoveAdditionalGuardian={(entryKey) => {
              setForm((prev) => ({
                ...prev,
                billing: {
                  ...prev.billing,
                  guardianEntries: prev.billing.guardianEntries.filter(
                    (entry) => entry.entryKey !== entryKey,
                  ),
                  billingGuardianEntryKey:
                    prev.billing.billingGuardianEntryKey === entryKey
                      ? null
                      : prev.billing.billingGuardianEntryKey,
                },
              }));
            }}
            usedGuardianIds={usedGuardianIds}
            linkedGuardianPersonsByEntryKey={linkedGuardianPersonsByEntryKey}
            guardian={{
              relationships: admissionOptionsState.options?.relationships ?? [],
              relationshipsLoading: admissionOptionsState.loading,
              relationshipLoadFailed,
            }}
          />

          <StudentCreateStyledSection
            icon="identity"
            title={t('admin.student360.familyRegistration.childrenTitle')}
            lead={t('admin.student360.familyRegistration.childrenLead')}
          >
            <div className="family-registration__children">
              {form.children.map((child, index) => {
                const intakeValues = intakeFromStudentProfile(child.profile);
                const errors = childErrorsByLocalId[child.localId] ?? {};
                const filteredLevels = filterLevelsByCycleId(
                  options?.levels ?? [],
                  child.profile.cycleId,
                  referenceLevels,
                  levelCycles,
                );
                const levelIdNum = child.profile.levelId
                  ? Number(child.profile.levelId)
                  : undefined;
                const selectedAdmissionLevel = findAdmissionLevel(
                  admissionOptionsState.options?.levels ?? [],
                  levelIdNum,
                );
                const filteredStreams = filterStreamsByLevel(
                  admissionOptionsState.options?.streams ?? [],
                  levelIdNum,
                );
                const classScope = buildEnrollmentClassScope(
                  child.profile.levelId,
                  child.profile.academicYearId,
                  resolvedSchoolId,
                );
                const filteredClasses = filterClassesForEnrollment(
                  options?.classes ?? [],
                  classScope,
                );
                const showStreamField = Boolean(selectedAdmissionLevel?.requires_stream);

                return (
                  <article
                    key={child.localId}
                    className="family-registration__child-card"
                    data-testid={`family-child-${index}`}
                  >
                    <div className="family-registration__child-card-head">
                      <h3>
                        {t('admin.student360.familyRegistration.childHeading', {
                          index: index + 1,
                        })}
                        {childDisplayName(child.profile) !== '—'
                          ? ` — ${childDisplayName(child.profile)}`
                          : ''}
                      </h3>
                      {form.children.length > 1 ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            setForm((prev) =>
                              removeFamilyRegistrationChild(prev, child.localId),
                            )
                          }
                        >
                          {t('admin.student360.familyRegistration.removeChild')}
                        </button>
                      ) : null}
                    </div>

                    <EnrollmentIntakeIdentityFields
                      values={intakeValues}
                      errors={intakeErrorsFromStudentProfile(errors)}
                      onPatch={(patch) => {
                        setForm((prev) =>
                          patchFamilyRegistrationChildProfile(prev, child.localId, {
                            ...child.profile,
                            ...patchStudentProfileFromIntake(patch),
                          }),
                        );
                        setChildErrorsByLocalId((prev) => ({ ...prev, [child.localId]: {} }));
                      }}
                      optionsLoading={optionsState.loading}
                      genders={localizedGenders}
                      nationalities={options?.nationalities ?? []}
                      variant="studentCreate"
                    />

                    <EnrollmentIntakeAcademicFields
                      variant="studentCreate"
                      values={intakeValues}
                      errors={intakeErrorsFromStudentProfile(errors)}
                      onPatch={(patch) => {
                        setForm((prev) => {
                          let nextProfile = {
                            ...child.profile,
                            ...patchStudentProfileFromIntake(patch),
                          };
                          if (
                            patch.cycleId != null &&
                            patch.cycleId !== child.profile.cycleId
                          ) {
                            nextProfile = {
                              ...nextProfile,
                              levelId: '',
                              classId: '',
                              streamId: '',
                            };
                          }
                          if (
                            patch.levelId != null &&
                            patch.levelId !== child.profile.levelId
                          ) {
                            nextProfile = { ...nextProfile, classId: '', streamId: '' };
                            const level = options?.levels?.find(
                              (item) => String(item.id) === nextProfile.levelId,
                            );
                            if (level && !nextProfile.cycleId) {
                              const cycleId = resolveStudentLevelCycleId(
                                level,
                                cycleByCode,
                                levelCycles,
                              );
                              if (cycleId != null) {
                                nextProfile = { ...nextProfile, cycleId: String(cycleId) };
                              }
                            }
                          }
                          return patchFamilyRegistrationChildProfile(
                            prev,
                            child.localId,
                            nextProfile,
                          );
                        });
                        setChildErrorsByLocalId((prev) => ({ ...prev, [child.localId]: {} }));
                      }}
                      academic={{
                        cycleMode: 'id',
                        years: options?.academicYears ?? [],
                        cycles: intakeCycles,
                        levels: filteredLevels,
                        streams: filteredStreams,
                        classes: filteredClasses,
                        registrationTypes: options?.registrationTypes ?? [],
                        levelRequiresStream: showStreamField,
                        optionsLoading: optionsState.loading,
                        cyclesLoading: levelOptionsState.loading,
                        optionsError: !!optionsState.error,
                        onRetryOptions: optionsState.reload,
                        streamRequired: showStreamField,
                        activeSchoolId: resolvedSchoolId,
                        showClassSummary: true,
                      }}
                    />

                    {summary.guardians.length > 0 ? (
                      <div className="family-registration__relationships">
                        <h4>{t('admin.student360.familyRegistration.relationshipsTitle')}</h4>
                        <ul>
                          {summary.guardians.map((guardian) => {
                            const entryKey = guardian.entryKey;
                            const value =
                              child.relationshipByEntryKey[entryKey] ?? guardian.relationship_type;
                            const name =
                              guardian.kind === 'existing'
                                ? guardian.displayName
                                : guardian.full_name;
                            const relationshipOptions =
                              admissionOptionsState.options?.relationships?.length
                                ? admissionOptionsState.options.relationships.map((relationship) => ({
                                    value: String(
                                      relationship.value ?? relationship.id ?? '',
                                    ),
                                    label: relationship.label,
                                  }))
                                : RELATIONSHIP_TYPE_CODES.map((code) => ({
                                    value: code,
                                    label: relationshipTypeLabel(t, code),
                                  }));
                            return (
                              <li key={entryKey}>
                                <label>
                                  <span>{name}</span>
                                  <select
                                    value={value}
                                    onChange={(event) => {
                                      const nextType = event.target.value as RelationshipType;
                                      setForm((prev) => ({
                                        ...prev,
                                        children: prev.children.map((item) =>
                                          item.localId === child.localId
                                            ? {
                                                ...item,
                                                relationshipByEntryKey: {
                                                  ...item.relationshipByEntryKey,
                                                  [entryKey]: nextType,
                                                },
                                              }
                                            : item,
                                        ),
                                      }));
                                    }}
                                  >
                                    {relationshipOptions
                                      .filter((relationship) => relationship.value)
                                      .map((relationship) => (
                                        <option
                                          key={relationship.value}
                                          value={relationship.value}
                                        >
                                          {relationship.label ||
                                            relationshipTypeLabel(t, relationship.value)}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="family-registration__children-actions">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={form.children.length >= 10}
                onClick={() => setForm((prev) => addFamilyRegistrationChild(prev))}
              >
                {t('admin.student360.familyRegistration.addChild')}
              </button>
            </div>
          </StudentCreateStyledSection>

          <StudentCreateStyledSection
            icon="review"
            title={t('admin.student360.familyRegistration.reviewTitle')}
            lead={t('admin.student360.familyRegistration.reviewLead')}
          >
            <div className="family-registration__review" data-testid="family-registration-review">
              <section>
                <h3>{t('admin.student360.familyRegistration.reviewGuardians')}</h3>
                <ul>
                  {summary.guardians.map((guardian) => (
                    <li key={guardian.entryKey}>
                      {(guardian.kind === 'existing'
                        ? guardian.displayName
                        : guardian.full_name) +
                        ' — ' +
                        relationshipTypeLabel(t, guardian.relationship_type) +
                        (guardian.kind === 'existing'
                          ? ` (${t('admin.student360.familyRegistration.existingGuardian')})`
                          : ` (${t('admin.student360.familyRegistration.newGuardian')})`)}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>{t('admin.student360.familyRegistration.reviewBilling')}</h3>
                <p>
                  {summary.billingMode === 'student'
                    ? t('admin.student360.create.billingResponsibility.partnerStudent')
                    : summary.billingGuardianName
                      ? summary.billingGuardianName
                      : t('admin.student360.familyRegistration.billingMissing')}
                </p>
                {summary.missingBillingGuardian ? (
                  <p className="family-registration__alert" role="alert">
                    {t(
                      'admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired',
                    )}
                  </p>
                ) : null}
              </section>
              <section>
                <h3>{t('admin.student360.familyRegistration.reviewChildren')}</h3>
                <ul>
                  {summary.children.map((child) => (
                    <li key={child.localId}>
                      <strong>{child.displayName}</strong>
                      <ul>
                        {child.relationships.map((relationship) => (
                          <li key={relationship.entryKey}>
                            {relationship.name} —{' '}
                            {relationshipTypeLabel(t, relationship.relationship_type)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
              <p className="family-registration__mode-note" role="note">
                {t('admin.student360.familyRegistration.batchNote')}
              </p>
            </div>
          </StudentCreateStyledSection>

          <div className="student-create-form__actions family-registration__actions">
            <Link href="/admin/students/new" className="btn btn--ghost">
              {t('admin.student360.familyRegistration.singleStudentInstead')}
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting || (submitState.lockedAgainstFullResubmit && !retryFailedOnly)}
              onClick={() =>
                void handleSubmitFamily(retryFailedOnly ? { retryFailedOnly: true } : undefined)
              }
            >
              {submitting
                ? t('admin.student360.familyRegistration.submitting')
                : retryFailedOnly
                  ? t('admin.student360.familyRegistration.retryFailed')
                  : t('admin.student360.familyRegistration.confirmBatchRegister')}
            </button>
          </div>
        </>
      ) : null}

      {view === 'result' ? (
        <StudentCreateStyledSection
          icon="review"
          title={t('admin.student360.familyRegistration.resultTitle')}
          lead={t(`admin.student360.familyRegistration.resultLead.${outcome.kind}`)}
        >
          <div
            className="family-registration__outcome-banner"
            data-testid="family-registration-outcome"
            data-outcome={outcome.kind}
            role="status"
          >
            {outcome.kind === 'partial_success' ? (
              <p className="student-create-form__notice">
                {t('admin.student360.familyRegistration.partialSuccessNote')}
              </p>
            ) : null}
          </div>

          <dl
            className="family-registration__batch-summary"
            data-testid="family-registration-batch-summary"
            data-succeeded={outcome.succeeded}
            data-failed={outcome.failed + outcome.ambiguous + outcome.blocked}
          >
            <div>
              <dt>{t('admin.student360.familyRegistration.batchSummary.requested')}</dt>
              <dd>{submitState.results.length}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.familyRegistration.batchSummary.succeeded')}</dt>
              <dd>{outcome.succeeded}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.familyRegistration.batchSummary.failed')}</dt>
              <dd>{outcome.failed + outcome.ambiguous + outcome.blocked}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.familyRegistration.batchSummary.status')}</dt>
              <dd>
                {t(
                  `admin.student360.familyRegistration.batchStatus.${
                    submitState.batchStatus === 'completed' ||
                    submitState.batchStatus === 'partially_completed' ||
                    submitState.batchStatus === 'failed'
                      ? submitState.batchStatus
                      : outcome.kind === 'full_success'
                        ? 'completed'
                        : outcome.kind === 'partial_success'
                          ? 'partially_completed'
                          : 'failed'
                  }`,
                )}
              </dd>
            </div>
          </dl>

          <ul className="family-registration__results" data-testid="family-registration-results">
            {submitState.results.map((result) => (
              <li
                key={result.localId}
                data-status={result.status}
                data-replayed={result.replayed ? 'true' : undefined}
                className="family-registration__result-item"
              >
                <div>
                  <strong>{result.displayName}</strong>
                  <span>{t(`admin.student360.familyRegistration.status.${result.status}`)}</span>
                </div>
                {result.replayed ? (
                  <p className="student-create-form__notice" role="status">
                    {t('admin.student360.familyRegistration.replayedNotice')}
                  </p>
                ) : null}
                {result.studentReference ? (
                  <p className="mono tiny" dir="ltr">
                    {t('admin.student360.familyRegistration.studentReference')}: {' '}
                    {result.studentReference}
                  </p>
                ) : null}
                {result.errorMessage &&
                result.errorMessage !== 'guardians_unresolved' &&
                result.errorMessage !== 'stopped_after_failure' &&
                result.errorMessage !== 'stopped_after_ambiguous' &&
                result.errorMessage !== 'network_error' ? (
                  <p role="status">{result.errorMessage}</p>
                ) : null}
                {result.errorCode === 'guardians_unresolved' ? (
                  <p role="status">
                    {t('admin.student360.familyRegistration.errors.guardiansUnresolved')}
                  </p>
                ) : null}
                {result.status === 'ambiguous' ? (
                  <p role="status">
                    {t('admin.student360.familyRegistration.errors.ambiguousFailure')}
                  </p>
                ) : null}
                <div className="family-registration__result-links">
                  {result.studentId ? (
                    <>
                      <Link
                        href={`/admin/students/${result.studentId}`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t('admin.student360.familyRegistration.openStudent')}
                      </Link>
                      <Link
                        href={`/admin/students/${result.studentId}?tab=finance`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t('admin.student360.familyRegistration.openFinance')}
                      </Link>
                    </>
                  ) : null}
                  {result.status === 'failed' && result.canRetrySafely ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setView('registration')}
                    >
                      {t('admin.student360.familyRegistration.editFailedChild')}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="family-registration__result-actions">
            {shouldOfferFamilyFailedRetry(submitState.results) ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting}
                data-testid="family-registration-retry-failed"
                onClick={() => void handleSubmitFamily({ retryFailedOnly: true })}
              >
                {t('admin.student360.familyRegistration.retryFailed')}
              </button>
            ) : null}
            {outcome.kind === 'full_success' || outcome.succeeded > 0 ? (
              <>
                <RegistrationPostCreateCollectionEntry
                  succeededStudentIds={succeededCollectionStudentIds}
                  studentNameById={succeededCollectionStudentNames}
                />
                <button type="button" className="btn btn--primary" onClick={goToFinanceSetup}>
                  {t('admin.student360.familyRegistration.continueToFinance')}
                </button>
                <Link href="/admin/students" className="btn btn--secondary">
                  {t('admin.student360.familyRegistration.backToList')}
                </Link>
                <button type="button" className="btn btn--ghost" onClick={resetFamilyRegistration}>
                  {t('admin.student360.familyRegistration.registerAnotherFamily')}
                </button>
              </>
            ) : null}
            {outcome.kind === 'full_failure' && !submitting ? (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setView('registration')}
              >
                {t('admin.student360.familyRegistration.backToReview')}
              </button>
            ) : null}
          </div>
        </StudentCreateStyledSection>
      ) : null}

      {view === 'finance' || view === 'finance_result' ? (
        <FamilyRegistrationFinancePanel
          mode={view === 'finance_result' ? 'finance_result' : 'finance'}
          drafts={financeDrafts}
          submitState={financeSubmitState}
          onDraftsChange={setFinanceDrafts}
          onSubmitStateChange={setFinanceSubmitState}
          onBackToRegistrationResult={() => setView('result')}
          onBackToSetup={backToFinanceSetup}
          onCompleted={() => setView('finance_result')}
        />
      ) : null}
    </div>
  );
}
