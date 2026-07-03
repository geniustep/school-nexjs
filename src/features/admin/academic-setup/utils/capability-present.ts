import type { TranslateFn } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';
import { getMessage, MESSAGES } from '@/lib/i18n/messages';
import type { StaffAdminKind, StaffCapabilityOption, RolePermissionMetadata } from '@/types/academic-setup';
import {
  requiresCapabilityCatalogForCreate,
  shouldOmitCapabilityIds,
} from './staff-permissions-meta';

const CAPABILITY_KEY_PREFIX = 'admin.academicSetup.capabilities';
const CATEGORY_KEY_PREFIX = 'admin.academicSetup.capCategory';

/** Stable category display order — uses category code, not translated label. */
export const CAPABILITY_CATEGORY_ORDER = [
  'dashboard',
  'registration',
  'students',
  'parents',
  'classes',
  'teachers',
  'attendance',
  'academics',
  'content',
  'communication',
  'exams',
  'finance',
  'operations',
  'reporting',
  'settings',
  'other',
] as const;

/** Known backend code aliases → canonical translation path suffix. */
const CAPABILITY_CODE_ALIASES: Record<string, string> = {
  manage_payments: 'finance.collect_payments',
  'finance.manage_payments': 'finance.collect_payments',
  'finance.manage': 'finance.view',
  'finance.apply_social_discount': 'finance.apply_social_discount',
  'finance.accept_early_payments': 'finance.accept_early_payments',
  'admission.create': 'admission.create',
  'admission.view': 'admission.view',
  'admission.manage': 'admission.manage',
  'admission.evaluate': 'admission.evaluate',
  'admission.schedule': 'admission.schedule',
  'admission.offer': 'admission.offer',
  'admission.prefill': 'admission.prefill',
  'admission.link_student': 'admission.link_student',
  'admission.decide': 'admission.decide',
  'guardian.delete_permanently': 'guardian.delete_permanently',
  link_to_student: 'student.link_to_student',
  unlink_from_student: 'student.unlink_from_student',
  update_limited: 'student.update_limited',
  link_guardians: 'student.link_guardians',
  manage_registration_data: 'student.manage_registration_data',
  manage_student_guardian_links: 'student.manage_guardian_links',
  'student.manage_student_guardian_links': 'student.manage_guardian_links',
  'students.bulk_import': 'students.import',
  manage_branding: 'school.manage_branding',
  'guardian.create': 'guardian.create',
  'guardian.link_to_student': 'guardian.link_to_student',
  'guardian.unlink_from_student': 'guardian.unlink_from_student',
  'guardian.update_limited': 'guardian.update_limited',
  create_guardians: 'guardian.create',
  link_guardian_to_student: 'guardian.link_to_student',
  unlink_guardian_from_student: 'guardian.unlink_from_student',
  update_guardians_limited: 'guardian.update_limited',
};

/** English API labels → canonical translation path suffix. */
const CAPABILITY_ENGLISH_LABEL_ALIASES: Record<string, string> = {
  'link to student': 'student.link_to_student',
  'unlink from student': 'student.unlink_from_student',
  'update limited': 'student.update_limited',
  'link guardians': 'student.link_guardians',
  'manage registration data': 'student.manage_registration_data',
  'manage student-guardian links': 'student.manage_guardian_links',
  'manage student–guardian links': 'student.manage_guardian_links',
  'manage branding': 'school.manage_branding',
  'manage student documents': 'student.manage_documents',
  'view student documents': 'student.view_documents',
  'manage student health records': 'student.manage_health',
  'view student health records': 'student.view_health',
  'manage student approvals': 'student.manage_approvals',
  'view student approvals': 'student.view_approvals',
  'bulk import for students': 'students.import',
  'create guardians': 'guardian.create',
  'link guardian to student': 'guardian.link_to_student',
  'unlink guardian from student': 'guardian.unlink_from_student',
  'update guardians': 'guardian.update_limited',
  'update guardians (limited contact fields)': 'guardian.update_limited',
  'link guardians to students': 'student.link_guardians',
  'manage student registration data': 'student.manage_registration_data',
  'update students': 'student.update_limited',
  'update students (limited registration fields)': 'student.update_limited',
};

export const SENSITIVE_CAPABILITY_CODES = new Set<string>([
  'manage_teachers',
  'manage_students',
  'manage_parents',
  'manage_classes',
  'finance.manage_discounts',
  'finance.approve_discounts',
  'finance.cancel_payments',
  'finance.cancel_cheques',
  'finance.manage_settings',
  'finance.manage_fee_catalog',
  'finance.manage_fee_plans',
  'import_data',
  'manage_complaints',
  'manage_exams',
  'manage_exam_results',
]);

export type StaffCapabilityUxMode = 'full_editor' | 'role_summary' | 'supervisor';

