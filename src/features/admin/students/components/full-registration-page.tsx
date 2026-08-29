'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { useToast } from '@/components/ui/toast';
import { useStudentOptions } from '../hooks/use-student-options';
import { useFeePlanSuggest } from '../hooks/use-fee-plan-suggest';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import {
  buildEnrollmentCycleOptions,
  filterLevelsByCycleId,
} from '../utils/student-enrollment-cycle';
import {
  resolvePersonPartnerId,
  resolvePersonSchoolParentId,
} from '../utils/student-create-guardian-payload';
import {
  GUARDIAN_GLOBAL_SEARCH_MIN_QUERY,
  searchGuardiansGlobally,
} from '../utils/guardian-global-search';
import { resolveStudentCreateJourneyCapabilities } from '../utils/student-create-journey-rbac';
import { todayIsoDate } from '../utils/student-profile';
import type { EnrollmentPlanLine } from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import {
  buildFullRegistrationPayload,
  selectedFullRegistrationGuardians,
  validateFullRegistrationDraft,
  type FullRegistrationBuildInput,
  type FullRegistrationFamilyContext,
  type FullRegistrationGuardianDraft,
  type FullRegistrationPricingAdjustment,
  type FullRegistrationStudentDraft,
} from '../utils/full-registration-contract';
import {
  FULL_REGISTRATION_DEFAULT_GENDER,
  FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  fullRegistrationErrorMessageKey,
  fullRegistrationGenderLabel,
} from '../utils/full-registration-ui';
import { fullRegistrationCopy } from '../utils/full-registration-copy';
import styles from './full-registration-page.module.css';

type GuardianKey = 'father' | 'mother' | 'single';

type PricingDraft = {
  price: string;
  from: string;
  to: string;
  reason: string;
};

type SuccessState = {
  studentId: number;
  studentCode: string | null;
  classStatus: string;
  className: string | null;
  availableNextActions: string[];
};

const FAMILY_OPTIONS: FullRegistrationFamilyContext[] = [
  'parents_together',
  'separated_or_divorced',
  'single_guardian',
  'guardianship',
  'special',
];

const FAMILY_LABEL_KEYS: Record<FullRegistrationFamilyContext, string> = {
  parents_together: 'parentsTogether',
  separated_or_divorced: 'separated',
  single_guardian: 'singleGuardian',
  guardianship: 'guardianship',
  special: 'special',
};

function emptyGuardian(key: GuardianKey, relationshipType: string): FullRegistrationGuardianDraft {
  return {
    key,
    mode: 'new',
    relationshipType,
    linkedGuardianId: null,
    linkedPersonId: null,
    nameAr: '',
    nameFr: '',
    preferredLanguage: 'ar',
    phone: '',
    identity: '',
    legal: false,
    financial: false,
    pickup: true,
  };
}

function inputValueNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function lineAmount(line: EnrollmentPlanLine): number | null {
  const raw =
    line.monthly_installment_amount ??
    line.installment_amount ??
    line.amount ??
    line.base_amount ??
    null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function responseRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function responseNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function responseString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function GuardianCard({
  title,
  kind,
  draft,
  onChange,
  activeSchoolId,
  showRights,
  allowRelationshipChoice,
  copy,
}: {
  title: string;
  kind: 'father' | 'mother' | 'generic';
  draft: FullRegistrationGuardianDraft;
  onChange: (next: FullRegistrationGuardianDraft) => void;
  activeSchoolId: number | null;
  showRights: boolean;
  allowRelationshipChoice?: boolean;
  copy: (key: string) => string;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PersonSearchResult[]>([]);

  useEffect(() => {
    if (draft.mode !== 'existing' || draft.linkedGuardianId || draft.linkedPersonId) {
      setResults([]);
      setSearching(false);
      return;
    }
    const query = debouncedSearch.trim();
    if (query.length < GUARDIAN_GLOBAL_SEARCH_MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    searchGuardiansGlobally({ query, activeSchoolId, limit: 6 })
      .then((items) => {
        if (active) setResults(items);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [activeSchoolId, debouncedSearch, draft.linkedGuardianId, draft.linkedPersonId, draft.mode]);

  function switchMode(mode: FullRegistrationGuardianDraft['mode']) {
    setSearch('');
    setResults([]);
    setSearching(false);
    onChange({
      ...draft,
      mode,
      linkedGuardianId: null,
      linkedPersonId: null,
    });
  }

  function selectExisting(person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    const personId = resolvePersonPartnerId(person);
    onChange({
      ...draft,
      mode: 'existing',
      linkedGuardianId: guardianId,
      linkedPersonId: guardianId ? null : personId,
      nameAr: person.name ?? '',
      nameFr: '',
      phone: person.phone ?? '',
    });
    setSearch('');
    setResults([]);
  }

  const cardClass = [
    styles.guardianCard,
    kind === 'father'
      ? styles.guardianFather
      : kind === 'mother'
        ? styles.guardianMother
        : styles.guardianGeneric,
  ].join(' ');

  const linked = draft.mode === 'existing' && Boolean(draft.linkedGuardianId || draft.linkedPersonId);

  return (
    <section className={cardClass}>
      <div className={styles.guardianHead}>
        <h3 className={styles.guardianTitle}>{title}</h3>
        <div className={styles.modeSwitch} role="group" aria-label={title}>
          <button
            type="button"
            aria-pressed={draft.mode === 'new'}
            className={`${styles.modeButton} ${draft.mode === 'new' ? styles.modeButtonActive : ''}`}
            onClick={() => switchMode('new')}
          >
            {copy('newGuardian')}
          </button>
          <button
            type="button"
            aria-pressed={draft.mode === 'existing'}
            className={`${styles.modeButton} ${draft.mode === 'existing' ? styles.modeButtonActive : ''}`}
            onClick={() => switchMode('existing')}
          >
            {copy('existingGuardian')}
          </button>
        </div>
      </div>

      {allowRelationshipChoice ? (
        <label className={styles.field}>
          <span className={styles.label}>{copy('guardian')}</span>
          <select
            className="input"
            value={draft.relationshipType}
            onChange={(event) => onChange({ ...draft, relationshipType: event.target.value })}
          >
            <option value="father">{copy('father')}</option>
            <option value="mother">{copy('mother')}</option>
            <option value="legal_guardian">{copy('guardian')}</option>
          </select>
        </label>
      ) : null}

      {draft.mode === 'new' ? (
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.col6}`}>
            <span className={styles.label}>{copy('nameAr')}</span>
            <input
              className="input"
              value={draft.nameAr}
              onChange={(event) => onChange({ ...draft, nameAr: event.target.value })}
              autoComplete="name"
            />
          </label>
          <label className={`${styles.field} ${styles.col6}`}>
            <span className={styles.label}>{copy('nameFr')}</span>
            <input
              className="input"
              dir="ltr"
              value={draft.nameFr}
              onChange={(event) => onChange({ ...draft, nameFr: event.target.value })}
            />
          </label>
          <label className={`${styles.field} ${styles.col6}`}>
            <span className={styles.label}>{copy('phone')}</span>
            <input
              className="input"
              dir="ltr"
              inputMode="tel"
              value={draft.phone}
              onChange={(event) => onChange({ ...draft, phone: event.target.value })}
            />
          </label>
          <label className={`${styles.field} ${styles.col6}`}>
            <span className={styles.label}>{copy('preferredLanguage')}</span>
            <select
              className="input"
              value={draft.preferredLanguage}
              onChange={(event) =>
                onChange({ ...draft, preferredLanguage: event.target.value === 'fr' ? 'fr' : 'ar' })
              }
            >
              <option value="ar">{copy('arabic')}</option>
              <option value="fr">{copy('french')}</option>
            </select>
          </label>
          <label className={`${styles.field} ${styles.col12}`}>
            <span className={styles.label}>{copy('identity')}</span>
            <input
              className="input"
              value={draft.identity}
              onChange={(event) => onChange({ ...draft, identity: event.target.value })}
            />
          </label>
        </div>
      ) : linked ? (
        <div className={styles.linkedBox}>
          <div className={styles.guardianHead}>
            <div>
              <span className={styles.badge}>✓ {copy('linked')}</span>
              <div className={styles.searchName}>{draft.nameAr || draft.nameFr || '—'}</div>
              {draft.phone ? <div className={styles.muted} dir="ltr">{draft.phone}</div> : null}
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onChange({ ...draft, linkedGuardianId: null, linkedPersonId: null, nameAr: '', phone: '' })}
            >
              {copy('change')}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.field}>
          <span className={styles.label}>{copy('search')}</span>
          <input
            type="search"
            className={`input ${styles.searchInput}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
            autoFocus
          />
          {searching ? <div className={styles.muted}>{copy('searching')}</div> : null}
          {!searching && debouncedSearch.trim().length >= GUARDIAN_GLOBAL_SEARCH_MIN_QUERY && results.length === 0 ? (
            <div className={styles.muted}>{copy('noMatches')}</div>
          ) : null}
          {results.length ? (
            <div className={styles.searchResults}>
              {results.map((person) => (
                <div className={styles.searchResult} key={`${person.partner_id}-${person.guardian_id ?? 'person'}`}>
                  <div className={styles.searchMeta}>
                    <div className={styles.searchName}>{person.name}</div>
                    <div className={styles.muted} dir="ltr">{person.phone ?? '—'}</div>
                  </div>
                  <button type="button" className="btn btn--ghost" onClick={() => selectExisting(person)}>
                    {copy('useGuardian')}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {showRights ? (
        <div className={styles.rights}>
          <strong>{copy('rights')}</strong>
          <label className={styles.checkLine}>
            <input
              type="checkbox"
              checked={draft.legal}
              onChange={(event) => onChange({ ...draft, legal: event.target.checked })}
            />
            {copy('legal')}
          </label>
          <label className={styles.checkLine}>
            <input
              type="checkbox"
              checked={draft.financial}
              onChange={(event) => onChange({ ...draft, financial: event.target.checked })}
            />
            {copy('financial')}
          </label>
          <label className={styles.checkLine}>
            <input
              type="checkbox"
              checked={draft.pickup}
              onChange={(event) => onChange({ ...draft, pickup: event.target.checked })}
            />
            {copy('pickup')}
          </label>
        </div>
      ) : null}
    </section>
  );
}

export function FullRegistrationPage() {
  const router = useRouter();
  const toast = useToast();
  const { locale } = useLocale();
  const copy = (key: string) => fullRegistrationCopy(locale, key);
  const { activeSchoolId } = useAdminSession();
  const user = useSession();
  const capabilities = useMemo(() => resolveStudentCreateJourneyCapabilities(user), [user]);
  const optionsState = useStudentOptions();
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });

  const [academicYearId, setAcademicYearId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(todayIsoDate());
  const [student, setStudent] = useState<FullRegistrationStudentDraft>({
    firstNameAr: '',
    lastNameAr: '',
    firstNameFr: '',
    lastNameFr: '',
    gender: FULL_REGISTRATION_DEFAULT_GENDER,
    dateOfBirth: '',
    previousSchool: '',
    address: '',
  });
  const [familyContext, setFamilyContext] = useState<FullRegistrationFamilyContext>('parents_together');
  const [guardians, setGuardians] = useState<Record<GuardianKey, FullRegistrationGuardianDraft>>({
    father: emptyGuardian('father', 'father'),
    mother: emptyGuardian('mother', 'mother'),
    single: emptyGuardian('single', 'legal_guardian'),
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<number, PricingDraft>>({});
  const [pricingOpen, setPricingOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const resolvedSchoolId = useMemo(() => {
    if (activeSchoolId != null) return activeSchoolId;
    if (optionsState.options?.schools.length === 1) return optionsState.options.schools[0].id;
    return null;
  }, [activeSchoolId, optionsState.options?.schools]);

  const schoolName = useMemo(() => {
    if (!resolvedSchoolId) return '—';
    return optionsState.options?.schools.find((school) => school.id === resolvedSchoolId)?.name ?? '—';
  }, [optionsState.options?.schools, resolvedSchoolId]);

  useEffect(() => {
    if (academicYearId || !optionsState.options?.academicYears.length) return;
    const current = optionsState.options.academicYears.find((year) => year.is_current);
    setAcademicYearId(String((current ?? optionsState.options.academicYears[0]).id));
  }, [academicYearId, optionsState.options?.academicYears]);

  useEffect(() => {
    if (familyContext === 'guardianship') {
      setGuardians((prev) => ({
        ...prev,
        single: { ...prev.single, relationshipType: 'legal_guardian' },
      }));
    }
  }, [familyContext]);

  const levelsForYear = useMemo(() => {
    const levels = optionsState.options?.levels ?? [];
    if (!academicYearId) return levels;
    return levels.filter(
      (level) => level.academic_year_id == null || String(level.academic_year_id) === academicYearId,
    );
  }, [academicYearId, optionsState.options?.levels]);

  const cycleOptions = useMemo(
    () =>
      buildEnrollmentCycleOptions(
        levelsForYear,
        levelOptionsState.options?.reference_levels ?? [],
        levelOptionsState.options?.cycles ?? [],
      ),
    [levelOptionsState.options, levelsForYear],
  );

  const levelOptions = useMemo(
    () =>
      filterLevelsByCycleId(
        levelsForYear,
        cycleId,
        levelOptionsState.options?.reference_levels ?? [],
        levelOptionsState.options?.cycles ?? [],
      ),
    [cycleId, levelOptionsState.options, levelsForYear],
  );

  const feePlanQuery = useMemo(() => {
    if (!resolvedSchoolId || !academicYearId || !levelId || !enrollmentDate) return null;
    return {
      school_id: resolvedSchoolId,
      academic_year_id: Number(academicYearId),
      level_id: Number(levelId),
      enrollment_date: enrollmentDate,
    };
  }, [academicYearId, enrollmentDate, levelId, resolvedSchoolId]);

  const suggestState = useFeePlanSuggest(feePlanQuery);
  const optionalLines = useMemo(
    () => (suggestState.suggest?.plan_lines ?? []).filter((line) => line.is_optional && line.fee_type_id),
    [suggestState.suggest?.plan_lines],
  );

  useEffect(() => {
    const eligible = new Set(optionalLines.map((line) => Number(line.fee_type_id)));
    setSelectedServiceIds((prev) => prev.filter((id) => eligible.has(id)));
  }, [optionalLines]);

  const selectedGuardians = useMemo(() => {
    if (familyContext === 'single_guardian' || familyContext === 'guardianship') {
      return [guardians.single];
    }
    return [guardians.father, guardians.mother];
  }, [familyContext, guardians]);

  const showRights = familyContext === 'separated_or_divorced' || familyContext === 'special';

  const adjustableLines = useMemo(() => {
    const lines = suggestState.suggest?.plan_lines ?? [];
    const selected = new Set(selectedServiceIds);
    return lines.filter((line) => !line.is_optional || (line.fee_type_id != null && selected.has(line.fee_type_id)));
  }, [selectedServiceIds, suggestState.suggest?.plan_lines]);

  const selectedServiceNames = useMemo(() => {
    const selected = new Set(selectedServiceIds);
    return optionalLines
      .filter((line) => line.fee_type_id != null && selected.has(line.fee_type_id))
      .map((line) => line.fee_type_name);
  }, [optionalLines, selectedServiceIds]);

  const selectedLevelName = useMemo(
    () => levelOptions.find((level) => String(level.id) === levelId)?.display_name ?? levelOptions.find((level) => String(level.id) === levelId)?.name ?? '—',
    [levelId, levelOptions],
  );

  const payerName = useMemo(() => {
    const selected = selectedFullRegistrationGuardians(selectedGuardians);
    const explicit = selected.find((guardian) => guardian.financial);
    const guardian = explicit ?? selected[0];
    return guardian?.nameAr || guardian?.nameFr || '—';
  }, [selectedGuardians]);

  function updateGuardian(key: GuardianKey, next: FullRegistrationGuardianDraft) {
    setGuardians((prev) => ({ ...prev, [key]: next }));
    setError(null);
  }

  function pricingAdjustments(): FullRegistrationPricingAdjustment[] {
    return adjustableLines.flatMap((line) => {
      const draft = pricingDrafts[line.line_id];
      if (!draft) return [];
      const price = inputValueNumber(draft.price);
      if (price == null && !draft.from.trim() && !draft.to.trim()) return [];
      return [
        {
          itemKey: String(line.line_id),
          adjustedUnitPrice: price,
          periodFrom: draft.from,
          periodTo: draft.to,
          reason: draft.reason,
        },
      ];
    });
  }

  function buildInput(): FullRegistrationBuildInput {
    return {
      academic: {
        schoolId: resolvedSchoolId,
        academicYearId,
        cycleId,
        levelId,
        enrollmentDate,
      },
      student,
      familyContext,
      guardians: selectedGuardians,
      selectedServiceIds,
      pricingAdjustments: pricingAdjustments(),
    };
  }

  function validationMessage(errors: string[]): string {
    if (errors.includes('special_family_legal_responsible_required')) return copy('specialLegalError');
    if (errors.includes('special_family_billing_responsible_required')) return copy('specialBillingError');
    if (errors.includes('pricing_adjustment_reason_required')) return copy('pricingReasonError');
    return copy('requiredError');
  }

  async function submit() {
    if (saving) return;
    setError(null);
    const input = buildInput();
    const validation = validateFullRegistrationDraft(input);
    if (!validation.valid) {
      const message = validationMessage(validation.errors);
      setError(message);
      toast.error(message);
      return;
    }
    if (suggestState.loading) {
      setError(copy('loadingServices'));
      return;
    }
    if (!suggestState.suggest || suggestState.error) {
      const message = suggestState.error?.code?.includes('ambiguous')
        ? copy('planAmbiguous')
        : copy('planMissing');
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    const payload = buildFullRegistrationPayload(input);
    const result = await api.post<Record<string, unknown>>(endpoints.admin.students, payload);
    setSaving(false);

    if (!result.success) {
      const message = copy(fullRegistrationErrorMessageKey(String(result.error?.code ?? '')));
      setError(message);
      toast.error(message);
      return;
    }

    const data = responseRecord(result.data) ?? {};
    const studentBlock = responseRecord(data.student);
    const studentId =
      responseNumber(data.student_id) ??
      responseNumber(data.id) ??
      responseNumber(studentBlock?.id);
    if (!studentId) {
      setError(copy('genericError'));
      return;
    }
    const classAssignment = responseRecord(data.class_assignment);
    const actions = Array.isArray(data.available_next_actions)
      ? data.available_next_actions.filter((item): item is string => typeof item === 'string')
      : [];
    setSuccess({
      studentId,
      studentCode: responseString(data.student_code) ?? responseString(data.code),
      classStatus: responseString(data.class_assignment_status) ?? responseString(classAssignment?.status) ?? 'pending',
      className: responseString(classAssignment?.class_name),
      availableNextActions: actions,
    });
    toast.success(copy('successTitle'));
  }

  if (success) {
    return (
      <div className={styles.page}>
        <section className={styles.success}>
          <h1 className={styles.successTitle}>✓ {copy('successTitle')}</h1>
          <p>{copy('successLead')}</p>
          {success.studentCode ? <div className={styles.muted}>{success.studentCode}</div> : null}
          <div className={styles.summary}>
            <strong>{copy('assignedClass')}:</strong>
            <span>
              {success.classStatus === 'assigned'
                ? success.className ?? copy('assignedClass')
                : copy('pendingClass')}
            </span>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn--primary" onClick={() => router.push(`/admin/students/${success.studentId}`)}>
              {copy('openStudent')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => window.location.assign('/admin/students/new')}>
              {copy('registerAnother')}
            </button>
            {success.availableNextActions.includes('collect_now') ? (
              <button type="button" className="btn btn--ghost" onClick={() => router.push(`/admin/students/${success.studentId}?tab=finance`)}>
                {copy('collectNow')}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{copy('title')}</h1>
          <p className={styles.subtitle}>{copy('subtitle')}</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => router.push('/admin/students')}>
          {copy('cancel')}
        </button>
      </header>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {optionsState.error ? (
        <div className={styles.error} role="alert">
          {copy('optionsFailed')}{' '}
          <button type="button" className="btn btn--ghost" onClick={optionsState.reload}>{copy('retry')}</button>
        </div>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('academic')}</h2>
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.col3}`}>
            <span className={styles.label}>{copy('school')}</span>
            <span className={styles.readonly}>{schoolName}</span>
          </label>
          <label className={`${styles.field} ${styles.col3}`}>
            <span className={styles.label}>{copy('year')}</span>
            <select
              className="input"
              value={academicYearId}
              onChange={(event) => {
                setAcademicYearId(event.target.value);
                setCycleId('');
                setLevelId('');
              }}
              disabled={optionsState.loading}
            >
              <option value="">{copy('select')}</option>
              {(optionsState.options?.academicYears ?? []).map((year) => (
                <option value={year.id} key={year.id}>{year.name}</option>
              ))}
            </select>
          </label>
          <label className={`${styles.field} ${styles.col3}`}>
            <span className={styles.label}>{copy('cycle')}</span>
            <select
              className="input"
              value={cycleId}
              onChange={(event) => {
                setCycleId(event.target.value);
                setLevelId('');
              }}
              disabled={levelOptionsState.loading}
            >
              <option value="">{copy('select')}</option>
              {cycleOptions.map((cycle) => (
                <option value={cycle.id} key={cycle.id}>{cycle.name}</option>
              ))}
            </select>
          </label>
          <label className={`${styles.field} ${styles.col3}`}>
            <span className={styles.label}>{copy('level')}</span>
            <select
              className="input"
              value={levelId}
              onChange={(event) => setLevelId(event.target.value)}
              disabled={!cycleId || optionsState.loading}
            >
              <option value="">{copy('select')}</option>
              {levelOptions.map((level) => (
                <option value={level.id} key={level.id}>{level.display_name ?? level.name}</option>
              ))}
            </select>
          </label>
          <label className={`${styles.field} ${styles.col4}`}>
            <span className={styles.label}>{copy('enrollmentDate')}</span>
            <input className="input" type="date" value={enrollmentDate} onChange={(event) => setEnrollmentDate(event.target.value)} />
          </label>
        </div>
        <div className={styles.autoHint}>{copy('classAuto')}</div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('student')}</h2>
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.col6}`}><span className={styles.label}>{copy('firstNameAr')}</span><input className="input" value={student.firstNameAr} onChange={(event) => setStudent((prev) => ({ ...prev, firstNameAr: event.target.value }))} /></label>
          <label className={`${styles.field} ${styles.col6}`}><span className={styles.label}>{copy('lastNameAr')}</span><input className="input" value={student.lastNameAr} onChange={(event) => setStudent((prev) => ({ ...prev, lastNameAr: event.target.value }))} /></label>
          <label className={`${styles.field} ${styles.col6}`}><span className={styles.label}>{copy('firstNameFr')}</span><input className="input" dir="ltr" value={student.firstNameFr} onChange={(event) => setStudent((prev) => ({ ...prev, firstNameFr: event.target.value }))} /></label>
          <label className={`${styles.field} ${styles.col6}`}><span className={styles.label}>{copy('lastNameFr')}</span><input className="input" dir="ltr" value={student.lastNameFr} onChange={(event) => setStudent((prev) => ({ ...prev, lastNameFr: event.target.value }))} /></label>
          <label className={`${styles.field} ${styles.col4}`}>
            <span className={styles.label}>{copy('gender')}</span>
            <select className="input" value={student.gender} onChange={(event) => setStudent((prev) => ({ ...prev, gender: event.target.value }))}>
              {(optionsState.options?.genders ?? []).map((item) => (
                <option key={item.value} value={item.value}>
                  {fullRegistrationGenderLabel(locale, item.value, item.label)}
                </option>
              ))}
            </select>
          </label>
          <label className={`${styles.field} ${styles.col4}`}><span className={styles.label}>{copy('dob')}</span><input className="input" type="date" value={student.dateOfBirth} onChange={(event) => setStudent((prev) => ({ ...prev, dateOfBirth: event.target.value }))} /></label>
          <label className={`${styles.field} ${styles.col4}`}><span className={styles.label}>{copy('previousSchool')}</span><input className="input" value={student.previousSchool} onChange={(event) => setStudent((prev) => ({ ...prev, previousSchool: event.target.value }))} /></label>
          <label className={`${styles.field} ${styles.col12}`}><span className={styles.label}>{copy('address')}</span><input className="input" value={student.address} onChange={(event) => setStudent((prev) => ({ ...prev, address: event.target.value }))} /></label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('family')}</h2>
        <div className={styles.familyOptions}>
          {FAMILY_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              className={`${styles.familyOption} ${familyContext === option ? styles.familyOptionActive : ''}`}
              onClick={() => setFamilyContext(option)}
            >
              {copy(FAMILY_LABEL_KEYS[option])}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('guardians')}</h2>
        {familyContext === 'single_guardian' || familyContext === 'guardianship' ? (
          <GuardianCard
            title={copy('guardian')}
            kind="generic"
            draft={guardians.single}
            onChange={(next) => updateGuardian('single', next)}
            activeSchoolId={resolvedSchoolId}
            showRights={false}
            allowRelationshipChoice={familyContext === 'single_guardian'}
            copy={copy}
          />
        ) : (
          <div className={styles.guardianGrid}>
            <GuardianCard
              title={copy('father')}
              kind="father"
              draft={guardians.father}
              onChange={(next) => updateGuardian('father', next)}
              activeSchoolId={resolvedSchoolId}
              showRights={showRights}
              copy={copy}
            />
            <GuardianCard
              title={copy('mother')}
              kind="mother"
              draft={guardians.mother}
              onChange={(next) => updateGuardian('mother', next)}
              activeSchoolId={resolvedSchoolId}
              showRights={showRights}
              copy={copy}
            />
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('services')}</h2>
        <p className={styles.sectionLead}>{copy('servicesLead')}</p>
        {!feePlanQuery || suggestState.loading ? <p className={styles.muted}>{copy('loadingServices')}</p> : null}
        {feePlanQuery && suggestState.error ? <div className={styles.error}>{suggestState.error.code?.includes('ambiguous') ? copy('planAmbiguous') : copy('planMissing')}</div> : null}
        {suggestState.suggest && optionalLines.length === 0 ? <p className={styles.muted}>{copy('noServices')}</p> : null}
        {optionalLines.length ? (
          <div className={styles.servicesGrid}>
            {optionalLines.map((line) => {
              const serviceId = Number(line.fee_type_id);
              const selected = selectedServiceIds.includes(serviceId);
              const amount = lineAmount(line);
              return (
                <label key={line.line_id} className={`${styles.serviceCard} ${selected ? styles.serviceSelected : ''}`}>
                  <span className={styles.serviceTop}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) =>
                        setSelectedServiceIds((prev) =>
                          event.target.checked
                            ? Array.from(new Set([...prev, serviceId]))
                            : prev.filter((id) => id !== serviceId),
                        )
                      }
                    />
                    {line.fee_type_name}
                  </span>
                  <span className={styles.serviceAmount}>
                    {amount != null ? `${amount.toLocaleString(locale)} MAD` : '—'}
                    {line.frequency ? ` · ${line.frequency}` : ''}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
        {capabilities.canManageDiscounts && suggestState.suggest?.allowed_actions?.customize_plan ? (
          <div className={styles.actions} style={{ marginTop: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setPricingOpen(true)}>{copy('adjust')}</button>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('summary')}</h2>
        <div className={styles.summary}>
          <span><strong>{copy('level')}:</strong> {selectedLevelName}</span>
          <span><strong>{copy('payer')}:</strong> {payerName}</span>
          <span><strong>{copy('selectedServices')}:</strong> {selectedServiceNames.length ? selectedServiceNames.join('، ') : copy('none')}</span>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => router.push('/admin/students')}>{copy('cancel')}</button>
        <button type="button" className="btn btn--primary" data-testid="full-registration-submit" disabled={saving || optionsState.loading} onClick={() => void submit()}>
          {saving ? copy('saving') : copy('submit')}
        </button>
      </div>

      {pricingOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setPricingOpen(false)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="full-registration-pricing-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.guardianHead}>
              <h2 id="full-registration-pricing-title">{copy('adjustTitle')}</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setPricingOpen(false)}>{copy('cancel')}</button>
            </div>
            {adjustableLines.map((line) => {
              const draft = pricingDrafts[line.line_id] ?? { price: '', from: '', to: '', reason: '' };
              return (
                <div className={styles.adjustRow} key={line.line_id}>
                  <div>
                    <strong>{line.fee_type_name}</strong>
                    <div className={styles.muted}>{lineAmount(line) ?? '—'} MAD</div>
                  </div>
                  <label className={styles.field}>
                    <span className={styles.label}>{copy('price')}</span>
                    <input className="input" type="number" min="0" step="0.01" value={draft.price} placeholder={lineAmount(line)?.toString() ?? ''} onChange={(event) => setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, price: event.target.value } }))} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{copy('from')}</span>
                    <input className="input" type="month" disabled={Boolean(line.is_one_time)} value={draft.from} onChange={(event) => setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, from: event.target.value } }))} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{copy('to')}</span>
                    <input className="input" type="month" disabled={Boolean(line.is_one_time)} value={draft.to} onChange={(event) => setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, to: event.target.value } }))} />
                  </label>
                  <label className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.label}>{copy('reason')}</span>
                    <input className="input" value={draft.reason} onChange={(event) => setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, reason: event.target.value } }))} />
                  </label>
                </div>
              );
            })}
            <div className={styles.actions}>
              <button type="button" className="btn btn--primary" onClick={() => {
                const validation = validateFullRegistrationDraft(buildInput());
                if (validation.errors.includes('pricing_adjustment_reason_required')) {
                  setError(copy('pricingReasonError'));
                  return;
                }
                setPricingOpen(false);
                setError(null);
              }}>{copy('save')}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}