import type {
  StaffCreationTemplate,
  StaffSmartCreateFormState,
  StaffTemplateAssignments,
  StaffTemplateBundleMeta,
  StaffTemplateBundleSelection,
  StaffTemplateCapabilityItem,
  StaffTemplateCreatePayload,
  StaffTemplateCreateResult,
  StaffTemplateMainPosition,
  StaffTemplatePersonInput,
  StaffTemplatePreview,
  StaffTemplatePreviewPayload,
  StaffTemplateScope,
  StaffAssignmentPickerState,
} from '@/types/staff-templates';
import type { StaffPasswordPolicy } from '@/types/academic-setup';
import type { Locale } from '@/lib/i18n/config';
import {
  looksLikeEnglishLabel,
  resolveCapabilityLabel,
} from '@/features/admin/academic-setup/utils/capability-present';
import {
  meetsStaffPasswordPolicy,
  validateStaffPasswordForm,
} from '@/features/admin/academic-setup/utils/staff-password-utils';
import type { ApiErrorBody } from '@/types/api';
import { mapAcademicSetupApiError } from '@/features/admin/academic-setup/utils/api-errors';
import { isUnsafeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';

export function mapStaffTemplateCreateError(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = String(error.code ?? '');
  if (code === 'password_required') {
    return t('admin.staffCenter.smartCreate.errors.passwordRequiredBeforeCreate');
  }
  if (code === 'password_mismatch') {
    return t('admin.academicSetup.staffPassword.errors.passwordMismatch');
  }
  return mapAcademicSetupApiError(error, t, 'staff');
}


function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

function normalizeBundleCodeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const codes: string[] = [];
  for (const entry of raw) {
    const code = resolveStaffTemplateBundleCode(entry);
    if (code) codes.push(code);
  }
  return uniqueStrings(codes);
}

function resolveStaffTemplateBundleCode(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (!raw || typeof raw !== 'object') return null;
  const code = (raw as { code?: unknown }).code;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

function extractStaffTemplateBundleMeta(raw: unknown): StaffTemplateBundleMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const display_name =
    typeof item.display_name === 'string' && item.display_name.trim()
      ? item.display_name.trim()
      : typeof item.name === 'string' && item.name.trim()
        ? item.name.trim()
        : undefined;
  const display_name_ar =
    typeof item.display_name_ar === 'string' && item.display_name_ar.trim()
      ? item.display_name_ar.trim()
      : undefined;
  if (!display_name && !display_name_ar) return null;
  return { display_name, display_name_ar };
}

function mergeStaffTemplateBundleMetadata(
  target: Record<string, StaffTemplateBundleMeta>,
  raw: unknown,
): void {
  const code = resolveStaffTemplateBundleCode(raw);
  if (!code) return;
  const meta = extractStaffTemplateBundleMeta(raw);
  if (!meta) return;
  const key = code.toLowerCase();
  target[key] = { ...target[key], ...meta };
}

function collectStaffTemplateBundleMetadata(
  ...sources: unknown[]
): Record<string, StaffTemplateBundleMeta> {
  const metadata: Record<string, StaffTemplateBundleMeta> = {};
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      mergeStaffTemplateBundleMetadata(metadata, entry);
    }
  }
  return metadata;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function normalizeStaffTemplateBundleSelection(raw: unknown): StaffTemplateBundleSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const selection: StaffTemplateBundleSelection = {
    policy: typeof item.policy === 'string' ? item.policy.trim() : undefined,
    default_bundle_codes: normalizeBundleCodeList(item.default_bundle_codes),
    required_bundle_codes: normalizeBundleCodeList(item.required_bundle_codes),
    optional_bundle_codes: normalizeBundleCodeList(item.optional_bundle_codes),
    removable_bundle_codes: normalizeBundleCodeList(item.removable_bundle_codes),
    available_bundle_codes: normalizeBundleCodeList(item.available_bundle_codes),
    forbidden_bundle_codes: normalizeBundleCodeList(item.forbidden_bundle_codes),
  };

  const hasValues = Object.values(selection).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  return hasValues ? selection : null;
}

