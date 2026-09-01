'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PermissionDeniedState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { canCreateStudents } from '@/lib/permissions/academic-capabilities';
import type { PersonSearchResult } from '@/types/student-360';
import type { EnrollmentPlanLine, FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import type { BatchRegistrationResponse } from '@/types/student-batch-registration';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useFeePlanSuggest } from '../hooks/use-fee-plan-suggest';
import { useStudentOptions } from '../hooks/use-student-options';
import {
  GUARDIAN_GLOBAL_SEARCH_MIN_QUERY,
  searchGuardiansGlobally,
} from '../utils/guardian-global-search';
import {
  buildFullRegistrationCollectNowHref,
  fullRegistrationGuardianDisplayNames,
  fullRegistrationPricingPeriodDefaults,
} from '../utils/full-registration-requested-adjustments';
import { FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS } from '../utils/full-registration-ui';
import { resolvePersonSchoolParentId } from '../utils/student-create-guardian-payload';
import { resolveDefaultAcademicYearId, todayIsoDate } from '../utils/student-profile';
import styles from './family-registration-v2-frozen-page.module.css';

type GuardianKey = 'father' | 'mother';
type FamilyContext =
  | 'parents_together'
  | 'separated_or_divorced'
  | 'single_guardian'
  | 'guardianship'
  | 'special';

type GuardianDraft = {
  key: GuardianKey;
  mode: 'new' | 'existing';
  linkedGuardianId: number | null;
  nameAr: string;
  nameLatin: string;
  phone: string;
  preferredLanguage: 'ar' | 'fr';
  identity: string;
  email: string;
};

type PricingAdjustment = {
  item_key: string;
  adjusted_unit_price?: number;
  period_from?: string;
  period_to?: string;
  reason: 'manual_adjustment';
};

type ChildDraft = {
  localId: string;
  idempotencyKey: string;
  collapsed: boolean;
  firstNameAr: string;
  lastNameAr: string;
  firstNameLatin: string;
  lastNameLatin: string;
  gender: string;
  dateOfBirth: string;
  previousSchool: string;
  address: string;
  cycleId: string;
  levelId: string;
  selectedServiceIds: number[];
  pricingAdjustments: PricingAdjustment[];
};

type ChildResult = {
  status: 'pending' | 'succeeded' | 'failed' | 'ambiguous';
  studentId?: number;
  error?: string;
  retryable?: boolean;
};

type OptionalSuggest = FeePlanSuggestResult & { optional_lines?: EnrollmentPlanLine[] };

const FAMILY_OPTIONS: Array<{ value: FamilyContext; label: string }> = [
  { value: 'parents_together', label: 'الوالدان معًا' },
  { value: 'separated_or_divorced', label: 'منفصلان / مطلقان' },
  { value: 'single_guardian', label: 'ولي واحد' },
  { value: 'guardianship', label: 'وصاية / كفالة' },
  { value: 'special', label: 'حالة خاصة' },
];

function randomKey(prefix: string): string {
  const token = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${token}`;
}

function emptyGuardian(key: GuardianKey): GuardianDraft {
  return {
    key,
    mode: 'new',
    linkedGuardianId: null,
    nameAr: '',
    nameLatin: '',
    phone: '',
    preferredLanguage: 'ar',
    identity: '',
    email: '',
  };
}

function emptyChild(collapsed = false): ChildDraft {
  return {
    localId: randomKey('family-v2-child'),
    idempotencyKey: randomKey('family-v2-child-request'),
    collapsed,
    firstNameAr: '',
    lastNameAr: '',
    firstNameLatin: '',
    lastNameLatin: '',
    gender: '',
    dateOfBirth: '',
    previousSchool: '',
    address: '',
    cycleId: '',
    levelId: '',
    selectedServiceIds: [],
    pricingAdjustments: [],
  };
}

function childName(child: ChildDraft): string {
  return (
    [child.firstNameAr, child.lastNameAr].filter(Boolean).join(' ').trim() ||
    [child.firstNameLatin, child.lastNameLatin].filter(Boolean).join(' ').trim() ||
    'ابن جديد'
  );
}

function selectedGuardianKeys(context: FamilyContext, single: GuardianKey): GuardianKey[] {
  return context === 'single_guardian' ? [single] : ['father', 'mother'];
}

function guardianReady(guardian: GuardianDraft): boolean {
  if (guardian.mode === 'existing') return Boolean(guardian.linkedGuardianId);
  return Boolean(
    guardian.nameAr.trim() &&
      guardian.nameLatin.trim() &&
      guardian.phone.trim() &&
      guardian.preferredLanguage,
  );
}

function childReady(child: ChildDraft): boolean {
  return Boolean(
    child.firstNameAr.trim() &&
      child.lastNameAr.trim() &&
      child.firstNameLatin.trim() &&
      child.lastNameLatin.trim() &&
      child.gender &&
      child.dateOfBirth &&
      child.cycleId &&
      child.levelId,
  );
}

function lineUnitAmount(line: EnrollmentPlanLine): number {
  return Number(
    line.monthly_installment_amount ??
      line.installment_amount ??
      line.amount ??
      line.base_amount ??
      0,
  );
}

function lineTotalAmount(line: EnrollmentPlanLine): number {
  return Number(
    line.total_amount ??
      line.suggested_total ??
      line.original_total ??
      line.amount ??
      line.base_amount ??
      0,
  );
}

function money(value: number, currency?: unknown): string {
  const code = typeof currency === 'string' && currency ? currency : 'MAD';
  try {
    return new Intl.NumberFormat('ar-MA', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} د.م`;
  }
}

