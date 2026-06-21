import type {
  StaffCreationTemplate,
  StaffSmartCreateFormState,
  StaffTemplateAssignments,
  StaffTemplateBundleSelection,
  StaffTemplateCapabilityItem,
  StaffTemplateCreatePayload,
  StaffTemplateCreateResult,
  StaffTemplateMainPosition,
  StaffTemplatePersonInput,
  StaffTemplatePreview,
  StaffTemplatePreviewPayload,
  StaffTemplateScope,
} from '@/types/staff-templates';
import type { StaffPasswordPolicy } from '@/types/academic-setup';
import type { Locale } from '@/lib/i18n/config';
import { resolveCapabilityLabel } from '@/features/admin/academic-setup/utils/capability-present';
import {
  meetsStaffPasswordPolicy,
  validateStaffPasswordForm,
} from '@/features/admin/academic-setup/utils/staff-password-utils';

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function normalizeStaffTemplateBundleSelection(raw: unknown): StaffTemplateBundleSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const selection: StaffTemplateBundleSelection = {
    policy: typeof item.policy === 'string' ? item.policy.trim() : undefined,
    default_bundle_codes: normalizeStringArray(item.default_bundle_codes),
    required_bundle_codes: normalizeStringArray(item.required_bundle_codes),
    optional_bundle_codes: normalizeStringArray(item.optional_bundle_codes),
    removable_bundle_codes: normalizeStringArray(item.removable_bundle_codes),
    available_bundle_codes: normalizeStringArray(item.available_bundle_codes),
    forbidden_bundle_codes: normalizeStringArray(item.forbidden_bundle_codes),
  };

  const hasValues = Object.values(selection).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  return hasValues ? selection : null;
}

export function mergeStaffTemplateBundleSelection(
  templateRaw: Record<string, unknown>,
  bundleSelection: StaffTemplateBundleSelection | null,
): StaffTemplateBundleSelection | null {
  const merged: StaffTemplateBundleSelection = {
    policy: bundleSelection?.policy,
    default_bundle_codes:
      normalizeStringArray(templateRaw.default_bundle_codes).length > 0
        ? normalizeStringArray(templateRaw.default_bundle_codes)
        : bundleSelection?.default_bundle_codes,
    required_bundle_codes:
      normalizeStringArray(templateRaw.required_bundle_codes).length > 0
        ? normalizeStringArray(templateRaw.required_bundle_codes)
        : bundleSelection?.required_bundle_codes,
    optional_bundle_codes:
      normalizeStringArray(templateRaw.optional_bundle_codes).length > 0
        ? normalizeStringArray(templateRaw.optional_bundle_codes)
        : bundleSelection?.optional_bundle_codes,
    removable_bundle_codes:
      normalizeStringArray(templateRaw.removable_bundle_codes).length > 0
        ? normalizeStringArray(templateRaw.removable_bundle_codes)
        : bundleSelection?.removable_bundle_codes,
    available_bundle_codes:
      normalizeStringArray(templateRaw.available_bundle_codes).length > 0
        ? normalizeStringArray(templateRaw.available_bundle_codes)
        : bundleSelection?.available_bundle_codes,
    forbidden_bundle_codes:
      normalizeStringArray(templateRaw.forbidden_bundle_codes).length > 0
        ? normalizeStringArray(templateRaw.forbidden_bundle_codes)
        : bundleSelection?.forbidden_bundle_codes,
  };

  const hasValues = Object.values(merged).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  return hasValues ? merged : null;
}

export function normalizeStaffTemplateCapabilityItems(raw: unknown): StaffTemplateCapabilityItem[] {
  if (!Array.isArray(raw)) return [];
  const items: StaffTemplateCapabilityItem[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' && entry.trim()) {
      items.push({ code: entry.trim() });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const code = typeof item.code === 'string' ? item.code.trim() : '';
    if (!code) continue;
    items.push({
      code,
      label: typeof item.label === 'string' ? item.label.trim() : undefined,
      category: typeof item.category === 'string' ? item.category.trim() : undefined,
    });
  }
  return items;
}

