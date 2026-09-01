'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useAdmissionPrefill } from '@/features/admin/admissions/hooks/use-admission-prefill';
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
  type FullRegistrationValidationResult,
} from '../utils/full-registration-contract';
import {
  FULL_REGISTRATION_DEFAULT_GENDER,
  FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  fullRegistrationErrorMessageKey,
  fullRegistrationGenderLabel,
} from '../utils/full-registration-ui';
import { focusFirstFullRegistrationError } from '../utils/full-registration-validation-ux';
import { fullRegistrationCopy } from '../utils/full-registration-copy';
import {
  buildFullRegistrationCollectNowHref,
  buildFullRegistrationGuardianSuggestionQuery,
  fullRegistrationGuardianDisplayNames,
  fullRegistrationNameFieldOrder,
  fullRegistrationPricingPeriodDefaults,
} from '../utils/full-registration-requested-adjustments';
import {
  mapAdmissionPrefillToFullRegistration,
  parseFullRegistrationAdmissionId,
} from '../utils/full-registration-admission-prefill';
import styles from './full-registration-page.module.css';

type GuardianKey = 'father' | 'mother' | 'single';

type PricingDraft = {
  price: string;
  from: string;
  to: string;
};

type PricingFieldError = {
  price?: string;
  period?: string;
};

type SuccessState = {
  studentId: number;
  studentCode: string | null;
  classStatus: string;
  className: string | null;
  billingPartnerId: number | null;
  availableNextActions: string[];
};

type ValidationCopy = (key: string) => string;

type SuggestWithOptionalLines = NonNullable<ReturnType<typeof useFeePlanSuggest>['suggest']> & {
  optional_lines?: EnrollmentPlanLine[];
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
  const n = Number(value.trim().replace(',', '.'));
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

function isOneTimeLine(line: EnrollmentPlanLine): boolean {
  return Boolean(line.is_one_time || line.frequency === 'one_time');
}

function billingFrequencyLabel(locale: string, line: EnrollmentPlanLine): string {
  const oneTime = isOneTimeLine(line);
  const labels: Record<string, { monthly: string; oneTime: string }> = {
    ar: { monthly: 'شهريًا', oneTime: 'مرة واحدة' },
    fr: { monthly: 'par mois', oneTime: 'une seule fois' },
    en: { monthly: 'monthly', oneTime: 'one time' },
    es: { monthly: 'mensual', oneTime: 'una sola vez' },
  };
  const selected = labels[locale] ?? labels.en;
  if (oneTime) return selected.oneTime;
  if (!line.frequency || line.frequency === 'monthly') return selected.monthly;
  return '';
}

function academicPeriodBounds(referenceDate: string): { from: string; to: string } {
  const [yearText, monthText] = referenceDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { from: '', to: '' };
  }
  if (month >= 1 && month <= 6) {
    return { from: `${year - 1}-09`, to: `${year}-06` };
  }
  if (month >= 7 && month <= 8) {
    return { from: `${year}-09`, to: `${year + 1}-06` };
  }
  return { from: `${year}-09`, to: `${year + 1}-06` };
}