export function getStaffCapabilityUxMode(adminKind: string): StaffCapabilityUxMode {
  switch (adminKind as StaffAdminKind) {
    case 'school_manager':
    case 'project_manager':
      return 'role_summary';
    case 'general_supervisor':
      return 'supervisor';
    case 'pedagogical_director':
      return 'full_editor';
    default:
      return 'full_editor';
  }
}

function formatCodeAsLabel(code: string, locale: Locale): string {
  const segment = code.includes('.') ? code.split('.').pop() ?? code : code;
  const words = segment.replace(/[_-]+/g, ' ').trim();
  if (!words) return code;
  if (locale === 'ar') {
    return words;
  }
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategoryCodeLabel(categoryCode: string, locale: Locale): string {
  return formatCodeAsLabel(categoryCode, locale);
}

function capabilityCodeVariants(code: string): string[] {
  const trimmed = code.trim();
  const variants = new Set<string>([trimmed]);
  if (trimmed.includes('_')) variants.add(trimmed.replace(/_/g, '.'));
  if (trimmed.includes('.')) variants.add(trimmed.replace(/\./g, '_'));
  return [...variants];
}

function capabilityTranslationKeys(code: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const push = (key: string) => {
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  };

  for (const variant of capabilityCodeVariants(code)) {
    push(`${CAPABILITY_KEY_PREFIX}.${variant}`);

    const alias = CAPABILITY_CODE_ALIASES[variant];
    if (alias) push(`${CAPABILITY_KEY_PREFIX}.${alias}`);

    if (variant.includes('.')) {
      const [prefix, ...rest] = variant.split('.');
      if (prefix === 'finance' && rest.length) {
        push(`${CAPABILITY_KEY_PREFIX}.finance.${rest.join('.')}`);
      }
    } else if (variant.startsWith('finance_')) {
      push(`${CAPABILITY_KEY_PREFIX}.finance.${variant.slice('finance_'.length)}`);
    }
  }

  return keys;
}

function normalizeEnglishLabelKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveCapabilityTranslation(locale: Locale, code: string, apiLabel?: string): string | undefined {
  for (const key of capabilityTranslationKeys(code)) {
    const translated = getMessage(MESSAGES[locale], key) ?? getMessage(MESSAGES.en, key);
    if (translated) return translated;
  }

  const labelKey = apiLabel ? CAPABILITY_ENGLISH_LABEL_ALIASES[normalizeEnglishLabelKey(apiLabel)] : undefined;
  if (labelKey) {
    const translated =
      getMessage(MESSAGES[locale], `${CAPABILITY_KEY_PREFIX}.${labelKey}`) ??
      getMessage(MESSAGES.en, `${CAPABILITY_KEY_PREFIX}.${labelKey}`);
    if (translated) return translated;
  }

  return undefined;
}

export function looksLikeEnglishLabel(label: string): boolean {
  return /^[\x00-\x7F\s]+$/.test(label.trim()) && /[a-zA-Z]/.test(label);
}

export function resolveCapabilityLabel(
  locale: Locale,
  cap: Pick<StaffCapabilityOption, 'code' | 'label' | 'category'>,
): string {
  const apiLabel = cap.label?.trim() ?? '';
  const translated = resolveCapabilityTranslation(locale, cap.code, apiLabel);
  if (translated) return translated;

  if (apiLabel && !looksLikeEnglishLabel(apiLabel)) {
    return apiLabel;
  }

  if (locale !== 'en' && apiLabel && looksLikeEnglishLabel(apiLabel)) {
    const fromEnglishLabel = resolveCapabilityTranslation(locale, apiLabel.replace(/\s+/g, '_'), apiLabel);
    if (fromEnglishLabel) return fromEnglishLabel;
  }

  if (apiLabel && looksLikeEnglishLabel(apiLabel) && locale === 'en') {
    return apiLabel;
  }

  return apiLabel || formatCodeAsLabel(cap.code, locale);
}

export function resolveCapabilityCategoryLabel(
  categoryCode: string,
  t: TranslateFn,
  locale: Locale,
): string {
  const key = `${CATEGORY_KEY_PREFIX}.${categoryCode}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return formatCategoryCodeLabel(categoryCode, locale);
}

export function isSensitiveCapability(code: string): boolean {
  return SENSITIVE_CAPABILITY_CODES.has(code);
}

export function normalizeCapabilityCatalog(
  items: StaffCapabilityOption[],
): StaffCapabilityOption[] {
  const seenIds = new Set<number>();
  const seenCodes = new Set<string>();
  const result: StaffCapabilityOption[] = [];

  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    if (seenCodes.has(item.code)) continue;
    seenIds.add(item.id);
    seenCodes.add(item.code);
    result.push(item);
  }

  return result;
}

export function sortCategoryCodes(categories: string[]): string[] {
  const orderIndex = new Map(CAPABILITY_CATEGORY_ORDER.map((c, i) => [c, i]));
  return [...categories].sort((a, b) => {
    const ai = orderIndex.get(a as (typeof CAPABILITY_CATEGORY_ORDER)[number]) ?? 999;
    const bi = orderIndex.get(b as (typeof CAPABILITY_CATEGORY_ORDER)[number]) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

export interface CapabilityCategoryGroup {
  category: string;
  capabilities: StaffCapabilityOption[];
}

export function groupCapabilitiesByCategory(
  items: StaffCapabilityOption[],
): CapabilityCategoryGroup[] {
  const normalized = normalizeCapabilityCatalog(items);
  const map = new Map<string, StaffCapabilityOption[]>();

  for (const cap of normalized) {
    const category = cap.category?.trim() || 'other';
    const list = map.get(category) ?? [];
    list.push(cap);
    map.set(category, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }

  return sortCategoryCodes([...map.keys()]).map((category) => ({
    category,
    capabilities: map.get(category) ?? [],
  }));
}

export function splitCapabilitiesByGrantable(items: StaffCapabilityOption[]): {
  base: StaffCapabilityOption[];
  additional: StaffCapabilityOption[];
} {
  const normalized = normalizeCapabilityCatalog(items);
  return {
    base: normalized.filter((c) => !c.grantable),
    additional: normalized.filter((c) => c.grantable),
  };
}

export function filterCapabilitiesBySearch(
  items: StaffCapabilityOption[],
  query: string,
  locale: Locale,
  t?: TranslateFn,
): StaffCapabilityOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((cap) => {
    const label = resolveCapabilityLabel(locale, cap).toLowerCase();
    const categoryKey = `${CATEGORY_KEY_PREFIX}.${cap.category}`;
    const categoryLabel = t ? t(categoryKey).toLowerCase() : cap.category.toLowerCase();
    return (
      label.includes(q) ||
      cap.code.toLowerCase().includes(q) ||
      categoryLabel.includes(q) ||
      cap.category.toLowerCase().includes(q)
    );
  });
}

export function countSelectedGrantable(
  capabilityIds: number[],
  grantable: StaffCapabilityOption[],
): number {
  const grantableIds = new Set(grantable.map((c) => c.id));
  return capabilityIds.filter((id) => grantableIds.has(id)).length;
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function isFinanceCapabilityCategory(category: string): boolean {
  return category === 'finance';
}

export function defaultCategoryExpanded(category: string, selectedInCategory: number): boolean {
  if (category === 'finance') return selectedInCategory > 0;
  return selectedInCategory > 0;
}

export function areCapabilityIdsDirty(current: number[], original: number[]): boolean {
  return !sameIdSet(current, original);
}

export interface StaffCapabilityPayloadInput {
  isCreate: boolean;
  capabilityIds: number[];
  originalCapabilityIds: number[];
  capabilitiesTouched: boolean;
  catalogReady: boolean;
  permissionsMeta: RolePermissionMetadata;
}

export interface StaffCapabilityPayloadResult {
  capability_ids?: number[];
  omitCapabilities: boolean;
  blockSaveDueToCatalog: boolean;
}

/** Build capability_ids for staff create/update — dirty-only on update. */
export function buildStaffCapabilityPayload(
  input: StaffCapabilityPayloadInput,
): StaffCapabilityPayloadResult {
  if (shouldOmitCapabilityIds(input.permissionsMeta)) {
    return {
      omitCapabilities: true,
      blockSaveDueToCatalog: false,
    };
  }

  if (!input.catalogReady) {
    const needsCatalog = input.isCreate && requiresCapabilityCatalogForCreate(input.permissionsMeta);
    return {
      omitCapabilities: true,
      blockSaveDueToCatalog: needsCatalog || input.capabilitiesTouched,
    };
  }

  if (input.isCreate) {
    return {
      capability_ids: input.capabilityIds,
      omitCapabilities: false,
      blockSaveDueToCatalog: false,
    };
  }

  const dirty =
    input.capabilitiesTouched ||
    areCapabilityIdsDirty(input.capabilityIds, input.originalCapabilityIds);

  if (!dirty) {
    return { omitCapabilities: true, blockSaveDueToCatalog: false };
  }

  return {
    capability_ids: input.capabilityIds,
    omitCapabilities: false,
    blockSaveDueToCatalog: false,
  };
}

export const ROLE_CAPABILITY_HIGHLIGHT_COUNT = 4;

export function roleCapabilityHighlightKey(adminKind: string, index: number): string {
  return `admin.academicSetup.roleCapabilities.${adminKind}.highlight${index}`;
}