export function resolveStaffTemplateCapabilityItems(
  preview: StaffTemplatePreview | null | undefined,
  kind: 'allowed' | 'forbidden',
): StaffTemplateCapabilityItem[] {
  if (!preview) return [];
  const itemKey = kind === 'allowed' ? 'effective_capability_items' : 'forbidden_capability_items';
  const stringKey = kind === 'allowed' ? 'effective_capabilities' : 'forbidden_capabilities';
  const items = preview[itemKey];
  if (items?.length) return items;
  return (preview[stringKey] ?? []).map((code) => ({ code }));
}

export function normalizeStaffTemplateMainPosition(raw: unknown): StaffTemplateMainPosition | null {
  if (typeof raw === 'string' && raw.trim()) {
    const label = raw.trim();
    return { code: label, name: label };
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const code = typeof item.code === 'string' ? item.code.trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!code && !name) return null;
  return { code: code || name, name: name || code };
}

export function resolveStaffTemplateMainPositionLabel(
  position: StaffTemplateMainPosition | null | undefined,
): string | null {
  if (!position) return null;
  return position.name.trim() || position.code.trim() || null;
}

export function normalizeStaffCreationTemplate(raw: unknown): StaffCreationTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const code = typeof item.code === 'string' ? item.code.trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!code || !name) return null;

  const bundle_codes = Array.isArray(item.bundle_codes)
    ? item.bundle_codes.filter((v): v is string => typeof v === 'string')
    : [];

  const required_assignments = Array.isArray(item.required_assignments)
    ? item.required_assignments.filter((v): v is string => typeof v === 'string')
    : [];

  let allowed_actions: StaffCreationTemplate['allowed_actions'];
  if (Array.isArray(item.allowed_actions)) {
    allowed_actions = item.allowed_actions.filter((v): v is string => typeof v === 'string');
  } else if (item.allowed_actions && typeof item.allowed_actions === 'object') {
    allowed_actions = item.allowed_actions as Record<string, boolean>;
  }

  const bundleSelection = mergeStaffTemplateBundleSelection(
    item,
    normalizeStaffTemplateBundleSelection(item.bundle_selection ?? item.bundle_policy),
  );

  return {
    code,
    name,
    description: typeof item.description === 'string' ? item.description : null,
    main_position: normalizeStaffTemplateMainPosition(item.main_position),
    bundle_codes,
    bundle_selection: bundleSelection,
    default_bundle_codes: bundleSelection?.default_bundle_codes ?? bundle_codes,
    requires_user_account: item.requires_user_account === true,
    creates_teacher_profile: item.creates_teacher_profile === true,
    required_assignments,
    allowed_actions,
    sensitive: item.sensitive === true,
  };
}

export function normalizeStaffCreationTemplates(raw: unknown): StaffCreationTemplate[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { templates?: unknown }).templates)
      ? (raw as { templates: unknown[] }).templates
      : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
        ? (raw as { items: unknown[] }).items
        : [];

  return list
    .map(normalizeStaffCreationTemplate)
    .filter((item): item is StaffCreationTemplate => item != null);
}