function monthOptions(referenceDate: string, locale: string): Array<{ value: string; label: string }> {
  const bounds = academicPeriodBounds(referenceDate);
  if (!bounds.from || !bounds.to) return [];
  const [startYear, startMonth] = bounds.from.split('-').map(Number);
  const [endYear, endMonth] = bounds.to.split('-').map(Number);
  const formatterLocale = locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-MA' : locale;
  const formatter = new Intl.DateTimeFormat(formatterLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const result: Array<{ value: string; label: string }> = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const value = `${year}-${String(month).padStart(2, '0')}`;
    result.push({ value, label: formatter.format(new Date(Date.UTC(year, month - 1, 1))) });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

function pricingValidationMessage(
  locale: string,
  code: 'invalidPrice' | 'incompletePeriod' | 'periodOrder' | 'outsideAcademicYear',
): string {
  const messages: Record<string, Record<typeof code, string>> = {
    ar: {
      invalidPrice: 'أدخل سعرًا صالحًا يساوي صفرًا أو أكثر.',
      incompletePeriod: 'حدد شهر البداية وشهر النهاية معًا.',
      periodOrder: 'شهر البداية يجب أن يسبق شهر النهاية أو يساويه.',
      outsideAcademicYear: 'الفترة يجب أن تكون داخل السنة الدراسية.',
    },
    fr: {
      invalidPrice: 'Saisissez un prix valide supérieur ou égal à zéro.',
      incompletePeriod: 'Sélectionnez le mois de début et le mois de fin.',
      periodOrder: 'Le mois de début doit précéder ou égaler le mois de fin.',
      outsideAcademicYear: 'La période doit rester dans l’année scolaire.',
    },
    en: {
      invalidPrice: 'Enter a valid price greater than or equal to zero.',
      incompletePeriod: 'Select both the start and end months.',
      periodOrder: 'The start month must be before or equal to the end month.',
      outsideAcademicYear: 'The period must stay within the academic year.',
    },
    es: {
      invalidPrice: 'Introduce un precio válido mayor o igual que cero.',
      incompletePeriod: 'Selecciona el mes inicial y el mes final.',
      periodOrder: 'El mes inicial debe ser anterior o igual al mes final.',
      outsideAcademicYear: 'El período debe estar dentro del año académico.',
    },
  };
  return (messages[locale] ?? messages.en)[code];
}

function validationErrorId(key: string): string {
  return `full-registration-error-${key.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

function validationCodeMessage(code: string, copy: ValidationCopy): string {
  if (code === 'special_family_legal_responsible_required') return copy('specialLegalError');
  if (code === 'special_family_billing_responsible_required') return copy('specialBillingError');
  if (code === 'pricing_adjustment_reason_required') return copy('pricingReasonError');
  return copy('requiredError');
}

function InlineValidationError({
  fieldKey,
  validation,
  copy,
}: {
  fieldKey: string;
  validation: FullRegistrationValidationResult | null;
  copy: ValidationCopy;
}) {
  const code = validation?.fieldErrors[fieldKey];
  if (!code) return null;
  return (
    <span id={validationErrorId(fieldKey)} className={styles.fieldError} role="alert">
      {validationCodeMessage(code, copy)}
    </span>
  );
}

function validationProps(fieldKey: string, validation: FullRegistrationValidationResult | null) {
  const invalid = Boolean(validation?.fieldErrors[fieldKey]);
  return {
    'data-validation-key': fieldKey,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? validationErrorId(fieldKey) : undefined,
  } as const;
}

function GuardianCard({
  title,
  kind,
  draft,
  onChange,
  activeSchoolId,
  showRights,
  arabicFirst,
  allowRelationshipChoice,
  validation,
  copy,
}: {
  title: string;
  kind: 'father' | 'mother' | 'generic';
  draft: FullRegistrationGuardianDraft;
  onChange: (next: FullRegistrationGuardianDraft) => void;
  activeSchoolId: number | null;
  showRights: boolean;
  arabicFirst: boolean;
  allowRelationshipChoice?: boolean;
  validation: FullRegistrationValidationResult | null;
  copy: ValidationCopy;
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const debouncedSearch = useDebouncedValue(search, FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS);
  const newGuardianQuery = buildFullRegistrationGuardianSuggestionQuery(draft);
  const debouncedNewGuardianQuery = useDebouncedValue(
    newGuardianQuery,
    FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  );
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PersonSearchResult[]>([]);

  useEffect(() => {
    if (draft.linkedGuardianId || draft.linkedPersonId) {
      setResults([]);
      setSearching(false);
      return;
    }
    const query = (draft.mode === 'existing' ? debouncedSearch : debouncedNewGuardianQuery).trim();
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
  }, [
    activeSchoolId,
    debouncedNewGuardianQuery,
    debouncedSearch,
    draft.linkedGuardianId,
    draft.linkedPersonId,
    draft.mode,
  ]);

  function switchMode(mode: FullRegistrationGuardianDraft['mode']) {
    setSearch('');
    setResults([]);
    setSearching(false);
    setPhoneDraft('');
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
    const names = fullRegistrationGuardianDisplayNames(
      person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
    );
    const personWithNames = person as PersonSearchResult & {
      name_ar?: string | null;
      name_latin?: string | null;
    };
    onChange({
      ...draft,
      mode: 'existing',
      linkedGuardianId: guardianId,
      linkedPersonId: guardianId ? null : personId,
      nameAr: personWithNames.name_ar || names[0] || person.name || '',
      nameFr: personWithNames.name_latin || '',
      phone: person.phone ?? '',
    });
    setPhoneDraft('');
    setSearch('');
    setResults([]);
  }

  async function saveExistingGuardianPhone() {
    if ((!draft.linkedGuardianId && !draft.linkedPersonId) || savingPhone) return;
    const phone = phoneDraft.trim();
    if (!phone) return;

    setSavingPhone(true);
    const result = draft.linkedGuardianId
      ? await api.post<Record<string, unknown>>(endpoints.admin.parentUpdate(draft.linkedGuardianId), { phone })
      : await api.post<Record<string, unknown>>(endpoints.admin.guardiansLinkPartner, {
          partner_id: draft.linkedPersonId,
          contact_patch: { phone },
        });
    setSavingPhone(false);

    if (!result.success) {
      toast.error(copy('phoneUpdateFailed'));
      return;
    }

    let linkedGuardianId = draft.linkedGuardianId;
    if (!linkedGuardianId) {
      const data = responseRecord(result.data);
      linkedGuardianId = responseNumber(data?.id);
      if (!linkedGuardianId) {
        toast.error(copy('phoneUpdateFailed'));
        return;
      }
    }

    onChange({ ...draft, linkedGuardianId, linkedPersonId: null, phone });
    setPhoneDraft('');
    toast.success(copy('phoneUpdated'));
  }

  const cardKey = `guardian.${draft.key}.card`;
  const nameKey = `guardian.${draft.key}.name`;
  const phoneKey = `guardian.${draft.key}.phone`;
  const selectionKey = `guardian.${draft.key}.selection`;
  const legalKey = `guardian.${draft.key}.legal`;
  const financialKey = `guardian.${draft.key}.financial`;
  const cardInvalid = Boolean(validation?.fieldErrors[cardKey]);
  const rightsInvalid = Boolean(
    validation?.fieldErrors[legalKey] || validation?.fieldErrors[financialKey],
  );
  const cardClass = [
    styles.guardianCard,
    kind === 'father'
      ? styles.guardianFather
      : kind === 'mother'
        ? styles.guardianMother
        : styles.guardianGeneric,
    cardInvalid ? styles.guardianCardInvalid : '',
  ]
    .filter(Boolean)
    .join(' ');
  const linked = draft.mode === 'existing' && Boolean(draft.linkedGuardianId || draft.linkedPersonId);
  const nameOrder = arabicFirst ? { arabic: -2, latin: -1 } : { arabic: -1, latin: -2 };

  const searchResults = results.length ? (
    <div className={styles.searchResults}>
      {results.map((person) => {
        const names = fullRegistrationGuardianDisplayNames(
          person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
        );
        return (
          <div className={styles.searchResult} key={`${person.partner_id}-${person.guardian_id ?? 'person'}`}>
            <div className={styles.searchMeta}>
              <div className={styles.searchName}>{names[0] ?? person.name}</div>
              {names[1] ? <div className={styles.searchAltName} dir="auto">{names[1]}</div> : null}
              <div className={styles.muted} dir="ltr">{person.phone ?? '—'}</div>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => selectExisting(person)}>
              {copy('useGuardian')}
            </button>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <section
      className={cardClass}
      tabIndex={cardInvalid ? -1 : undefined}
      {...validationProps(cardKey, validation)}
    >
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

      <InlineValidationError fieldKey={cardKey} validation={validation} copy={copy} />

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
        <>
          <div className={styles.grid}>
            <label
              style={{ order: nameOrder.arabic }}
              className={`${styles.field} ${styles.col6} ${validation?.fieldErrors[nameKey] ? styles.fieldInvalid : ''}`}
            >
              <span className={styles.label}>{copy('nameAr')}</span>
              <input
                className="input"
                value={draft.nameAr}
                onChange={(event) => onChange({ ...draft, nameAr: event.target.value })}
                autoComplete="name"
                {...validationProps(nameKey, validation)}
              />
              <InlineValidationError fieldKey={nameKey} validation={validation} copy={copy} />
            </label>
            <label style={{ order: nameOrder.latin }} className={`${styles.field} ${styles.col6}`}>
              <span className={styles.label}>{copy('nameFr')}</span>
              <input
                className="input"
                dir="ltr"
                value={draft.nameFr}
                onChange={(event) => onChange({ ...draft, nameFr: event.target.value })}
              />
            </label>
            <label
              className={`${styles.field} ${styles.col6} ${validation?.fieldErrors[phoneKey] ? styles.fieldInvalid : ''}`}
            >
              <span className={styles.label}>{copy('phone')}</span>
              <input
                className="input"
                dir="ltr"
                inputMode="tel"
                value={draft.phone}
                onChange={(event) => onChange({ ...draft, phone: event.target.value })}
                {...validationProps(phoneKey, validation)}
              />
              <InlineValidationError fieldKey={phoneKey} validation={validation} copy={copy} />
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
          {searchResults ? (
            <div className={styles.linkedBox}>
              <div className={styles.muted}>{copy('guardianDuplicate')}</div>
              {searchResults}
            </div>
          ) : null}
        </>
      ) : linked ? (
        <div className={styles.linkedBox}>
          <div className={styles.guardianHead}>
            <div>
              <span className={styles.badge}>✓ {copy('linked')}</span>
              <div className={styles.searchName}>{draft.nameAr || draft.nameFr || '—'}</div>
              {draft.nameAr && draft.nameFr && draft.nameAr !== draft.nameFr ? (
                <div className={styles.searchAltName} dir="auto">{draft.nameFr}</div>
              ) : null}
              {draft.phone ? <div className={styles.muted} dir="ltr">{draft.phone}</div> : null}
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setPhoneDraft('');
                onChange({
                  ...draft,
                  linkedGuardianId: null,
                  linkedPersonId: null,
                  nameAr: '',
                  nameFr: '',
                  phone: '',
                  identity: '',
                });
              }}
            >
              {copy('change')}
            </button>
          </div>
          {!draft.phone && (draft.linkedGuardianId || draft.linkedPersonId) ? (
            <div className={styles.inlinePhoneEdit}>
              <label className={styles.field}>
                <span className={styles.label}>{copy('addPhone')}</span>
                <input
                  className="input"
                  dir="ltr"
                  inputMode="tel"
                  value={phoneDraft}
                  onChange={(event) => setPhoneDraft(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!phoneDraft.trim() || savingPhone}
                onClick={() => void saveExistingGuardianPhone()}
              >
                {savingPhone ? copy('saving') : copy('savePhone')}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={`${styles.field} ${validation?.fieldErrors[selectionKey] ? styles.fieldInvalid : ''}`}>
          <span className={styles.label}>{copy('search')}</span>
          <input
            type="search"
            className={`input ${styles.searchInput}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`${copy('search')} / ${copy('identity')}`}
            autoComplete="off"
            autoFocus
            {...validationProps(selectionKey, validation)}
          />
          <InlineValidationError fieldKey={selectionKey} validation={validation} copy={copy} />
          {searching ? <div className={styles.muted}>{copy('searching')}</div> : null}
          {!searching && debouncedSearch.trim().length >= GUARDIAN_GLOBAL_SEARCH_MIN_QUERY && results.length === 0 ? (
            <div className={styles.muted}>{copy('noMatches')}</div>
          ) : null}
          {searchResults}
        </div>
      )}

      {showRights ? (
        <div className={`${styles.rights} ${rightsInvalid ? styles.rightsInvalid : ''}`}>
          <strong>{copy('rights')}</strong>
          <label className={styles.checkLine}>
            <input
              type="checkbox"
              checked={draft.legal}
              onChange={(event) => onChange({ ...draft, legal: event.target.checked })}
              {...validationProps(legalKey, validation)}
            />
            {copy('legal')}
          </label>
          <InlineValidationError fieldKey={legalKey} validation={validation} copy={copy} />
          <label className={styles.checkLine}>
            <input
              type="checkbox"
              checked={draft.financial}
              onChange={(event) => onChange({ ...draft, financial: event.target.checked })}
              {...validationProps(financialKey, validation)}
            />
            {copy('financial')}
          </label>
          <InlineValidationError fieldKey={financialKey} validation={validation} copy={copy} />
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
  const [admissionId, setAdmissionId] = useState<number | null>(null);
  const admissionPrefillAppliedRef = useRef<number | null>(null);
  const admissionPrefillState = useAdmissionPrefill(
    admissionId == null ? null : String(admissionId),
    admissionId != null,
  );

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
  const [pricingReason, setPricingReason] = useState('');
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingFieldErrors, setPricingFieldErrors] = useState<Record<number, PricingFieldError>>({});
  const [pricingReasonError, setPricingReasonError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAdmissionId(parseFullRegistrationAdmissionId(params.get('admission_id')));
  }, []);

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

  useEffect(() => {
    if (
      admissionId == null ||
      !admissionPrefillState.data ||
      admissionPrefillAppliedRef.current === admissionId ||
      !optionsState.options ||
      !levelOptionsState.options
    ) {
      return;
    }

    const patch = mapAdmissionPrefillToFullRegistration(admissionPrefillState.data);
    setStudent((prev) => ({ ...prev, ...patch.student }));
    if (patch.academicYearId) setAcademicYearId(patch.academicYearId);
    if (patch.enrollmentDate) setEnrollmentDate(patch.enrollmentDate);
    if (patch.familyContext) setFamilyContext(patch.familyContext);
    if (patch.guardianKey && patch.guardian) {
      setGuardians((prev) => ({ ...prev, [patch.guardianKey!]: patch.guardian! }));
    }

    if (patch.levelId) {
      const targetLevels = patch.academicYearId
        ? optionsState.options.levels.filter(
            (level) =>
              level.academic_year_id == null ||
              String(level.academic_year_id) === patch.academicYearId,
          )
        : optionsState.options.levels;
      const referenceLevels = levelOptionsState.options.reference_levels ?? [];
      const cycles = levelOptionsState.options.cycles ?? [];
      const targetCycle = buildEnrollmentCycleOptions(targetLevels, referenceLevels, cycles).find(
        (cycle) =>
          filterLevelsByCycleId(targetLevels, String(cycle.id), referenceLevels, cycles).some(
            (level) => String(level.id) === patch.levelId,
          ),
      );
      if (targetCycle) setCycleId(String(targetCycle.id));
      setLevelId(patch.levelId);
    }

    admissionPrefillAppliedRef.current = admissionId;
  }, [
    admissionId,
    admissionPrefillState.data,
    levelOptionsState.options,
    optionsState.options,
  ]);

  useEffect(() => {
    if (admissionId == null || !admissionPrefillState.loaded || !admissionPrefillState.error) return;
    setError(fullRegistrationCopy(locale, 'genericError'));
  }, [admissionId, admissionPrefillState.error, admissionPrefillState.loaded, locale]);

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
  const optionalLines = useMemo(() => {
    const suggest = suggestState.suggest as SuggestWithOptionalLines | null;
    if (suggest?.optional_lines) return suggest.optional_lines.filter((line) => line.fee_type_id != null);
    return (suggest?.plan_lines ?? []).filter((line) => line.is_optional && line.fee_type_id != null);
  }, [suggestState.suggest]);

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
    const mandatoryLines = (suggestState.suggest?.plan_lines ?? []).filter((line) => !line.is_optional);
    const selected = new Set(selectedServiceIds);
    const selectedOptional = optionalLines.filter(
      (line) => line.fee_type_id != null && selected.has(Number(line.fee_type_id)),
    );
    return [...mandatoryLines, ...selectedOptional];
  }, [optionalLines, selectedServiceIds, suggestState.suggest?.plan_lines]);

  const pricingReferenceDate = todayIsoDate();
  const pricingMonthOptions = useMemo(
    () => monthOptions(pricingReferenceDate, locale),
    [pricingReferenceDate, locale],
  );

  const financeTotals = useMemo(() => {
    return adjustableLines.reduce(
      (totals, line) => {
        const draft = pricingDrafts[line.line_id];
        const parsed = draft ? inputValueNumber(draft.price) : null;
        const base = lineAmount(line);
        const amount = parsed != null && parsed >= 0 ? parsed : base;
        if (amount == null) return totals;
        if (isOneTimeLine(line)) totals.oneTime += amount;
        else totals.monthly += amount;
        return totals;
      },
      { monthly: 0, oneTime: 0 },
    );
  }, [adjustableLines, pricingDrafts]);

  const selectedServiceNames = useMemo(() => {
    const selected = new Set(selectedServiceIds);
    return optionalLines
      .filter((line) => line.fee_type_id != null && selected.has(Number(line.fee_type_id)))
      .map((line) => line.fee_type_name);
  }, [optionalLines, selectedServiceIds]);

  const selectedLevelName = useMemo(
    () =>
      levelOptions.find((level) => String(level.id) === levelId)?.display_name ??
      levelOptions.find((level) => String(level.id) === levelId)?.name ??
      '—',
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

  function defaultPricingDraft(line: EnrollmentPlanLine): PricingDraft {
    if (isOneTimeLine(line)) return { price: '', from: '', to: '' };
    const period = fullRegistrationPricingPeriodDefaults(pricingReferenceDate);
    return { price: '', from: period.from, to: period.to };
  }

  function pricingAdjustments(): FullRegistrationPricingAdjustment[] {
    const defaults = fullRegistrationPricingPeriodDefaults(pricingReferenceDate);
    return adjustableLines.flatMap((line) => {
      const draft = pricingDrafts[line.line_id];
      if (!draft) return [];
      const basePrice = lineAmount(line);
      const parsedPrice = inputValueNumber(draft.price);
      const priceChanged =
        draft.price.trim() !== '' &&
        parsedPrice != null &&
        parsedPrice >= 0 &&
        (basePrice == null || Math.abs(parsedPrice - basePrice) > 0.000001);
      const oneTime = isOneTimeLine(line);
      const periodChanged = !oneTime && (draft.from !== defaults.from || draft.to !== defaults.to);
      if (!priceChanged && !periodChanged) return [];
      return [
        {
          itemKey: String(line.line_id),
          adjustedUnitPrice: priceChanged ? parsedPrice : null,
          periodFrom: periodChanged ? draft.from : '',
          periodTo: periodChanged ? draft.to : '',
          reason: pricingReason.trim(),
        },
      ];
    });
  }

  function validatePricingDrafts(): boolean {
    const nextErrors: Record<number, PricingFieldError> = {};
    const bounds = academicPeriodBounds(pricingReferenceDate);
    const defaults = fullRegistrationPricingPeriodDefaults(pricingReferenceDate);
    let hasOverride = false;

    adjustableLines.forEach((line) => {
      const draft = pricingDrafts[line.line_id];
      if (!draft) return;
      const lineErrors: PricingFieldError = {};
      const basePrice = lineAmount(line);
      const normalizedPrice = draft.price.trim();
      const parsedPrice = inputValueNumber(draft.price);

      if (normalizedPrice && (parsedPrice == null || parsedPrice < 0)) {
        lineErrors.price = pricingValidationMessage(locale, 'invalidPrice');
      }

      const priceChanged =
        normalizedPrice !== '' &&
        parsedPrice != null &&
        parsedPrice >= 0 &&
        (basePrice == null || Math.abs(parsedPrice - basePrice) > 0.000001);

      if (!isOneTimeLine(line)) {
        const hasFrom = Boolean(draft.from.trim());
        const hasTo = Boolean(draft.to.trim());
        if (hasFrom !== hasTo || !hasFrom || !hasTo) {
          lineErrors.period = pricingValidationMessage(locale, 'incompletePeriod');
        } else if (draft.from > draft.to) {
          lineErrors.period = pricingValidationMessage(locale, 'periodOrder');
        } else if (
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.from) ||
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.to) ||
          draft.from < bounds.from ||
          draft.to > bounds.to
        ) {
          lineErrors.period = pricingValidationMessage(locale, 'outsideAcademicYear');
        }

        if (!lineErrors.period && (draft.from !== defaults.from || draft.to !== defaults.to)) {
          hasOverride = true;
        }
      }

      if (!lineErrors.price && priceChanged) hasOverride = true;
      if (lineErrors.price || lineErrors.period) nextErrors[line.line_id] = lineErrors;
    });

    const reasonError = hasOverride && !pricingReason.trim() ? copy('pricingReasonError') : '';
    setPricingFieldErrors(nextErrors);
    setPricingReasonError(reasonError);
    return Object.keys(nextErrors).length === 0 && !reasonError;
  }

  function buildInput(): FullRegistrationBuildInput {
    return {
      admissionId,
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

  const liveValidation = validationAttempted ? validateFullRegistrationDraft(buildInput()) : null;

  function validationMessage(errors: string[]): string {
    if (errors.includes('special_family_legal_responsible_required')) return copy('specialLegalError');
    if (errors.includes('special_family_billing_responsible_required')) return copy('specialBillingError');
    if (errors.includes('pricing_adjustment_reason_required')) return copy('pricingReasonError');
    return copy('requiredError');
  }

  function fieldClass(base: string, fieldKey: string): string {
    return `${base} ${liveValidation?.fieldErrors[fieldKey] ? styles.fieldInvalid : ''}`;
  }

  async function submit() {
    if (saving) return;
    setError(null);
    if (!validatePricingDrafts()) {
      setPricingOpen(true);
      const message = copy('requiredError');
      setError(message);
      toast.error(message);
      return;
    }
    const input = buildInput();
    const validation = validateFullRegistrationDraft(input);
    if (!validation.valid) {
      setValidationAttempted(true);
      const message = validationMessage(validation.errors);
      setError(message);
      toast.error(message);
      requestAnimationFrame(() => focusFirstFullRegistrationError(validation.fieldOrder));
      return;
    }
    setValidationAttempted(false);
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
      responseNumber(data.student_id) ?? responseNumber(data.id) ?? responseNumber(studentBlock?.id);
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
      classStatus:
        responseString(data.class_assignment_status) ??
        responseString(classAssignment?.status) ??
        'pending',
      className: responseString(classAssignment?.class_name),
      billingPartnerId: responseNumber(data.billing_partner_id),
      availableNextActions: actions,
    });
    toast.success(copy('successTitle'));
  }

  if (success) {
    const collectNowHref = buildFullRegistrationCollectNowHref({
      studentId: success.studentId,
      academicYearId,
      billingPartnerId: success.billingPartnerId,
      returnTo: `/admin/students/${success.studentId}`,
    });
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
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => router.push(`/admin/students/${success.studentId}`)}
            >
              {copy('openStudent')}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => window.location.assign('/admin/students/new')}
            >
              {copy('registerAnother')}
            </button>
            {success.availableNextActions.includes('collect_now') ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => router.push(collectNowHref)}
              >
                {copy('collectNow')}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  const schoolKey = 'academic.schoolId';
  const yearKey = 'academic.academicYearId';
  const levelKey = 'academic.levelId';
  const enrollmentKey = 'academic.enrollmentDate';
  const firstNameArKey = 'student.firstNameAr';
  const lastNameArKey = 'student.lastNameAr';
  const firstNameFrKey = 'student.firstNameFr';
  const lastNameFrKey = 'student.lastNameFr';
  const genderKey = 'student.gender';
  const dobKey = 'student.dateOfBirth';
  const nameOrder = fullRegistrationNameFieldOrder(locale);
  const arabicFirst = locale === 'ar';

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
          <button type="button" className="btn btn--ghost" onClick={optionsState.reload}>
            {copy('retry')}
          </button>
        </div>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('academic')}</h2>
        <div className={styles.grid}>
          <label className={fieldClass(`${styles.field} ${styles.col3}`, schoolKey)}>
            <span className={styles.label}>{copy('school')}</span>
            <span
              className={styles.readonly}
              tabIndex={liveValidation?.fieldErrors[schoolKey] ? -1 : undefined}
              {...validationProps(schoolKey, liveValidation)}
            >
              {schoolName}
            </span>
            <InlineValidationError fieldKey={schoolKey} validation={liveValidation} copy={copy} />
          </label>
          <label className={fieldClass(`${styles.field} ${styles.col3}`, yearKey)}>
            <span className={styles.label}>{copy('year')}</span>
            <select
              className="input"
              value={academicYearId}
              onChange={(event) => {
                setAcademicYearId(event.target.value);
                setCycleId('');
                setLevelId('');
                setError(null);
              }}
              disabled={optionsState.loading}
              {...validationProps(yearKey, liveValidation)}
            >
              <option value="">{copy('select')}</option>
              {(optionsState.options?.academicYears ?? []).map((year) => (
                <option value={year.id} key={year.id}>{year.name}</option>
              ))}
            </select>
            <InlineValidationError fieldKey={yearKey} validation={liveValidation} copy={copy} />
          </label>
          <label className={`${styles.field} ${styles.col3}`}>
            <span className={styles.label}>{copy('cycle')}</span>
            <select
              className="input"
              value={cycleId}
              onChange={(event) => {
                setCycleId(event.target.value);
                setLevelId('');
                setError(null);
              }}
              disabled={levelOptionsState.loading}
            >
              <option value="">{copy('select')}</option>
              {cycleOptions.map((cycle) => (
                <option value={cycle.id} key={cycle.id}>{cycle.name}</option>
              ))}
            </select>
          </label>
          <label className={fieldClass(`${styles.field} ${styles.col3}`, levelKey)}>
            <span className={styles.label}>{copy('level')}</span>
            <select
              className="input"
              value={levelId}
              onChange={(event) => {
                setLevelId(event.target.value);
                setError(null);
              }}
              disabled={!cycleId || optionsState.loading}
              {...validationProps(levelKey, liveValidation)}
            >
              <option value="">{copy('select')}</option>
              {levelOptions.map((level) => (
                <option value={level.id} key={level.id}>{level.display_name ?? level.name}</option>
              ))}
            </select>
            <InlineValidationError fieldKey={levelKey} validation={liveValidation} copy={copy} />
          </label>
          <label className={fieldClass(`${styles.field} ${styles.col4}`, enrollmentKey)}>
            <span className={styles.label}>{copy('enrollmentDate')}</span>
            <input
              className="input"
              type="date"
              value={enrollmentDate}
              onChange={(event) => {
                setEnrollmentDate(event.target.value);
                setError(null);
              }}
              {...validationProps(enrollmentKey, liveValidation)}
            />
            <InlineValidationError fieldKey={enrollmentKey} validation={liveValidation} copy={copy} />
          </label>
        </div>
        <div className={styles.autoHint}>{copy('classAuto')}</div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('student')}</h2>
        <div className={styles.grid}>
          <label style={{ order: nameOrder.arabic }} className={fieldClass(`${styles.field} ${styles.col6}`, firstNameArKey)}>
            <span className={styles.label}>{copy('firstNameAr')}</span>
            <input className="input" value={student.firstNameAr} onChange={(event) => { setStudent((prev) => ({ ...prev, firstNameAr: event.target.value })); setError(null); }} {...validationProps(firstNameArKey, liveValidation)} />
            <InlineValidationError fieldKey={firstNameArKey} validation={liveValidation} copy={copy} />
          </label>
          <label style={{ order: nameOrder.arabic }} className={fieldClass(`${styles.field} ${styles.col6}`, lastNameArKey)}>
            <span className={styles.label}>{copy('lastNameAr')}</span>
            <input className="input" value={student.lastNameAr} onChange={(event) => { setStudent((prev) => ({ ...prev, lastNameAr: event.target.value })); setError(null); }} {...validationProps(lastNameArKey, liveValidation)} />
            <InlineValidationError fieldKey={lastNameArKey} validation={liveValidation} copy={copy} />
          </label>
          <label style={{ order: nameOrder.latin }} className={fieldClass(`${styles.field} ${styles.col6}`, firstNameFrKey)}>
            <span className={styles.label}>{copy('firstNameFr')}</span>
            <input className="input" dir="ltr" value={student.firstNameFr} onChange={(event) => { setStudent((prev) => ({ ...prev, firstNameFr: event.target.value })); setError(null); }} {...validationProps(firstNameFrKey, liveValidation)} />
            <InlineValidationError fieldKey={firstNameFrKey} validation={liveValidation} copy={copy} />
          </label>
          <label style={{ order: nameOrder.latin }} className={fieldClass(`${styles.field} ${styles.col6}`, lastNameFrKey)}>
            <span className={styles.label}>{copy('lastNameFr')}</span>
            <input className="input" dir="ltr" value={student.lastNameFr} onChange={(event) => { setStudent((prev) => ({ ...prev, lastNameFr: event.target.value })); setError(null); }} {...validationProps(lastNameFrKey, liveValidation)} />
            <InlineValidationError fieldKey={lastNameFrKey} validation={liveValidation} copy={copy} />
          </label>
          <label className={fieldClass(`${styles.field} ${styles.col4}`, genderKey)}>
            <span className={styles.label}>{copy('gender')}</span>
            <select className="input" value={student.gender} onChange={(event) => { setStudent((prev) => ({ ...prev, gender: event.target.value })); setError(null); }} {...validationProps(genderKey, liveValidation)}>
              {(optionsState.options?.genders ?? []).map((item) => (
                <option key={item.value} value={item.value}>{fullRegistrationGenderLabel(locale, item.value, item.label)}</option>
              ))}
            </select>
            <InlineValidationError fieldKey={genderKey} validation={liveValidation} copy={copy} />
          </label>
          <label className={fieldClass(`${styles.field} ${styles.col4}`, dobKey)}>
            <span className={styles.label}>{copy('dob')}</span>
            <input className="input" type="date" value={student.dateOfBirth} onChange={(event) => { setStudent((prev) => ({ ...prev, dateOfBirth: event.target.value })); setError(null); }} {...validationProps(dobKey, liveValidation)} />
            <InlineValidationError fieldKey={dobKey} validation={liveValidation} copy={copy} />
          </label>
          <label className={`${styles.field} ${styles.col4}`}>
            <span className={styles.label}>{copy('previousSchool')}</span>
            <input className="input" value={student.previousSchool} onChange={(event) => setStudent((prev) => ({ ...prev, previousSchool: event.target.value }))} />
          </label>
          <label className={`${styles.field} ${styles.col12}`}>
            <span className={styles.label}>{copy('address')}</span>
            <input className="input" value={student.address} onChange={(event) => setStudent((prev) => ({ ...prev, address: event.target.value }))} />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('family')}</h2>
        <div className={styles.familyOptions}>
          {FAMILY_OPTIONS.map((option) => (
            <button type="button" key={option} className={`${styles.familyOption} ${familyContext === option ? styles.familyOptionActive : ''}`} onClick={() => { setFamilyContext(option); setError(null); }}>
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
            arabicFirst={arabicFirst}
            allowRelationshipChoice={familyContext === 'single_guardian'}
            validation={liveValidation}
            copy={copy}
          />
        ) : (
          <div className={styles.guardianGrid}>
            <GuardianCard title={copy('father')} kind="father" draft={guardians.father} onChange={(next) => updateGuardian('father', next)} activeSchoolId={resolvedSchoolId} showRights={showRights} arabicFirst={arabicFirst} validation={liveValidation} copy={copy} />
            <GuardianCard title={copy('mother')} kind="mother" draft={guardians.mother} onChange={(next) => updateGuardian('mother', next)} activeSchoolId={resolvedSchoolId} showRights={showRights} arabicFirst={arabicFirst} validation={liveValidation} copy={copy} />
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('services')}</h2>
        <p className={styles.sectionLead}>{copy('servicesLead')}</p>
        {!feePlanQuery || suggestState.loading ? <p className={styles.muted}>{copy('loadingServices')}</p> : null}
        {feePlanQuery && suggestState.error ? (
          <div className={styles.error}>{suggestState.error.code?.includes('ambiguous') ? copy('planAmbiguous') : copy('planMissing')}</div>
        ) : null}
        {suggestState.suggest && optionalLines.length === 0 ? <p className={styles.muted}>{copy('noServices')}</p> : null}
        {optionalLines.length ? (
          <div className={styles.servicesGrid}>
            {optionalLines.map((line) => {
              const serviceId = Number(line.fee_type_id);
              const selected = selectedServiceIds.includes(serviceId);
              const amount = lineAmount(line);
              const frequency = billingFrequencyLabel(locale, line);
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
                    {frequency ? ` · ${frequency}` : ''}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
        {capabilities.canManageDiscounts && suggestState.suggest?.allowed_actions?.customize_plan ? (
          <div className={styles.actions} style={{ marginTop: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={() => { setPricingFieldErrors({}); setPricingReasonError(''); setPricingOpen(true); }}>
              {copy('adjust')}
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy('summary')}</h2>
        <div className={styles.summary}>
          <span><strong>{copy('level')}:</strong> {selectedLevelName}</span>
          <span><strong>{copy('payer')}:</strong> {payerName}</span>
          <span><strong>{copy('selectedServices')}:</strong>{' '}{selectedServiceNames.length ? selectedServiceNames.join('، ') : copy('none')}</span>
        </div>
        <div className={styles.financeTotals}>
          <div className={styles.financeTotalCard}>
            <span className={styles.financeTotalLabel}>{copy('monthlyTotal')}</span>
            <strong className={styles.financeTotalValue}>{financeTotals.monthly.toLocaleString(locale)} MAD</strong>
          </div>
          <div className={styles.financeTotalCard}>
            <span className={styles.financeTotalLabel}>{copy('oneTimeTotal')}</span>
            <strong className={styles.financeTotalValue}>{financeTotals.oneTime.toLocaleString(locale)} MAD</strong>
          </div>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => router.push('/admin/students')}>{copy('cancel')}</button>
        <button type="button" className="btn btn--primary" data-testid="full-registration-submit" disabled={saving || optionsState.loading || admissionPrefillState.loading} onClick={() => void submit()}>{saving ? copy('saving') : copy('submit')}</button>
      </div>

      {pricingOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setPricingOpen(false)}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-registration-pricing-title"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ width: 'min(680px, calc(100vw - 32px))', maxHeight: 'min(82vh, 760px)', overflowY: 'auto', overflowX: 'hidden' }}
          >
            <div className={styles.guardianHead}>
              <h2 id="full-registration-pricing-title">{copy('adjustTitle')}</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setPricingOpen(false)}>{copy('cancel')}</button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {adjustableLines.map((line) => {
                const draft = pricingDrafts[line.line_id] ?? defaultPricingDraft(line);
                const oneTime = isOneTimeLine(line);
                const frequency = billingFrequencyLabel(locale, line);
                const rowErrors = pricingFieldErrors[line.line_id];
                return (
                  <div
                    key={line.line_id}
                    className={styles.adjustRow}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', minWidth: 0 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                      <strong>{line.fee_type_name}</strong>
                      <span className={styles.muted}>
                        {lineAmount(line) != null ? `${lineAmount(line)?.toLocaleString(locale)} MAD` : '—'}
                        {frequency ? ` · ${frequency}` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <label className={styles.field} style={{ flex: '1 1 130px', minWidth: 0 }}>
                        <span className={styles.label}>{copy('price')}</span>
                        <input
                          className="input"
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={draft.price}
                          placeholder={lineAmount(line)?.toString() ?? ''}
                          aria-invalid={Boolean(rowErrors?.price) || undefined}
                          onChange={(event) => {
                            setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, price: event.target.value } }));
                            setPricingFieldErrors((prev) => ({ ...prev, [line.line_id]: { ...prev[line.line_id], price: undefined } }));
                          }}
                        />
                        {rowErrors?.price ? <span className={styles.fieldError} role="alert">{rowErrors.price}</span> : null}
                      </label>

                      {!oneTime ? (
                        <>
                          <label className={styles.field} style={{ flex: '1 1 180px', minWidth: 0 }}>
                            <span className={styles.label}>{copy('from')}</span>
                            <select
                              className="input"
                              value={draft.from}
                              aria-invalid={Boolean(rowErrors?.period) || undefined}
                              onChange={(event) => {
                                setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, from: event.target.value } }));
                                setPricingFieldErrors((prev) => ({ ...prev, [line.line_id]: { ...prev[line.line_id], period: undefined } }));
                              }}
                            >
                              <option value="">{copy('select')}</option>
                              {pricingMonthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                            </select>
                          </label>
                          <label className={styles.field} style={{ flex: '1 1 180px', minWidth: 0 }}>
                            <span className={styles.label}>{copy('to')}</span>
                            <select
                              className="input"
                              value={draft.to}
                              aria-invalid={Boolean(rowErrors?.period) || undefined}
                              onChange={(event) => {
                                setPricingDrafts((prev) => ({ ...prev, [line.line_id]: { ...draft, to: event.target.value } }));
                                setPricingFieldErrors((prev) => ({ ...prev, [line.line_id]: { ...prev[line.line_id], period: undefined } }));
                              }}
                            >
                              <option value="">{copy('select')}</option>
                              {pricingMonthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                            </select>
                          </label>
                        </>
                      ) : null}
                    </div>
                    {rowErrors?.period ? <span className={styles.fieldError} role="alert">{rowErrors.period}</span> : null}
                  </div>
                );
              })}
            </div>

            <label className={styles.field} style={{ marginTop: 12 }}>
              <span className={styles.label}>{copy('reason')}</span>
              <input
                className="input"
                value={pricingReason}
                aria-invalid={Boolean(pricingReasonError) || undefined}
                onChange={(event) => {
                  setPricingReason(event.target.value);
                  setPricingReasonError('');
                }}
              />
              {pricingReasonError ? <span className={styles.fieldError} role="alert">{pricingReasonError}</span> : null}
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  if (!validatePricingDrafts()) return;
                  setPricingOpen(false);
                  setError(null);
                }}
              >
                {copy('save')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