export function unionStaffTemplateBundleSelection(
  base: StaffTemplateBundleSelection | null | undefined,
  overlay: StaffTemplateBundleSelection | null | undefined,
): StaffTemplateBundleSelection | null {
  if (!base && !overlay) return null;

  const merged: StaffTemplateBundleSelection = {
    policy: overlay?.policy ?? base?.policy,
    default_bundle_codes: overlay?.default_bundle_codes?.length
      ? overlay.default_bundle_codes
      : base?.default_bundle_codes,
    required_bundle_codes: uniqueStrings([
      ...(base?.required_bundle_codes ?? []),
      ...(overlay?.required_bundle_codes ?? []),
    ]),
    optional_bundle_codes: uniqueStrings([
      ...(base?.optional_bundle_codes ?? []),
      ...(overlay?.optional_bundle_codes ?? []),
    ]),
    available_bundle_codes: uniqueStrings([
      ...(base?.available_bundle_codes ?? []),
      ...(overlay?.available_bundle_codes ?? []),
    ]),
    removable_bundle_codes: uniqueStrings([
      ...(base?.removable_bundle_codes ?? []),
      ...(overlay?.removable_bundle_codes ?? []),
      ...(base?.optional_bundle_codes ?? []),
      ...(base?.available_bundle_codes ?? []),
      ...(overlay?.optional_bundle_codes ?? []),
      ...(overlay?.available_bundle_codes ?? []),
    ]),
    forbidden_bundle_codes: uniqueStrings([
      ...(base?.forbidden_bundle_codes ?? []),
      ...(overlay?.forbidden_bundle_codes ?? []),
    ]),
  };

  const hasValues = Object.values(merged).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  return hasValues ? merged : null;
}

export function resolveStaffTemplateForBundleEditor(
  template: StaffCreationTemplate | null | undefined,
  preview: StaffTemplatePreview | null | undefined,
): StaffCreationTemplate | null {
  if (!template) return null;
  const previewSelection = preview?.bundle_selection;
  if (!previewSelection) return template;

  const bundle_selection = unionStaffTemplateBundleSelection(
    template.bundle_selection,
    previewSelection,
  );
  if (!bundle_selection) return template;

  return { ...template, bundle_selection };
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
      normalizeBundleCodeList(templateRaw.optional_bundle_codes).length > 0
        ? normalizeBundleCodeList(templateRaw.optional_bundle_codes)
        : bundleSelection?.optional_bundle_codes,
    removable_bundle_codes:
      normalizeBundleCodeList(templateRaw.removable_bundle_codes).length > 0
        ? normalizeBundleCodeList(templateRaw.removable_bundle_codes)
        : bundleSelection?.removable_bundle_codes,
    available_bundle_codes:
      normalizeBundleCodeList(templateRaw.available_bundle_codes).length > 0
        ? normalizeBundleCodeList(templateRaw.available_bundle_codes)
        : bundleSelection?.available_bundle_codes,
    forbidden_bundle_codes:
      normalizeBundleCodeList(templateRaw.forbidden_bundle_codes).length > 0
        ? normalizeBundleCodeList(templateRaw.forbidden_bundle_codes)
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
    ? item.responsibility_bundles
        .map((entry) => resolveStaffTemplateBundleCode(entry))
        .filter((code): code is string => Boolean(code))
    : [];

  const selected_bundle_codes = normalizeStringArray(item.selected_bundle_codes);
  const bundle_metadata = collectStaffTemplateBundleMetadata(
    item.responsibility_bundles,
    item.selected_bundle_codes,
    item.bundle_items,
  );

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

  const bundle_selection = normalizeStaffTemplateBundleSelection(
    item.bundle_policy ?? item.bundle_selection,
  );

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
    bundle_metadata: Object.keys(bundle_metadata).length ? bundle_metadata : undefined,
    selected_bundle_codes,
    scope,
    required_fields,
    warnings,
    forbidden_capabilities,
    forbidden_capability_items,
    bundle_selection: bundle_selection ?? undefined,
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
    assignments: { subject_id: null, subject_ids: [], class_ids: [], academic_year_id: null },
  };
}

export function buildStaffTemplateScope(schoolId: number | null): StaffTemplateScope {
  return schoolId != null ? { school_id: schoolId } : {};
}