export function normalizeStaffTemplatePreview(raw: unknown): StaffTemplatePreview | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const effective_capabilities = Array.isArray(item.effective_capabilities)
    ? item.effective_capabilities.filter((v): v is string => typeof v === 'string')
    : [];

  const effective_capability_items = normalizeStaffTemplateCapabilityItems(
    item.effective_capability_items,
  );

  const responsibility_bundles = Array.isArray(item.responsibility_bundles)
    ? item.responsibility_bundles.filter((v): v is string => typeof v === 'string')
    : [];

  const selected_bundle_codes = normalizeStringArray(item.selected_bundle_codes);

  const required_fields = Array.isArray(item.required_fields)
    ? item.required_fields.filter((v): v is string => typeof v === 'string')
    : [];

  const forbidden_capabilities = Array.isArray(item.forbidden_capabilities)
    ? item.forbidden_capabilities.filter((v): v is string => typeof v === 'string')
    : [];

  const forbidden_capability_items = normalizeStaffTemplateCapabilityItems(
    item.forbidden_capability_items,
  );

  const warnings = Array.isArray(item.warnings) ? item.warnings : [];

  const scopeRaw = item.scope;
  const scope =
    scopeRaw && typeof scopeRaw === 'object'
      ? {
          school_id:
            typeof (scopeRaw as StaffTemplateScope).school_id === 'number'
              ? (scopeRaw as StaffTemplateScope).school_id
              : undefined,
          level_ids: Array.isArray((scopeRaw as StaffTemplateScope).level_ids)
            ? (scopeRaw as StaffTemplateScope).level_ids
            : undefined,
          class_ids: Array.isArray((scopeRaw as StaffTemplateScope).class_ids)
            ? (scopeRaw as StaffTemplateScope).class_ids
            : undefined,
        }
      : undefined;

  return {
    allowed_to_create: item.allowed_to_create === true,
    effective_capabilities,
    effective_capability_items,
    responsibility_bundles,
    selected_bundle_codes,
    scope,
    required_fields,
    warnings,
    forbidden_capabilities,
    forbidden_capability_items,
  };
}

export function groupStaffTemplatesByMainPosition(
  templates: StaffCreationTemplate[],
): { key: string; label: string; templates: StaffCreationTemplate[] }[] {
  const groups = new Map<string, { label: string; templates: StaffCreationTemplate[] }>();
  for (const template of templates) {
    const position = template.main_position;
    const key = position?.code.trim() || position?.name.trim() || '__other__';
    const label = resolveStaffTemplateMainPositionLabel(position) ?? '';
    const bucket = groups.get(key) ?? { label, templates: [] };
    if (!bucket.label && label) bucket.label = label;
    bucket.templates.push(template);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      label: key === '__other__' ? '' : group.label,
      templates: group.templates.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (!a.label) return 1;
      if (!b.label) return -1;
      return a.label.localeCompare(b.label);
    });
}

export function templateAllowsCreate(template: StaffCreationTemplate | null | undefined): boolean {
  if (!template) return false;
  const actions = template.allowed_actions;
  if (Array.isArray(actions)) {
    return actions.includes('create') || actions.includes('from_template');
  }
  if (actions && typeof actions === 'object') {
    return actions.create === true || actions.from_template === true || actions.create_from_template === true;
  }
  return true;
}

export function defaultStaffSmartCreateFormState(): StaffSmartCreateFormState {
  return {
    templateCode: '',
    selectedBundleCodes: [],
    person: { name: '', phone: '', email: '' },
    createAccount: true,
    assignPasswordNow: true,
    login: '',
    useDifferentLogin: false,
    password: '',
    confirmPassword: '',
    assignments: { subject_id: null, class_ids: [], academic_year_id: null },
  };
}

export function buildStaffTemplateScope(schoolId: number | null): StaffTemplateScope {
  return schoolId != null ? { school_id: schoolId } : {};
}

export function buildStaffTemplateAssignmentsInput(
  assignments: StaffTemplateAssignments,
): StaffTemplateAssignments {
  const payload: StaffTemplateAssignments = {};
  if (assignments.subject_id != null) payload.subject_id = assignments.subject_id;
  if (assignments.academic_year_id != null) payload.academic_year_id = assignments.academic_year_id;
  if (assignments.class_ids?.length) payload.class_ids = [...assignments.class_ids];
  return payload;
}

export function resolveInitialSelectedBundleCodes(template: StaffCreationTemplate): string[] {
  const selection = template.bundle_selection;
  const required = selection?.required_bundle_codes ?? [];
  const defaults =
    selection?.default_bundle_codes?.length
      ? selection.default_bundle_codes
      : template.default_bundle_codes?.length
        ? template.default_bundle_codes
        : template.bundle_codes?.length
          ? template.bundle_codes
          : required;

  return uniqueStrings([...required, ...defaults]);
}