function GuardianCard({
  kind,
  draft,
  onChange,
  activeSchoolId,
  billingGuardianKey,
  onBillingGuardian,
}: {
  kind: GuardianKey;
  draft: GuardianDraft;
  onChange: (next: GuardianDraft) => void;
  activeSchoolId: number | null;
  billingGuardianKey: GuardianKey;
  onBillingGuardian: (key: GuardianKey) => void;
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const debounced = useDebouncedValue(search, FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (draft.mode !== 'existing' || draft.linkedGuardianId) {
      setResults([]);
      setSearching(false);
      return;
    }
    const query = debounced.trim();
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
  }, [activeSchoolId, debounced, draft.linkedGuardianId, draft.mode]);

  function switchMode(mode: GuardianDraft['mode']) {
    setSearch('');
    setResults([]);
    setEditingPhone(false);
    setPhoneDraft('');
    onChange({ ...emptyGuardian(kind), mode });
  }

  function chooseExisting(person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    if (!guardianId) return;
    const names = fullRegistrationGuardianDisplayNames(
      person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
    );
    const named = person as PersonSearchResult & {
      name_ar?: string | null;
      name_latin?: string | null;
      email?: string | null;
    };
    onChange({
      ...draft,
      mode: 'existing',
      linkedGuardianId: guardianId,
      nameAr: named.name_ar || names[0] || person.name || '',
      nameLatin: named.name_latin || names[1] || '',
      phone: person.phone || '',
      email: named.email || '',
    });
    setSearch('');
    setResults([]);
  }

  async function updatePhone() {
    if (!draft.linkedGuardianId || !phoneDraft.trim() || savingPhone) return;
    setSavingPhone(true);
    const res = await api.post<Record<string, unknown>>(
      endpoints.admin.parentUpdate(draft.linkedGuardianId),
      { phone: phoneDraft.trim() },
    );
    setSavingPhone(false);
    if (!res.success) {
      toast.error(res.error?.message || 'تعذر تحديث رقم الهاتف.');
      return;
    }
    onChange({ ...draft, phone: phoneDraft.trim() });
    setPhoneDraft('');
    setEditingPhone(false);
    toast.success('تم تحديث رقم الهاتف.');
  }

  const title = kind === 'father' ? 'الأب' : 'الأم';
  return (
    <article className={styles.guardianCard} data-testid={`family-v2-${kind}`}>
      <div className={styles.cardHead}>
        <h3>{title}</h3>
        <div className={styles.segmented}>
          <button type="button" className={draft.mode === 'new' ? styles.activeSegment : ''} onClick={() => switchMode('new')}>
            ولي جديد
          </button>
          <button type="button" className={draft.mode === 'existing' ? styles.activeSegment : ''} onClick={() => switchMode('existing')}>
            ولي موجود
          </button>
        </div>
      </div>

      {draft.mode === 'new' ? (
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>الاسم الكامل بالعربية *</span>
            <input className="input" value={draft.nameAr} onChange={(e) => onChange({ ...draft, nameAr: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>الاسم الكامل بالحروف اللاتينية *</span>
            <input className="input" dir="ltr" value={draft.nameLatin} onChange={(e) => onChange({ ...draft, nameLatin: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>رقم الهاتف *</span>
            <input className="input" dir="ltr" inputMode="tel" value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>لغة التواصل *</span>
            <select className="input" value={draft.preferredLanguage} onChange={(e) => onChange({ ...draft, preferredLanguage: e.target.value as 'ar' | 'fr' })}>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>رقم وثيقة الهوية — اختياري</span>
            <input className="input" dir="ltr" value={draft.identity} onChange={(e) => onChange({ ...draft, identity: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>البريد الإلكتروني — اختياري</span>
            <input className="input" dir="ltr" type="email" value={draft.email} onChange={(e) => onChange({ ...draft, email: e.target.value })} />
          </label>
        </div>
      ) : draft.linkedGuardianId ? (
        <div className={styles.linkedGuardian}>
          <span className={styles.successBadge}>✓ ولي مرتبط</span>
          <strong>{draft.nameAr || '—'}</strong>
          {draft.nameLatin ? <span dir="ltr">{draft.nameLatin}</span> : null}
          <span dir="ltr">{draft.phone || '—'}</span>
          {draft.email ? <span dir="ltr">{draft.email}</span> : null}
          {editingPhone ? (
            <div className={styles.inlineAction}>
              <input className="input" dir="ltr" inputMode="tel" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} autoFocus />
              <button type="button" className="btn btn--secondary btn--sm" disabled={savingPhone || !phoneDraft.trim()} onClick={() => void updatePhone()}>
                حفظ
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingPhone(false)}>
                إلغاء
              </button>
            </div>
          ) : (
            <div className={styles.inlineAction}>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setPhoneDraft(draft.phone); setEditingPhone(true); }}>
                تحديث رقم الهاتف
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => switchMode('existing')}>
                تغيير الولي
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.searchBox}>
          <label className={styles.field}>
            <span>البحث عن ولي الأمر</span>
            <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الاسم أو رقم الهاتف" />
          </label>
          {searching ? <span className={styles.muted}>جارٍ البحث…</span> : null}
          {!searching && debounced.trim().length >= GUARDIAN_GLOBAL_SEARCH_MIN_QUERY && results.length === 0 ? (
            <span className={styles.muted}>لا توجد نتائج مطابقة.</span>
          ) : null}
          {results.map((person) => {
            const guardianId = resolvePersonSchoolParentId(person);
            const names = fullRegistrationGuardianDisplayNames(person);
            return (
              <div className={styles.searchResult} key={`${person.partner_id}-${person.guardian_id ?? 'person'}`}>
                <div>
                  <strong>{names[0] || person.name}</strong>
                  {names[1] ? <span dir="ltr">{names[1]}</span> : null}
                  {person.phone ? <span dir="ltr">{person.phone}</span> : null}
                </div>
                <button type="button" className="btn btn--ghost btn--sm" disabled={!guardianId} onClick={() => chooseExisting(person)}>
                  استخدام هذا الولي
                </button>
              </div>
            );
          })}
        </div>
      )}

      <label className={styles.billingChoice}>
        <input type="radio" name="family-v2-billing-guardian" checked={billingGuardianKey === kind} onChange={() => onBillingGuardian(kind)} />
        <span>مسؤول عن الأداء</span>
      </label>
    </article>
  );
}

function ChildCard({
  child,
  index,
  onChange,
  onRemove,
  academicYearId,
  enrollmentDate,
  activeSchoolId,
  levelOptions,
  genderOptions,
}: {
  child: ChildDraft;
  index: number;
  onChange: (next: ChildDraft) => void;
  onRemove: () => void;
  academicYearId: string;
  enrollmentDate: string;
  activeSchoolId: number | null;
  levelOptions: NonNullable<ReturnType<typeof useLevelOptions>['options']> | null;
  genderOptions: Array<{ value: string; label: string }>;
}) {
  const [serviceSearch, setServiceSearch] = useState('');
  const [editingFees, setEditingFees] = useState(false);
  const enabledLevels = useMemo(
    () => (levelOptions?.reference_levels ?? []).filter((level) => level.enabled && level.school_level_id),
    [levelOptions?.reference_levels],
  );
  const cycles = levelOptions?.cycles ?? [];
  const filteredLevels = child.cycleId
    ? enabledLevels.filter((level) => String(level.cycle?.id ?? '') === child.cycleId)
    : enabledLevels;
  const feeQuery =
    activeSchoolId && academicYearId && child.levelId && enrollmentDate
      ? {
          school_id: activeSchoolId,
          academic_year_id: Number(academicYearId),
          level_id: Number(child.levelId),
          enrollment_date: enrollmentDate,
        }
      : null;
  const feeState = useFeePlanSuggest(feeQuery);
  const suggest = feeState.suggest as OptionalSuggest | null;
  const optionalLines = suggest?.optional_lines ?? [];
  const mandatoryLines = (suggest?.plan_lines ?? []).filter((line) => !line.is_optional);
  const selectedOptionalLines = optionalLines.filter(
    (line) => typeof line.fee_type_id === 'number' && child.selectedServiceIds.includes(line.fee_type_id),
  );
  const feeLines = [...mandatoryLines, ...selectedOptionalLines];
  const periodDefaults = fullRegistrationPricingPeriodDefaults(enrollmentDate);
  const availableServices = optionalLines.filter((line) => {
    if (typeof line.fee_type_id !== 'number') return false;
    if (child.selectedServiceIds.includes(line.fee_type_id)) return false;
    return !serviceSearch.trim() || line.fee_type_name.toLowerCase().includes(serviceSearch.trim().toLowerCase());
  });

  function addService(line: EnrollmentPlanLine) {
    if (typeof line.fee_type_id !== 'number') return;
    onChange({
      ...child,
      selectedServiceIds: Array.from(new Set([...child.selectedServiceIds, line.fee_type_id])),
    });
    setServiceSearch('');
  }

  function removeService(serviceId: number) {
    onChange({
      ...child,
      selectedServiceIds: child.selectedServiceIds.filter((id) => id !== serviceId),
    });
  }

  function updatePricing(line: EnrollmentPlanLine, patch: Partial<PricingAdjustment>) {
    const key = String(line.line_id);
    const existing = child.pricingAdjustments.find((item) => item.item_key === key);
    const next: PricingAdjustment = {
      item_key: key,
      adjusted_unit_price: existing?.adjusted_unit_price ?? lineUnitAmount(line),
      ...(line.is_one_time || line.frequency === 'one_time'
        ? {}
        : {
            period_from: existing?.period_from ?? periodDefaults.from,
            period_to: existing?.period_to ?? periodDefaults.to,
          }),
      reason: 'manual_adjustment',
      ...patch,
    };
    onChange({
      ...child,
      pricingAdjustments: [
        ...child.pricingAdjustments.filter((item) => item.item_key !== key),
        next,
      ],
    });
  }

  const total = feeLines.reduce((sum, line) => sum + lineTotalAmount(line), 0);
  const currency = suggest?.currency;

  if (child.collapsed) {
    return (
      <article className={styles.childCardCollapsed}>
        <button type="button" className={styles.childCollapseButton} onClick={() => onChange({ ...child, collapsed: false })}>
          <strong>الابن {index + 1}</strong>
          <span>{childName(child)} • {filteredLevels.find((level) => String(level.school_level_id) === child.levelId)?.name || 'المستوى'} • {child.dateOfBirth || 'الميلاد'}</span>
        </button>
      </article>
    );
  }

  return (
    <article className={styles.childCard} data-testid={`family-v2-child-${index}`}>
      <div className={styles.cardHead}>
        <h3>الابن {index + 1}</h3>
        <div className={styles.inlineAction}>
          {index > 0 ? <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>حذف</button> : null}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange({ ...child, collapsed: true })}>طي</button>
        </div>
      </div>

      <h4 className={styles.subTitle}>البيانات الشخصية</h4>
      <div className={styles.formGrid}>
        <label className={styles.field}><span>الاسم الشخصي بالعربية *</span><input className="input" value={child.firstNameAr} onChange={(e) => onChange({ ...child, firstNameAr: e.target.value })} /></label>
        <label className={styles.field}><span>الاسم العائلي بالعربية *</span><input className="input" value={child.lastNameAr} onChange={(e) => onChange({ ...child, lastNameAr: e.target.value })} /></label>
        <label className={styles.field}><span>الاسم الشخصي بالحروف اللاتينية *</span><input className="input" dir="ltr" value={child.firstNameLatin} onChange={(e) => onChange({ ...child, firstNameLatin: e.target.value })} /></label>
        <label className={styles.field}><span>الاسم العائلي بالحروف اللاتينية *</span><input className="input" dir="ltr" value={child.lastNameLatin} onChange={(e) => onChange({ ...child, lastNameLatin: e.target.value })} /></label>
        <label className={styles.field}><span>الجنس *</span><select className="input" value={child.gender} onChange={(e) => onChange({ ...child, gender: e.target.value })}><option value="">اختر</option>{genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className={styles.field}><span>تاريخ الميلاد *</span><input className="input" type="date" value={child.dateOfBirth} onChange={(e) => onChange({ ...child, dateOfBirth: e.target.value })} /></label>
        <label className={styles.field}><span>المؤسسة السابقة — اختياري</span><input className="input" value={child.previousSchool} onChange={(e) => onChange({ ...child, previousSchool: e.target.value })} /></label>
        <label className={styles.field}><span>العنوان — اختياري</span><input className="input" value={child.address} onChange={(e) => onChange({ ...child, address: e.target.value })} /></label>
      </div>

      <h4 className={styles.subTitle}>التسجيل الدراسي</h4>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>السلك *</span>
          <select className="input" value={child.cycleId} onChange={(e) => onChange({ ...child, cycleId: e.target.value, levelId: '' })}>
            <option value="">اختر</option>
            {cycles.map((cycle) => <option key={cycle.id} value={String(cycle.id)}>{cycle.name}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>المستوى *</span>
          <select className="input" value={child.levelId} disabled={!child.cycleId} onChange={(e) => onChange({ ...child, levelId: e.target.value, selectedServiceIds: [], pricingAdjustments: [] })}>
            <option value="">اختر</option>
            {filteredLevels.map((level) => <option key={level.id} value={String(level.school_level_id)}>{level.name}</option>)}
          </select>
        </label>
      </div>

      <h4 className={styles.subTitle}>الخدمات</h4>
      <div className={styles.serviceCombo}>
        <div className={styles.chips}>
          {selectedOptionalLines.map((line) => (
            <button type="button" key={line.line_id} className={styles.chip} onClick={() => removeService(line.fee_type_id as number)}>
              {line.fee_type_name} ×
            </button>
          ))}
          <input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="ابحث عن خدمة وأضفها…" disabled={!child.levelId || feeState.loading} />
        </div>
        {serviceSearch.trim() && availableServices.length ? (
          <div className={styles.serviceResults}>
            {availableServices.slice(0, 6).map((line) => (
              <button type="button" key={line.line_id} onClick={() => addService(line)}>
                <span>{line.fee_type_name}</span><strong>{money(lineUnitAmount(line), currency)}</strong>
              </button>
            ))}
          </div>
        ) : null}
        {feeState.loading ? <span className={styles.muted}>جارٍ تحميل الخدمات والرسوم…</span> : null}
        {feeState.error ? <span className={styles.warning}>تعذر تحميل ملخص الرسوم لهذا المستوى.</span> : null}
      </div>

      <div className={styles.feeSummary}>
        <div className={styles.cardHead}>
          <h4>الرسوم</h4>
          <button type="button" className="btn btn--ghost btn--sm" disabled={!feeLines.length} onClick={() => setEditingFees((value) => !value)}>
            تعديل
          </button>
        </div>
        {feeLines.length ? (
          <>
            <div className={styles.feeLines}>
              {feeLines.map((line) => <div key={line.line_id}><span>{line.fee_type_name}</span><strong>{money(lineUnitAmount(line), currency)}{line.is_monthly || line.frequency === 'monthly' ? ' / شهر' : ''}</strong></div>)}
            </div>
            <div className={styles.feeTotal}><span>الإجمالي / الاستحقاق المختصر</span><strong>{money(total, currency)}</strong></div>
          </>
        ) : <span className={styles.muted}>يظهر الملخص المالي بعد اختيار المستوى.</span>}

        {editingFees && feeLines.length ? (
          <div className={styles.feeEditor}>
            {feeLines.map((line) => {
              const adjustment = child.pricingAdjustments.find((item) => item.item_key === String(line.line_id));
              const recurring = !(line.is_one_time || line.frequency === 'one_time');
              return (
                <div className={styles.feeEditRow} key={line.line_id}>
                  <strong>{line.fee_type_name}</strong>
                  <label><span>السعر</span><input className="input" type="number" min="0" step="0.01" value={adjustment?.adjusted_unit_price ?? lineUnitAmount(line)} onChange={(e) => updatePricing(line, { adjusted_unit_price: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                  {recurring ? <label><span>من</span><input className="input" type="month" value={adjustment?.period_from ?? periodDefaults.from} onChange={(e) => updatePricing(line, { period_from: e.target.value })} /></label> : null}
                  {recurring ? <label><span>إلى</span><input className="input" type="month" value={adjustment?.period_to ?? periodDefaults.to} onChange={(e) => updatePricing(line, { period_to: e.target.value })} /></label> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function FamilyRegistrationV2FrozenPage() {
  const session = useSession();
  const t = useT();
  if (!canCreateStudents(session)) {
    return <div className={styles.page}><PermissionDeniedState description={t('admin.pageForbidden')} /></div>;
  }
  return <FamilyRegistrationV2FrozenAllowed />;
}

function FamilyRegistrationV2FrozenAllowed() {
  const router = useRouter();
  const toast = useToast();
  const { locale } = useLocale();
  const { activeSchoolId } = useAdminSession();
  const studentOptions = useStudentOptions();
  const levelOptions = useLevelOptions(true, { include_enabled: 'true' });
  const today = useMemo(() => todayIsoDate(), []);
  const batchKeyRef = useRef(randomKey('family-v2-batch'));
  const [academicYearId, setAcademicYearId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(today);
  const [familyContext, setFamilyContext] = useState<FamilyContext>('parents_together');
  const [singleGuardianKey, setSingleGuardianKey] = useState<GuardianKey>('father');
  const [billingGuardianKey, setBillingGuardianKey] = useState<GuardianKey>('father');
  const [guardians, setGuardians] = useState<Record<GuardianKey, GuardianDraft>>({ father: emptyGuardian('father'), mother: emptyGuardian('mother') });
  const [children, setChildren] = useState<ChildDraft[]>(() => [emptyChild(false)]);
  const [results, setResults] = useState<Record<string, ChildResult>>({});
  const [submitting, setSubmitting] = useState(false);

  const defaultAcademicYearId = useMemo(
    () => resolveDefaultAcademicYearId(studentOptions.options?.academicYears ?? []),
    [studentOptions.options?.academicYears],
  );
  useEffect(() => {
    if (!academicYearId && defaultAcademicYearId) setAcademicYearId(String(defaultAcademicYearId));
  }, [academicYearId, defaultAcademicYearId]);

  const selectedKeys = selectedGuardianKeys(familyContext, singleGuardianKey);
  useEffect(() => {
    if (!selectedKeys.includes(billingGuardianKey)) setBillingGuardianKey(selectedKeys[0]);
  }, [billingGuardianKey, selectedKeys]);

  const genderOptions = (studentOptions.options?.genders ?? []).map((option) => ({ value: option.value, label: option.label }));
  const specialContractBlocked = familyContext === 'separated_or_divorced' || familyContext === 'special';
  const valid = Boolean(
    activeSchoolId &&
      academicYearId &&
      enrollmentDate &&
      selectedKeys.every((key) => guardianReady(guardians[key])) &&
      children.length &&
      children.every(childReady) &&
      !specialContractBlocked,
  );

  function updateGuardian(key: GuardianKey, next: GuardianDraft) {
    setGuardians((current) => ({ ...current, [key]: next }));
  }

  function updateChild(localId: string, next: ChildDraft) {
    setChildren((current) => current.map((child) => (child.localId === localId ? next : child)));
  }

  function resolveGuardiansFromResponse(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const resolved = (data as { guardians_resolved?: unknown }).guardians_resolved;
    const mapping = new Map<string, number>();
    if (Array.isArray(resolved)) {
      for (const item of resolved) {
        if (!item || typeof item !== 'object') continue;
        const row = item as { client_guardian_key?: string; guardian_id?: number };
        if (row.client_guardian_key && typeof row.guardian_id === 'number') mapping.set(row.client_guardian_key, row.guardian_id);
      }
    } else if (resolved && typeof resolved === 'object') {
      for (const [key, value] of Object.entries(resolved as Record<string, unknown>)) {
        const row = value && typeof value === 'object' ? (value as { guardian_id?: number }) : null;
        if (row && typeof row.guardian_id === 'number') mapping.set(key, row.guardian_id);
      }
    }
    if (!mapping.size) return;
    setGuardians((current) => {
      const next = { ...current };
      for (const key of ['father', 'mother'] as GuardianKey[]) {
        const resolvedId = mapping.get(`family-v2-${key}`);
        if (resolvedId) next[key] = { ...next[key], mode: 'existing', linkedGuardianId: resolvedId };
      }
      return next;
    });
  }

  function buildRequest(onlyIds?: string[]) {
    const attempted = onlyIds ? children.filter((child) => onlyIds.includes(child.localId)) : children;
    return {
      idempotency_key: batchKeyRef.current,
      guardians: selectedKeys.map((key) => {
        const guardian = guardians[key];
        if (guardian.mode === 'existing') {
          return { client_guardian_key: `family-v2-${key}`, guardian_id: guardian.linkedGuardianId as number };
        }
        return {
          client_guardian_key: `family-v2-${key}`,
          guardian: {
            name: guardian.nameAr.trim(),
            name_ar: guardian.nameAr.trim(),
            name_fr: guardian.nameLatin.trim(),
            mobile: guardian.phone.trim(),
            preferred_language: guardian.preferredLanguage,
            ...(guardian.identity.trim() ? { national_id: guardian.identity.trim() } : {}),
            ...(guardian.email.trim() ? { email: guardian.email.trim() } : {}),
            relationship_type: key,
          },
        };
      }),
      children: attempted.map((child) => ({
        client_child_id: child.localId,
        idempotency_key: child.idempotencyKey,
        first_name: child.firstNameAr.trim(),
        last_name: child.lastNameAr.trim(),
        name_ar: [child.firstNameAr, child.lastNameAr].map((value) => value.trim()).filter(Boolean).join(' '),
        name_latin: [child.firstNameLatin, child.lastNameLatin].map((value) => value.trim()).filter(Boolean).join(' '),
        gender: child.gender,
        date_of_birth: child.dateOfBirth,
        previous_school: child.previousSchool.trim() || undefined,
        residence_address: child.address.trim() || undefined,
        family_context: familyContext,
        selected_service_ids: child.selectedServiceIds,
        ...(child.pricingAdjustments.length ? { pricing_adjustments: child.pricingAdjustments } : {}),
        academic: {
          academic_year_id: Number(academicYearId),
          level_id: Number(child.levelId),
          enrollment_date: enrollmentDate,
        },
        enrollment: { actual_join_date: enrollmentDate },
        guardian_relationships: selectedKeys.map((key, index) => ({
          client_guardian_key: `family-v2-${key}`,
          relationship_type: key,
          is_primary_contact: index === 0,
          is_financial_responsible: key === billingGuardianKey,
          receives_notifications: true,
          provision_access: true,
        })),
        billing_responsibility: {
          mode: 'guardian',
          billing_guardian_client_key: `family-v2-${billingGuardianKey}`,
        },
      })),
    };
  }

  async function submit(options?: { onlyFailed?: boolean; collectNow?: boolean }) {
    if (submitting) return;
    const onlyIds = options?.onlyFailed
      ? children.filter((child) => results[child.localId]?.status === 'failed' && results[child.localId]?.retryable !== false).map((child) => child.localId)
      : undefined;
    if (onlyIds && !onlyIds.length) return;
    if (!options?.onlyFailed && !valid) {
      toast.error(specialContractBlocked ? 'هذه الحالة تحتاج تحديدًا صريحًا للمسؤول القانوني قبل التسجيل، ولا يمكن افتراضه تلقائيًا.' : 'راجع الحقول المطلوبة قبل اعتماد تسجيل الأسرة.');
      return;
    }
    setSubmitting(true);
    const request = buildRequest(onlyIds);
    const attemptedIds = request.children.map((child) => child.client_child_id);
    setResults((current) => {
      const next = { ...current };
      attemptedIds.forEach((id) => { next[id] = { status: 'pending' }; });
      return next;
    });
    try {
      const res = await api.post<BatchRegistrationResponse>(endpoints.admin.studentsBatchRegistration, request);
      if (!res.success) {
        setResults((current) => {
          const next = { ...current };
          attemptedIds.forEach((id) => { next[id] = { status: 'failed', error: res.error?.message || 'تعذر التسجيل.', retryable: true }; });
          return next;
        });
        toast.error(res.error?.message || 'تعذر تسجيل الأسرة.');
        return;
      }
      resolveGuardiansFromResponse(res.data);
      const childRows = Array.isArray(res.data.children) ? res.data.children : [];
      const mapped: Record<string, ChildResult> = {};
      childRows.forEach((row) => {
        const succeeded = row.status === 'succeeded' || row.status === 'replayed' || row.replayed === true;
        mapped[row.client_child_id] = succeeded
          ? { status: 'succeeded', studentId: typeof row.student_id === 'number' ? row.student_id : undefined, retryable: false }
          : { status: 'failed', error: row.error?.message || row.error?.code || 'تعذر التسجيل.', retryable: row.retryable !== false };
      });
      setResults((current) => ({ ...current, ...mapped }));
      if (res.data.status === 'completed') {
        toast.success('تم تسجيل جميع الأبناء بنجاح.');
        if (options?.collectNow) {
          const firstStudent = childRows.find((row) => typeof row.student_id === 'number' && row.student_id > 0);
          if (firstStudent?.student_id) {
            router.push(buildFullRegistrationCollectNowHref({ studentId: firstStudent.student_id, academicYearId }));
          }
        }
      } else if (res.data.status === 'partially_completed') {
        toast.error('تم تسجيل بعض الأبناء. يمكنك إعادة الفاشلين فقط.');
      } else {
        toast.error('تعذر تسجيل الأسرة.');
      }
    } catch {
      setResults((current) => {
        const next = { ...current };
        attemptedIds.forEach((id) => { next[id] = { status: 'ambiguous', error: 'النتيجة غير مؤكدة بعد انقطاع الاتصال.', retryable: false }; });
        return next;
      });
      toast.error('النتيجة غير مؤكدة. لن تتم إعادة الإرسال تلقائيًا.');
    } finally {
      setSubmitting(false);
    }
  }

  const summary = children.reduce(
    (acc, child) => {
      const status = results[child.localId]?.status;
      if (status === 'succeeded') acc.succeeded += 1;
      if (status === 'failed') acc.failed += 1;
      if (status === 'ambiguous') acc.ambiguous += 1;
      return acc;
    },
    { succeeded: 0, failed: 0, ambiguous: 0 },
  );
  const retryableFailed = children.some((child) => results[child.localId]?.status === 'failed' && results[child.localId]?.retryable !== false);

  return (
    <main className={styles.page} dir={locale === 'ar' ? 'rtl' : 'ltr'} data-testid="family-registration-v2-frozen">
      <div className={styles.titleRow}>
        <h1>تسجيل أسرة جديدة</h1>
        <Link className="btn btn--ghost" href="/admin/students/new">التسجيل الفردي</Link>
      </div>

      <section className={styles.defaultsRow} aria-label="الإعدادات الافتراضية">
        <label className={styles.field}>
          <span>السنة الدراسية</span>
          <select className="input" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
            <option value="">السنة الدراسية الحالية افتراضيًا</option>
            {(studentOptions.options?.academicYears ?? []).map((year) => <option key={year.id} value={String(year.id)}>{year.name}</option>)}
          </select>
        </label>
        <div className={styles.defaultReadOnly}><span>المسؤول المالي</span><strong>الولي افتراضيًا</strong></div>
        <label className={styles.field}><span>تاريخ الالتحاق</span><input className="input" type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} /></label>
      </section>

      <section className={styles.twoColumns}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionHead}><h2>أولياء الأمر</h2></div>
          <div className={styles.guardianStack}>
            {selectedKeys.includes('father') ? <GuardianCard kind="father" draft={guardians.father} onChange={(next) => updateGuardian('father', next)} activeSchoolId={activeSchoolId} billingGuardianKey={billingGuardianKey} onBillingGuardian={setBillingGuardianKey} /> : null}
            {selectedKeys.includes('mother') ? <GuardianCard kind="mother" draft={guardians.mother} onChange={(next) => updateGuardian('mother', next)} activeSchoolId={activeSchoolId} billingGuardianKey={billingGuardianKey} onBillingGuardian={setBillingGuardianKey} /> : null}
          </div>
        </div>
        <aside className={styles.sideCard}>
          <h2>وضع الأسرة</h2>
          <div className={styles.familyOptions}>
            {FAMILY_OPTIONS.map((option) => <label key={option.value}><input type="radio" name="family-v2-context" checked={familyContext === option.value} onChange={() => setFamilyContext(option.value)} /><span>{option.label}</span></label>)}
          </div>
          {familyContext === 'single_guardian' ? <div className={styles.singleChoice}><span>من هو الولي؟</span><button type="button" className={singleGuardianKey === 'father' ? styles.activeChoice : ''} onClick={() => setSingleGuardianKey('father')}>الأب</button><button type="button" className={singleGuardianKey === 'mother' ? styles.activeChoice : ''} onClick={() => setSingleGuardianKey('mother')}>الأم</button></div> : null}
          {specialContractBlocked ? <div className={styles.warning}>هذه الحالة تحتاج تحديد المسؤول القانوني صراحةً قبل الإرسال؛ لن يفترض رقيم هذا القرار.</div> : null}
        </aside>
      </section>

      <section className={styles.twoColumns}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionHead}><h2>الأبناء</h2></div>
          <div className={styles.childrenStack}>
            {children.map((child, index) => <ChildCard key={child.localId} child={child} index={index} onChange={(next) => updateChild(child.localId, next)} onRemove={() => setChildren((current) => current.filter((item) => item.localId !== child.localId))} academicYearId={academicYearId} enrollmentDate={enrollmentDate} activeSchoolId={activeSchoolId} levelOptions={levelOptions.options} genderOptions={genderOptions} />)}
          </div>
          <button type="button" className="btn btn--secondary" disabled={children.length >= 10} onClick={() => setChildren((current) => [...current.map((child) => ({ ...child, collapsed: true })), emptyChild(false)])}>+ إضافة ابن</button>
        </div>
        <aside className={styles.sideCard}>
          <h2>ملخص التسجيل</h2>
          <dl className={styles.summaryList}>
            <div><dt>عدد الأبناء</dt><dd>{children.length}</dd></div>
            <div><dt>الأولياء</dt><dd>{selectedKeys.length}</dd></div>
            <div><dt>مسؤول الأداء</dt><dd>{billingGuardianKey === 'father' ? 'الأب' : 'الأم'}</dd></div>
            <div><dt>تم التسجيل</dt><dd>{summary.succeeded}</dd></div>
            {summary.failed ? <div><dt>تعذر</dt><dd>{summary.failed}</dd></div> : null}
            {summary.ambiguous ? <div><dt>غير مؤكد</dt><dd>{summary.ambiguous}</dd></div> : null}
          </dl>
          <div className={styles.childStatuses}>{children.map((child, index) => <div key={child.localId}><span>الابن {index + 1}</span><strong>{results[child.localId]?.status === 'succeeded' ? 'تم التسجيل' : results[child.localId]?.status === 'failed' ? 'تعذر التسجيل' : results[child.localId]?.status === 'ambiguous' ? 'غير مؤكد' : 'جاهز للإرسال'}</strong></div>)}</div>
          {retryableFailed ? <button type="button" className="btn btn--secondary btn--sm" disabled={submitting} onClick={() => void submit({ onlyFailed: true })}>إعادة الفاشلين فقط</button> : null}
        </aside>
      </section>

      <footer className={styles.actions}>
        <Link className="btn btn--ghost" href="/admin/students">إلغاء</Link>
        <button type="button" className="btn btn--secondary" disabled={submitting || !valid} onClick={() => void submit({ collectNow: true })}>{submitting ? 'جارٍ التسجيل…' : 'اعتماد وتحصيل الآن'}</button>
        <button type="button" className="btn btn--primary" disabled={submitting || !valid} onClick={() => void submit()}>{submitting ? 'جارٍ التسجيل…' : 'اعتماد تسجيل الأسرة'}</button>
      </footer>
    </main>
  );
}