export function buildStaffTemplateAssignmentsInput(
  assignments: StaffTemplateAssignments,
): StaffTemplateAssignments {
  const normalized = normalizeStaffTemplateAssignments(assignments);
  const payload: StaffTemplateAssignments = {};
  if (normalized.subject_ids?.length) {
    payload.subject_ids = [...normalized.subject_ids];
    payload.subject_id = normalized.subject_ids[0] ?? null;
  } else if (normalized.subject_id != null) {
    payload.subject_id = normalized.subject_id;
  }
  if (normalized.academic_year_id != null) payload.academic_year_id = normalized.academic_year_id;
  if (normalized.class_ids?.length) payload.class_ids = [...normalized.class_ids];
  return payload;
}

export function normalizeStaffTemplateClassIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}

export function normalizeStaffTemplateSubjectIds(value: unknown): number[] {
  return normalizeStaffTemplateClassIds(value);
}

export function addStaffTemplateSubjectId(
  currentIds: number[] | undefined,
  subjectId: number,
): number[] {
  return addStaffTemplateClassId(currentIds, subjectId);
}

export function removeStaffTemplateSubjectId(
  currentIds: number[] | undefined,
  subjectId: number,
): number[] {
  return removeStaffTemplateClassId(currentIds, subjectId);
}

export function toggleStaffTemplateSubjectId(
  currentIds: number[] | undefined,
  subjectId: number,
): number[] {
  return toggleStaffTemplateClassId(currentIds, subjectId);
}

export function resolveStaffTemplateSubjectIds(
  assignments: StaffTemplateAssignments,
): number[] {
  const normalized = normalizeStaffTemplateAssignments(assignments);
  return normalized.subject_ids ?? [];
}

export function addStaffTemplateClassId(
  currentIds: number[] | undefined,
  classId: number,
): number[] {
  const id = Number(classId);
  if (!Number.isFinite(id) || id <= 0) return normalizeStaffTemplateClassIds(currentIds);
  return normalizeStaffTemplateClassIds([...(currentIds ?? []), id]);
}

export function removeStaffTemplateClassId(
  currentIds: number[] | undefined,
  classId: number,
): number[] {
  const id = Number(classId);
  return normalizeStaffTemplateClassIds(currentIds).filter((item) => item !== id);
}

export function toggleStaffTemplateClassId(
  currentIds: number[] | undefined,
  classId: number,
): number[] {
  const normalized = normalizeStaffTemplateClassIds(currentIds);
  const id = Number(classId);
  if (!Number.isFinite(id) || id <= 0) return normalized;
  return normalized.includes(id)
    ? removeStaffTemplateClassId(normalized, id)
    : addStaffTemplateClassId(normalized, id);
}

export function normalizeStaffTemplateAssignments(
  assignments: StaffTemplateAssignments,
): StaffTemplateAssignments {
  const subjectIds = normalizeStaffTemplateSubjectIds(
    assignments.subject_ids?.length
      ? assignments.subject_ids
      : assignments.subject_id != null
        ? [assignments.subject_id]
        : [],
  );
  const yearRaw =
    assignments.academic_year_id != null ? Number(assignments.academic_year_id) : null;

  return {
    subject_ids: subjectIds,
    subject_id: subjectIds[0] ?? null,
    academic_year_id:
      yearRaw != null && Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : null,
    class_ids: normalizeStaffTemplateClassIds(assignments.class_ids),
  };
}

export function pruneStaffTemplateClassIds(
  classIds: number[] | undefined,
  availableClassIds: number[],
): number[] {
  const allowed = new Set(availableClassIds);
  return normalizeStaffTemplateClassIds(classIds).filter((id) => allowed.has(id));
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
  if (resolveRequiredBundleCodes(template).includes(code)) return false;

  if (resolveStaffTemplateOptionalBundlePool(template).includes(code)) return true;

  const removable = template.bundle_selection?.removable_bundle_codes ?? [];
  if (removable.includes(code)) return true;
  if (removable.length > 0) return false;

  return true;
}

export function resolveStaffTemplateOptionalBundlePool(
  template: StaffCreationTemplate | null | undefined,
): string[] {
  if (!template) return [];
  const selection = template.bundle_selection;
  return uniqueStrings([
    ...(selection?.available_bundle_codes ?? []),
    ...(selection?.optional_bundle_codes ?? []),
  ]);
}