export function resolveRequiredBundleCodes(template: StaffCreationTemplate | null | undefined): string[] {
  return template?.bundle_selection?.required_bundle_codes ?? [];
}

export function isStaffTemplateBundleRemovable(
  template: StaffCreationTemplate | null | undefined,
  code: string,
): boolean {
  if (!template) return false;
  const required = resolveRequiredBundleCodes(template);
  if (required.includes(code)) return false;
  const removable = template.bundle_selection?.removable_bundle_codes ?? [];
  if (removable.length) return removable.includes(code);
  return !required.includes(code);
}

export function resolveAddableStaffTemplateBundleCodes(
  template: StaffCreationTemplate | null | undefined,
  selectedBundleCodes: string[],
): string[] {
  if (!template) return [];
  const selection = template.bundle_selection;
  const selected = new Set(selectedBundleCodes);
  const forbidden = new Set(selection?.forbidden_bundle_codes ?? []);
  const pool = uniqueStrings([
    ...(selection?.available_bundle_codes ?? []),
    ...(selection?.optional_bundle_codes ?? []),
  ]);
  return pool.filter((code) => !selected.has(code) && !forbidden.has(code));
}

export function resolveForbiddenStaffTemplateBundleCodes(
  template: StaffCreationTemplate | null | undefined,
): string[] {
  return template?.bundle_selection?.forbidden_bundle_codes ?? [];
}

export function resolveSelectedEditableBundleCodes(
  template: StaffCreationTemplate | null | undefined,
  selectedBundleCodes: string[],
): string[] {
  const required = new Set(resolveRequiredBundleCodes(template));
  return selectedBundleCodes.filter((code) => !required.has(code));
}

export function buildStaffTemplatePreviewPayload(
  templateCode: string,
  schoolId: number | null,
  assignments: StaffTemplateAssignments,
  selectedBundleCodes: string[] = [],
): StaffTemplatePreviewPayload {
  const payload: StaffTemplatePreviewPayload = {
    template_code: templateCode,
    scope: buildStaffTemplateScope(schoolId),
    assignments: buildStaffTemplateAssignmentsInput(assignments),
  };
  if (selectedBundleCodes.length) {
    payload.selected_bundle_codes = [...selectedBundleCodes];
  }
  return payload;
}

export function resolveStaffTemplateAccountLogin(
  person: StaffTemplatePersonInput,
  login: string,
  useDifferentLogin: boolean,
): string {
  if (useDifferentLogin) return login.trim();
  return person.email.trim() || login.trim();
}

export function buildStaffTemplateCreatePayload(
  form: StaffSmartCreateFormState,
  schoolId: number | null,
  template: StaffCreationTemplate,
): StaffTemplateCreatePayload {
  const person: StaffTemplatePersonInput = {
    name: form.person.name.trim(),
    phone: form.person.phone.trim(),
    email: form.person.email.trim(),
  };

  const payload: StaffTemplateCreatePayload = {
    template_code: form.templateCode,
    person,
    scope: buildStaffTemplateScope(schoolId),
    assignments: buildStaffTemplateAssignmentsInput(form.assignments),
  };

  if (form.selectedBundleCodes.length) {
    payload.selected_bundle_codes = [...form.selectedBundleCodes];
  }

  const requiresAccount = template.requires_user_account || form.createAccount;
  if (requiresAccount && form.createAccount) {
    payload.account = {
      create: true,
      login: resolveStaffTemplateAccountLogin(person, form.login, form.useDifferentLogin),
      password: form.password,
      password_confirm: form.confirmPassword,
    };
  }

  return payload;
}

