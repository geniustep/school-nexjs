import type { StaffAdminKind, StaffOptions } from '@/types/academic-setup';
import type {
  StaffCreationTemplate,
  StaffTemplateCapabilityItem,
  StaffTemplatePreview,
} from '@/types/staff-templates';

export const PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE = 'pedagogical_director';

const FINANCE_BUNDLE_CODES = [
  'finance_agreements',
  'finance_collections',
  'finance_receipts',
  'finance_cheques',
  'cashdesk',
  'student_collection_registration_limited',
  'accounts_management',
] as const;

export type StaffCreationTemplateCatalogEntry = {
  code: string;
  admin_kind: StaffAdminKind;
  nameKey: string;
  descriptionKey: string;
  mainPositionCode: string;
  mainPositionKey: string;
  requires_user_account?: boolean;
  bundle_codes?: string[];
  bundle_selection?: StaffCreationTemplate['bundle_selection'];
};

const LOCAL_STAFF_CREATION_TEMPLATE_CATALOG: StaffCreationTemplateCatalogEntry[] = [
  {
    code: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
    admin_kind: 'pedagogical_director',
    nameKey: 'admin.staffCenter.creationTemplates.pedagogical_director',
    descriptionKey: 'admin.staffCenter.smartCreate.templates.pedagogical_director.description',
    mainPositionCode: 'senior_administration',
    mainPositionKey: 'admin.staffCenter.smartCreate.mainPositions.senior_administration',
    requires_user_account: true,
    bundle_codes: [],
    bundle_selection: {
      default_bundle_codes: [],
      required_bundle_codes: [],
      forbidden_bundle_codes: [...FINANCE_BUNDLE_CODES],
    },
  },
];

export function isAdminKindAvailableInStaffOptions(
  adminKind: StaffAdminKind,
  options?: StaffOptions | null,
): boolean {
  if (!options?.admin_kinds?.length) return false;
  return options.admin_kinds.some((kind) => kind.value === adminKind);
}

export function buildCatalogStaffCreationTemplate(
  entry: StaffCreationTemplateCatalogEntry,
  t: (key: string) => string,
): StaffCreationTemplate {
  const bundleSelection = entry.bundle_selection ?? null;
  const bundleCodes = entry.bundle_codes ?? bundleSelection?.default_bundle_codes ?? [];

  return {
    code: entry.code,
    name: t(entry.nameKey),
    client_catalog: true,
    admin_kind: entry.admin_kind,
    description: t(entry.descriptionKey),
    main_position: {
      code: entry.mainPositionCode,
      name: t(entry.mainPositionKey),
    },
    requires_user_account: entry.requires_user_account ?? true,
    bundle_codes: bundleCodes,
    bundle_selection: bundleSelection,
    default_bundle_codes: bundleSelection?.default_bundle_codes ?? bundleCodes,
  };
}

export function mergeStaffCreationTemplatesWithCatalog(
  apiTemplates: StaffCreationTemplate[],
  options: StaffOptions | null | undefined,
  t: (key: string) => string,
): StaffCreationTemplate[] {
  const merged = [...apiTemplates];
  const existingCodes = new Set(apiTemplates.map((template) => template.code));

  for (const entry of LOCAL_STAFF_CREATION_TEMPLATE_CATALOG) {
    if (existingCodes.has(entry.code)) continue;
    if (!isAdminKindAvailableInStaffOptions(entry.admin_kind, options)) continue;
    merged.push(buildCatalogStaffCreationTemplate(entry, t));
  }

  return merged;
}

export function isClientCatalogStaffTemplate(
  template: StaffCreationTemplate | null | undefined,
): boolean {
  return template?.client_catalog === true;
}

const ROLE_CAPABILITY_HIGHLIGHT_KEYS = ['highlight1', 'highlight2', 'highlight3', 'highlight4'] as const;

function isFinanceRelatedCapabilityCode(code: string): boolean {
  const normalized = code.trim().toLowerCase().replace(/_/g, '.');
  return (
    normalized.startsWith('finance') ||
    normalized.includes('cash.session') ||
    normalized.includes('cashdesk') ||
    normalized.includes('cheque') ||
    normalized.startsWith('open.cash') ||
    normalized.startsWith('close.cash') ||
    normalized.includes('cash.movement')
  );
}

function buildRoleHighlightCapabilityItems(
  adminKind: StaffAdminKind,
  t: (key: string) => string,
): StaffTemplateCapabilityItem[] {
  const prefix = `admin.academicSetup.roleCapabilities.${adminKind}`;
  const items: StaffTemplateCapabilityItem[] = [];
  for (const [index, key] of ROLE_CAPABILITY_HIGHLIGHT_KEYS.entries()) {
    const labelKey = `${prefix}.${key}`;
    const label = t(labelKey);
    if (!label || label === labelKey) continue;
    items.push({ code: `role_highlight_${index + 1}`, label });
  }
  return items;
}

export function buildClientCatalogTemplatePreview(input: {
  template: StaffCreationTemplate;
  options?: StaffOptions | null;
  selectedBundleCodes?: string[];
  t: (key: string) => string;
}): StaffTemplatePreview {
  const { template, options, selectedBundleCodes = [], t } = input;
  const adminKind = template.admin_kind;
  const capabilities = options?.capabilities ?? [];

  const forbidden_capability_items = capabilities
    .filter((item) => isFinanceRelatedCapabilityCode(item.code))
    .map((item) => ({ code: item.code, label: item.label, category: item.category }));

  const highlightItems =
    adminKind != null ? buildRoleHighlightCapabilityItems(adminKind, t) : [];

  const effective_capability_items =
    highlightItems.length > 0
      ? highlightItems
      : capabilities
          .filter((item) => !isFinanceRelatedCapabilityCode(item.code))
          .slice(0, 8)
          .map((item) => ({ code: item.code, label: item.label, category: item.category }));

  return {
    allowed_to_create: isAdminKindAvailableInStaffOptions(adminKind ?? 'admin_staff', options),
    effective_capability_items,
    forbidden_capability_items,
    selected_bundle_codes: selectedBundleCodes,
    bundle_selection: template.bundle_selection ?? undefined,
    warnings: [],
  };
}

export function resolveClientCatalogPreviewPayload(
  template: StaffCreationTemplate | null | undefined,
  options: StaffOptions | null | undefined,
  selectedBundleCodes: string[],
  t: (key: string) => string,
): StaffTemplatePreview | null {
  if (!isClientCatalogStaffTemplate(template)) return null;
  return buildClientCatalogTemplatePreview({
    template: template!,
    options,
    selectedBundleCodes,
    t,
  });
}
