import type { TranslateFn } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';
import { pluralForm } from '@/lib/i18n/count-plural';
import type { StaffAdminKind, StaffMember, StaffStatusFilter } from '@/types/academic-setup';

/** English technical labels returned by legacy backends — display-only mapping. */
const TECHNICAL_JOB_TITLE_KEYS: Record<string, string> = {
  administrator: 'admin.academicSetup.technicalRole.administrator',
  admin: 'admin.academicSetup.technicalRole.administrator',
  'project manager': 'admin.academicSetup.technicalRole.project_manager',
  'school manager': 'admin.academicSetup.technicalRole.school_manager',
  'pedagogical director': 'admin.academicSetup.technicalRole.pedagogical_director',
  'general supervisor': 'admin.academicSetup.technicalRole.general_supervisor',
  'admin staff': 'admin.academicSetup.technicalRole.admin_staff',
  'administrator staff': 'admin.academicSetup.technicalRole.admin_staff',
};

const ADMIN_KIND_FOR_TECHNICAL: Partial<Record<string, StaffAdminKind>> = {
  administrator: 'school_manager',
  admin: 'school_manager',
  'project manager': 'project_manager',
  'school manager': 'school_manager',
  'pedagogical director': 'pedagogical_director',
  'general supervisor': 'general_supervisor',
  'admin staff': 'admin_staff',
};

function normalizeLabelKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function resolveStaffAdminKindLabel(
  adminKind: string | null | undefined,
  t: TranslateFn,
): string {
  if (adminKind == null || !String(adminKind).trim()) {
    return t('common.dash');
  }
  const kindNormalized = adminKind.trim().toLowerCase();
  if (kindNormalized === 'unknown') {
    return t('admin.staffCenter.userType.unknown');
  }
  if (kindNormalized === 'registration_officer') {
    return t('admin.staffCenter.userType.teacher');
  }

  const kindKey = `admin.academicSetup.adminKind.${adminKind}`;
  const direct = t(kindKey);
  if (direct !== kindKey) return direct;

  // Reuse roles.adminKind for kinds like legacy_admin not present under academicSetup.
  const rolesKindKey = `roles.adminKind.${adminKind}`;
  const rolesDirect = t(rolesKindKey);
  if (rolesDirect !== rolesKindKey) return rolesDirect;

  const normalized = normalizeLabelKey(adminKind);
  const technicalKey = TECHNICAL_JOB_TITLE_KEYS[normalized];
  if (technicalKey) {
    const technical = t(technicalKey);
    if (technical !== technicalKey) return technical;
  }
  return adminKind;
}

export function isJobTitleEquivalentToAdminKind(jobTitle: string, adminKind: string): boolean {
  const mapped = ADMIN_KIND_FOR_TECHNICAL[normalizeLabelKey(jobTitle)];
  return mapped != null && mapped === adminKind;
}

export function translateTechnicalJobTitle(jobTitle: string, t: TranslateFn): string | null {
  const key = TECHNICAL_JOB_TITLE_KEYS[normalizeLabelKey(jobTitle)];
  if (!key) return null;
  const translated = t(key);
  return translated !== key ? translated : null;
}

export function isDuplicateAdminKindLabel(jobTitle: string, adminKind: string, t: TranslateFn): boolean {
  const normalized = normalizeLabelKey(jobTitle);
  const kindLabel = normalizeLabelKey(resolveStaffAdminKindLabel(adminKind, t));
  return normalized === kindLabel || normalized === normalizeLabelKey(adminKind);
}

/** Primary role line: admin kind · job title (when distinct and not a raw English technical label). */
export function formatStaffRoleLine(member: StaffMember, t: TranslateFn): string {
  if (!member.admin_kind) {
    const rawTitle = member.job_title?.trim();
    if (!rawTitle) return t('common.dash');
    return translateTechnicalJobTitle(rawTitle, t) ?? rawTitle;
  }

  const primary = resolveStaffAdminKindLabel(member.admin_kind, t);
  const rawTitle = member.job_title?.trim();
  if (!rawTitle) return primary;

  const translatedTitle = translateTechnicalJobTitle(rawTitle, t);
  if (translatedTitle) {
    if (
      translatedTitle === primary ||
      isDuplicateAdminKindLabel(rawTitle, member.admin_kind, t) ||
      isJobTitleEquivalentToAdminKind(rawTitle, member.admin_kind)
    ) {
      return primary;
    }
    return `${primary} · ${translatedTitle}`;
  }

  if (isDuplicateAdminKindLabel(rawTitle, member.admin_kind, t)) return primary;
  if (normalizeLabelKey(rawTitle) === normalizeLabelKey(primary)) return primary;

  return `${primary} · ${rawTitle}`;
}

export function formatStaffFilterStats(
  t: TranslateFn,
  locale: Locale,
  status: StaffStatusFilter,
  count: number,
): string {
  const form = count === 0 ? 'zero' : pluralForm(count, locale);
  const key = `admin.academicSetup.staffCount.${status}.${form}`;
  if (form === 'one' || form === 'two' || form === 'zero') {
    return t(key);
  }
  return t(key, { count });
}

export function formatStaffLoginLine(login: string): string {
  return login.trim();
}