export function normalizeStaffTemplateCreateResult(raw: unknown): StaffTemplateCreateResult {
  if (!raw || typeof raw !== 'object') return {};
  const item = raw as Record<string, unknown>;
  const staffRaw = item.staff;
  const staff =
    staffRaw && typeof staffRaw === 'object' ? (staffRaw as Record<string, unknown>) : null;

  const userId =
    typeof staff?.user_id === 'number'
      ? staff.user_id
      : typeof item.user_id === 'number'
        ? item.user_id
        : null;
  const teacherId =
    typeof staff?.teacher_id === 'number'
      ? staff.teacher_id
      : typeof item.teacher_id === 'number'
        ? item.teacher_id
        : null;

  return {
    id: typeof item.id === 'number' ? item.id : undefined,
    user_id: userId,
    teacher_id: teacherId,
    name:
      typeof staff?.name === 'string'
        ? staff.name
        : typeof item.name === 'string'
          ? item.name
          : undefined,
    template_code: typeof item.template_code === 'string' ? item.template_code : undefined,
    main_position: typeof item.main_position === 'string' ? item.main_position : null,
    login: typeof item.login === 'string' ? item.login : null,
    message: typeof item.message === 'string' ? item.message : undefined,
    staff: staff
      ? {
          user_id: userId,
          teacher_id: teacherId,
          name: typeof staff.name === 'string' ? staff.name : undefined,
        }
      : undefined,
  };
}

export interface StaffTemplatePersonFieldErrors {
  name?: string;
  login?: string;
}