export function resolveAddableStaffTemplateBundleCodes(
  template: StaffCreationTemplate | null | undefined,
  selectedBundleCodes: string[],
): string[] {
  if (!template) return [];
  const selected = new Set(selectedBundleCodes);
  const forbidden = new Set(resolveForbiddenStaffTemplateBundleCodes(template));
  const pool = resolveStaffTemplateOptionalBundlePool(template);
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
  if (requiresAccount && form.createAccount && form.assignPasswordNow) {
    const login = resolveStaffTemplateAccountLogin(person, form.login, form.useDifferentLogin);
    if (login && form.password.trim() && form.confirmPassword.trim()) {
      payload.account = {
        create: true,
        login,
        password: form.password,
        password_confirm: form.confirmPassword,
      };
    }
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
    creation_template_code:
      typeof item.creation_template_code === 'string'
        ? item.creation_template_code
        : typeof item.template_code === 'string'
          ? item.template_code
          : typeof staff?.creation_template_code === 'string'
            ? staff.creation_template_code
            : undefined,
    role_display_name:
      typeof item.role_display_name === 'string'
        ? item.role_display_name
        : typeof staff?.role_display_name === 'string'
          ? staff.role_display_name
          : undefined,
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
  const normalized = normalizeStaffTemplateAssignments(assignments);
  const required = template.required_assignments ?? [];
  if (required.includes('subject_id') && !(normalized.subject_ids ?? []).length) {
    return { valid: false, error: t('admin.staffCenter.smartCreate.errors.subjectRequired') };
  }
  if (required.includes('subject_ids') && !(normalized.subject_ids ?? []).length) {
    return { valid: false, error: t('admin.staffCenter.smartCreate.errors.subjectRequired') };
  }
  if (required.includes('class_ids') && !(normalized.class_ids ?? []).length) {
    return { valid: false, error: t('admin.staffCenter.smartCreate.errors.classesRequired') };
  }
  if (required.includes('academic_year_id') && normalized.academic_year_id == null) {
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
    if (!form.assignPasswordNow) return false;
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

  return true;
}

export function formatPreviewWarning(warning: string | { code?: string; message?: string }): string {
  if (typeof warning === 'string') return warning;
  return warning.message?.trim() || warning.code?.trim() || '';
}

const REQUIRED_FIELD_I18N_KEYS: Record<string, string> = {
  subject_id: 'admin.staffCenter.smartCreate.subjects',
  subject_ids: 'admin.staffCenter.smartCreate.subjects',
  class_ids: 'admin.staffCenter.smartCreate.classes',
  class_id: 'admin.staffCenter.smartCreate.classes',
  academic_year_id: 'admin.staffCenter.smartCreate.academicYear',
  'person.name': 'admin.fullName',
  'person.email': 'admin.email',
  'person.phone': 'admin.phone',
};

export function normalizeStaffTemplateRequiredFieldKey(field: string): string {
  const trimmed = field.trim();
  const normalized = trimmed.toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'class_id' || normalized === 'class_ids') return 'class_ids';
  if (normalized === 'subject_id' || normalized === 'subject_ids') return 'subject_ids';
  if (normalized === 'academic_year_id') return 'academic_year_id';
  return trimmed;
}

const KNOWN_ASSIGNMENT_REQUIRED_KEYS = new Set([
  'subject_id',
  'subject_ids',
  'class_ids',
  'academic_year_id',
]);

export function resolvePreviewMissingAssignmentFields(
  preview: StaffTemplatePreview | null | undefined,
  assignments: StaffTemplateAssignments,
): string[] {
  const normalized = normalizeStaffTemplateAssignments(assignments);
  const raw = preview?.required_fields ?? [];
  return raw.filter((field) => {
    const key = normalizeStaffTemplateRequiredFieldKey(field);
    if (!KNOWN_ASSIGNMENT_REQUIRED_KEYS.has(key)) return false;
    if (key === 'subject_id' || key === 'subject_ids') return !(normalized.subject_ids ?? []).length;
    if (key === 'class_ids') return !(normalized.class_ids ?? []).length;
    if (key === 'academic_year_id') return normalized.academic_year_id == null;
    return false;
  });
}

export function assignmentsSatisfyTemplateRequirements(
  template: StaffCreationTemplate | null | undefined,
  assignments: StaffTemplateAssignments,
): boolean {
  if (!template) return false;
  const normalized = normalizeStaffTemplateAssignments(assignments);
  const required = template.required_assignments ?? [];
  if (required.includes('subject_id') && !(normalized.subject_ids ?? []).length) return false;
  if (required.includes('subject_ids') && !(normalized.subject_ids ?? []).length) return false;
  if (required.includes('class_ids') && !(normalized.class_ids ?? []).length) return false;
  if (required.includes('academic_year_id') && normalized.academic_year_id == null) return false;
  return true;
}

export interface StaffAssignmentCycleOption {
  code: string;
  name: string;
}

export interface StaffAssignmentLevelOption {
  id: number;
  name: string;
  cycleCode: string | null;
}

export interface StaffAssignmentSubjectOption {
  id: number;
  name: string;
  label: string;
  levelIds: number[];
}

export interface StaffAssignmentClassOption {
  id: number;
  name: string;
  levelId: number | null;
  academicYearId: number | null;
}

export function defaultStaffAssignmentPickerState(): StaffAssignmentPickerState {
  return { cycleCode: null, levelId: null };
}

export function extractStaffAssignmentCycleOptions(
  levels: Array<{ cycle?: { code?: string; name?: string } | null }>,
): StaffAssignmentCycleOption[] {
  const seen = new Map<string, string>();
  for (const level of levels) {
    const code = level.cycle?.code?.trim();
    if (!code) continue;
    seen.set(code, level.cycle?.name?.trim() || code);
  }
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export function buildStaffAssignmentLevelOptions(
  levels: Array<{
    id: number;
    name: string;
    display_name?: string | null;
    moroccan_display_alias?: string | null;
    cycle?: { code?: string } | null;
  }>,
): StaffAssignmentLevelOption[] {
  return levels.map((level) => ({
    id: level.id,
    name: level.display_name?.trim() || level.moroccan_display_alias?.trim() || level.name,
    cycleCode: level.cycle?.code?.trim() ?? null,
  }));
}

export function filterStaffAssignmentLevels(
  levels: StaffAssignmentLevelOption[],
  cycleCode: string | null,
): StaffAssignmentLevelOption[] {
  if (!cycleCode) return levels;
  return levels.filter((level) => level.cycleCode === cycleCode);
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
}

export function formatStaffAssignmentSubjectLabel(
  subjectName: string,
  levelIds: number[],
  levelNameById: Map<number, string>,
): string {
  const trimmedName = subjectName.trim();
  const levelNames = levelIds
    .map((levelId) => levelNameById.get(levelId)?.trim())
    .filter((value): value is string => Boolean(value));
  const uniqueLevelNames = [...new Set(levelNames)];
  if (!trimmedName || !uniqueLevelNames.length) return trimmedName;
  return `${trimmedName} (${uniqueLevelNames.join('، ')})`;
}

export function buildStaffAssignmentSubjectOptions(
  subjects: Array<{ id: number; name: string; level_id?: number | null; level_ids?: number[] }>,
  levels: StaffAssignmentLevelOption[] = [],
): StaffAssignmentSubjectOption[] {
  const levelNameById = new Map(levels.map((level) => [level.id, level.name]));
  return subjects.map((subject) => {
    const levelIds = uniqueNumbers([
      ...(subject.level_ids ?? []),
      ...(subject.level_id != null ? [subject.level_id] : []),
    ]);
    const name = subject.name.trim();
    return {
      id: subject.id,
      name,
      label: formatStaffAssignmentSubjectLabel(name, levelIds, levelNameById),
      levelIds,
    };
  });
}

export function filterStaffAssignmentSubjects(
  subjects: StaffAssignmentSubjectOption[],
  levelId: number | null,
): StaffAssignmentSubjectOption[] {
  if (levelId == null) return subjects;
  return subjects.filter(
    (subject) => subject.levelIds.length === 0 || subject.levelIds.includes(levelId),
  );
}

export function buildStaffAssignmentClassOptions(
  classes: Array<{ id: number; name: string; level?: { id?: number } | null }>,
  studentClasses: Array<{ id: number; level?: { id?: number } | null; academic_year_id?: number | null }> = [],
): StaffAssignmentClassOption[] {
  const studentById = new Map(studentClasses.map((item) => [item.id, item]));
  return classes.map((schoolClass) => {
    const studentClass = studentById.get(schoolClass.id);
    const levelId = schoolClass.level?.id ?? studentClass?.level?.id ?? null;
    const academicYearId = studentClass?.academic_year_id ?? null;
    return {
      id: schoolClass.id,
      name: schoolClass.name,
      levelId,
      academicYearId,
    };
  });
}

export function filterStaffAssignmentClasses(
  classes: StaffAssignmentClassOption[],
  levelId: number | null,
  academicYearId: number | null,
): StaffAssignmentClassOption[] {
  return classes.filter((schoolClass) => {
    if (levelId != null && schoolClass.levelId != null && schoolClass.levelId !== levelId) {
      return false;
    }
    if (academicYearId != null && schoolClass.academicYearId != null) {
      return schoolClass.academicYearId === academicYearId;
    }
    return true;
  });
}

export function resolveStaffAssignmentCycleLabel(
  cycle: StaffAssignmentCycleOption,
  t: (key: string) => string,
): string {
  const key = `admin.staffCenter.smartCreate.cycles.${cycle.code}`;
  const label = t(key);
  return label !== key ? label : cycle.name;
}

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
  const key = normalizeStaffTemplateRequiredFieldKey(field);
  const i18nKey = REQUIRED_FIELD_I18N_KEYS[key];
  if (i18nKey) {
    const label = t(i18nKey);
    if (label !== i18nKey) return label;
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
  return !isUnsafeUserFacingErrorMessage(message);
}

export const STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT = 5;
export const STAFF_TEMPLATE_CAPABILITY_DISPLAY_LIMIT = 8;

const STAFF_TEMPLATE_BUNDLE_I18N_PREFIX = 'admin.staffCenter.smartCreate.bundles.';

export type StaffTemplateBundleLabelOptions = {
  locale?: Locale;
  metadata?: Record<string, StaffTemplateBundleMeta>;
};

export function resolveStaffTemplateBundleLabel(
  code: string,
  t: (key: string) => string,
  options?: StaffTemplateBundleLabelOptions,
): string {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return '';

  const meta = options?.metadata?.[normalized] ?? options?.metadata?.[code.trim()];
  if (meta) {
    if (options?.locale === 'ar' && meta.display_name_ar?.trim()) {
      return meta.display_name_ar.trim();
    }
    if (meta.display_name?.trim() && (options?.locale === 'en' || !looksLikeEnglishLabel(meta.display_name))) {
      return meta.display_name.trim();
    }
    if (meta.display_name_ar?.trim() && options?.locale !== 'en') {
      return meta.display_name_ar.trim();
    }
  }

  const key = `${STAFF_TEMPLATE_BUNDLE_I18N_PREFIX}${normalized}`;
  const label = t(key);
  if (label !== key) return label;
  return formatStaffTemplateDisplayToken(code);
}

export function staffTemplatePasswordsMismatch(form: StaffSmartCreateFormState): boolean {
  if (!form.createAccount || !form.assignPasswordNow) return false;
  return form.password !== form.confirmPassword;
}

export function resolveStaffTemplateAddBundleActionLabel(
  code: string,
  t: (key: string, params?: Record<string, string | number>) => string,
  options?: StaffTemplateBundleLabelOptions,
): string {
  return t('admin.staffCenter.smartCreate.addBundleNamedAction', {
    name: resolveStaffTemplateBundleLabel(code, t, options),
  });
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
  bundleMetadata?: Record<string, StaffTemplateBundleMeta>,
): string {
  const normalized = item.code.trim().toLowerCase();
  const key = `${STAFF_TEMPLATE_CAPABILITY_I18N_PREFIX}${normalized.replace(/\./g, '_')}`;
  const translated = t(key);
  if (translated !== key) return translated;

  const fromCatalog = resolveCapabilityLabel(locale, {
    code: item.code,
    label: item.label ?? '',
    category: item.category ?? 'other',
  });
  if (fromCatalog && fromCatalog !== item.code) {
    const tokenFallback = formatStaffTemplateDisplayToken(item.code);
    if (fromCatalog !== tokenFallback || locale === 'en') return fromCatalog;
  }

  const bundleLabel = resolveStaffTemplateBundleLabel(item.code, t, {
    locale,
    metadata: bundleMetadata,
  });
  const tokenFallback = formatStaffTemplateDisplayToken(item.code);
  if (bundleLabel !== tokenFallback) return bundleLabel;

  const apiLabel = item.label?.trim();
  if (apiLabel && locale === 'en') return apiLabel;
  if (apiLabel && !looksLikeEnglishLabel(apiLabel)) return apiLabel;

  return tokenFallback;
}

export function payloadContainsForbiddenClientFields(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return 'capability_codes' in (payload as Record<string, unknown>);
}