export function validateStaffTemplatePersonForm(
  person: StaffTemplatePersonInput,
  t: (key: string) => string,
): { valid: boolean; errors: StaffTemplatePersonFieldErrors } {
  const errors: StaffTemplatePersonFieldErrors = {};
  if (!person.name.trim()) {
    errors.name = t('admin.staffCenter.smartCreate.errors.nameRequired');
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function templateRequiresAssignments(template: StaffCreationTemplate | null): boolean {
  return (template?.required_assignments?.length ?? 0) > 0;
}

export function assignmentsOptionsAvailable(input: {
  required: string[];
  subjects: unknown[];
  classes: unknown[];
  academicYears: unknown[];
}): boolean {
  const needsSubject = input.required.includes('subject_id');
  const needsClasses = input.required.includes('class_ids');
  const needsYear = input.required.includes('academic_year_id');
  if (needsSubject && input.subjects.length === 0) return false;
  if (needsClasses && input.classes.length === 0) return false;
  if (needsYear && input.academicYears.length === 0) return false;
  return true;
}

export function validateStaffTemplateAssignments(
  template: StaffCreationTemplate | null,
  assignments: StaffTemplateAssignments,
  t: (key: string) => string,
): { valid: boolean; error?: string } {
  if (!template) return { valid: false };
  const required = template.required_assignments ?? [];
  if (required.includes('subject_id') && assignments.subject_id == null) {
    return { valid: false, error: t('admin.staffCenter.smartCreate.errors.subjectRequired') };
  }
  if (required.includes('class_ids') && !(assignments.class_ids?.length ?? 0)) {
    return { valid: false, error: t('admin.staffCenter.smartCreate.errors.classesRequired') };
  }
  if (required.includes('academic_year_id') && assignments.academic_year_id == null) {
    return { valid: false, error: t('admin.staffCenter.smartCreate.errors.academicYearRequired') };
  }
  return { valid: true };
}

export function canSubmitStaffTemplateCreate(input: {
  template: StaffCreationTemplate | null;
  preview: StaffTemplatePreview | null;
  form: StaffSmartCreateFormState;
  passwordPolicy: StaffPasswordPolicy;
  t: (key: string, params?: Record<string, string | number>) => string;
}): boolean {
  const { template, preview, form, passwordPolicy, t } = input;
  if (!template || !templateAllowsCreate(template)) return false;
  if (!preview?.allowed_to_create) return false;

  const personValidation = validateStaffTemplatePersonForm(form.person, t);
  if (!personValidation.valid) return false;

  const assignmentsValidation = validateStaffTemplateAssignments(template, form.assignments, t);
  if (!assignmentsValidation.valid) return false;

  const requiresAccount = template.requires_user_account;
  if (requiresAccount || form.createAccount) {
    if (!form.createAccount && requiresAccount) return false;
    const login = resolveStaffTemplateAccountLogin(form.person, form.login, form.useDifferentLogin);
    if (!login) return false;
    if (form.assignPasswordNow) {
      const passwordValidation = validateStaffPasswordForm(
        {
          password: form.password,
          confirmPassword: form.confirmPassword,
          requirePassword: true,
        },
        passwordPolicy,
        t,
      );
      if (!passwordValidation.valid) return false;
    }
  }

  return true;
}

export function formatPreviewWarning(warning: string | { code?: string; message?: string }): string {
  if (typeof warning === 'string') return warning;
  return warning.message?.trim() || warning.code?.trim() || '';
}

const REQUIRED_FIELD_I18N_KEYS: Record<string, string> = {
  subject_id: 'admin.staffCenter.smartCreate.subject',
  class_ids: 'admin.staffCenter.smartCreate.classes',
  academic_year_id: 'admin.staffCenter.smartCreate.academicYear',
  'person.name': 'admin.fullName',
  'person.email': 'admin.email',
  'person.phone': 'admin.phone',
};

export function formatStaffTemplateDisplayToken(token: string): string {
  return token
    .replace(/^(blocked|info):/i, '')
    .replace(/_/g, ' ')
    .replace(/\./g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatStaffTemplateRequiredField(
  field: string,
  t: (key: string) => string,
): string {
  const key = REQUIRED_FIELD_I18N_KEYS[field];
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  return formatStaffTemplateDisplayToken(field);
}

export function formatStaffTemplatePreviewWarning(
  warning: string | { code?: string; message?: string },
  t: (key: string) => string,
): string {
  const raw = formatPreviewWarning(warning);
  const lower = raw.toLowerCase();
  if (lower.startsWith('blocked:') || lower.includes('requires assignments')) {
    return t('admin.staffCenter.smartCreate.warnings.blockedCreation');
  }
  if (lower.startsWith('info:') && lower.includes('teacher_profile')) {
    return t('admin.staffCenter.smartCreate.warnings.teacherProfileWillBeCreated');
  }
  return formatStaffTemplateDisplayToken(raw);
}

export function isUserFacingStaffTemplateError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  return !/(odoo|\/api\/|endpoint|template_code|active_school_id|capability_codes|bff|res\.users|res\.partner)/i.test(
    message,
  );
}

export const STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT = 5;
export const STAFF_TEMPLATE_CAPABILITY_DISPLAY_LIMIT = 8;

const STAFF_TEMPLATE_BUNDLE_I18N_PREFIX = 'admin.staffCenter.smartCreate.bundles.';

export function resolveStaffTemplateBundleLabel(
  code: string,
  t: (key: string) => string,
): string {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return '';
  const key = `${STAFF_TEMPLATE_BUNDLE_I18N_PREFIX}${normalized}`;
  const label = t(key);
  if (label !== key) return label;
  return formatStaffTemplateDisplayToken(code);
}

export function splitStaffTemplateDisplayList<T>(
  items: T[],
  limit: number,
): { visible: T[]; overflowCount: number } {
  if (items.length <= limit) {
    return { visible: items, overflowCount: 0 };
  }
  return { visible: items.slice(0, limit), overflowCount: items.length - limit };
}

const STAFF_TEMPLATE_CAPABILITY_I18N_PREFIX = 'admin.staffCenter.smartCreate.capabilities.';

export function resolveStaffTemplateCapabilityLabel(
  item: StaffTemplateCapabilityItem,
  locale: Locale,
  t: (key: string) => string,
): string {
  if (item.label?.trim()) return item.label.trim();
  const normalized = item.code.trim().toLowerCase();
  const key = `${STAFF_TEMPLATE_CAPABILITY_I18N_PREFIX}${normalized.replace(/\./g, '_')}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return resolveCapabilityLabel(locale, { code: item.code, label: '' });
}

export function payloadContainsForbiddenClientFields(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return 'capability_codes' in (payload as Record<string, unknown>);
}
