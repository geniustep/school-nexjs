import type { TranslateFn } from '@/features/i18n/locale-context';
import type { GuardianDeleteBlocker, GuardianDeleteImpact } from '@/types/student-360';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return list.length ? list : undefined;
}

function normalizeBlockers(raw: unknown): GuardianDeleteBlocker[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blockers = raw
    .map((item): GuardianDeleteBlocker | null => {
      const record = asRecord(item);
      if (!record || typeof record.code !== 'string') {
        if (typeof item === 'string') return { code: item, message: item };
        return null;
      }
      return {
        code: record.code,
        message: typeof record.message === 'string' ? record.message : undefined,
      };
    })
    .filter((item): item is GuardianDeleteBlocker => item != null);
  return blockers.length ? blockers : undefined;
}

export function normalizeDeleteImpactFromRaw(data: unknown): GuardianDeleteImpact | null {
  const raw = asRecord(data);
  if (!raw) return null;

  const nested = asRecord(raw.delete_impact) ?? raw;

  return {
    active_relationships:
      typeof nested.active_relationships === 'number' ? nested.active_relationships : undefined,
    historical_relationships:
      typeof nested.historical_relationships === 'number' ? nested.historical_relationships : undefined,
    financial_dependencies:
      typeof nested.financial_dependencies === 'number' ? nested.financial_dependencies : undefined,
    other_roles: readStringList(nested.other_roles),
    role_labels: readStringList(nested.role_labels),
    has_user_account: nested.has_user_account === true,
    has_teacher_profile: nested.has_teacher_profile === true,
    has_staff_profile: nested.has_staff_profile === true,
    has_accounting_history: nested.has_accounting_history === true,
    blockers: normalizeBlockers(nested.blockers),
    will_delete: readStringList(nested.will_delete),
    will_remain: readStringList(nested.will_remain),
    summary: readStringList(nested.summary),
    blocker_code: typeof nested.blocker_code === 'string' ? nested.blocker_code : undefined,
    blocker_message: typeof nested.blocker_message === 'string' ? nested.blocker_message : undefined,
  };
}

const BLOCKER_MESSAGE_KEYS: Record<string, string> = {
  guardian_profile_has_active_relationships: 'admin.guardianProfile.blockers.activeRelationships',
  guardian_profile_has_financial_dependencies: 'admin.guardianProfile.blockers.financialDependencies',
  guardian_profile_has_historical_dependencies: 'admin.guardianProfile.blockers.historicalDependencies',
  guardian_profile_delete_not_allowed: 'admin.guardianProfile.blockers.deleteNotAllowed',
  person_has_other_roles: 'admin.guardianProfile.blockers.otherRoles',
  person_has_user_account: 'admin.guardianProfile.blockers.hasUserAccount',
  person_has_teacher_profile: 'admin.guardianProfile.blockers.hasTeacherProfile',
  person_has_staff_profile: 'admin.guardianProfile.blockers.hasStaffProfile',
  person_has_financial_history: 'admin.guardianProfile.blockers.financialHistory',
  person_delete_not_allowed: 'admin.guardianProfile.blockers.personDeleteNotAllowed',
  confirmation_required: 'admin.guardianProfile.blockers.confirmationRequired',
};

export function deleteBlockerMessage(t: TranslateFn, blocker: GuardianDeleteBlocker | string): string {
  const code = typeof blocker === 'string' ? blocker : blocker.code;
  const apiMessage = typeof blocker === 'string' ? undefined : blocker.message?.trim();
  if (apiMessage) return apiMessage;
  const key = BLOCKER_MESSAGE_KEYS[code];
  return key ? t(key) : t('admin.guardianProfile.blockers.deleteNotAllowed');
}

export function deleteImpactSummaryLines(impact: GuardianDeleteImpact | null | undefined, t: TranslateFn): string[] {
  if (!impact) return [];
  const lines: string[] = [];
  if (impact.summary?.length) return impact.summary;
  if (impact.active_relationships != null && impact.active_relationships > 0) {
    lines.push(t('admin.guardianProfile.deleteImpactActiveRelationships', { count: impact.active_relationships }));
  }
  if (impact.historical_relationships != null && impact.historical_relationships > 0) {
    lines.push(
      t('admin.guardianProfile.deleteImpactHistoricalRelationships', { count: impact.historical_relationships }),
    );
  }
  if (impact.financial_dependencies != null && impact.financial_dependencies > 0) {
    lines.push(t('admin.guardianProfile.deleteImpactFinancialDependencies', { count: impact.financial_dependencies }));
  }
  if (impact.other_roles?.length) {
    lines.push(t('admin.guardianProfile.deleteImpactOtherRoles', { roles: impact.other_roles.join(' · ') }));
  }
  if (impact.has_user_account) lines.push(t('admin.guardianProfile.blockers.hasUserAccount'));
  if (impact.has_teacher_profile) lines.push(t('admin.guardianProfile.blockers.hasTeacherProfile'));
  if (impact.has_staff_profile) lines.push(t('admin.guardianProfile.blockers.hasStaffProfile'));
  if (impact.has_accounting_history) lines.push(t('admin.guardianProfile.blockers.financialHistory'));
  if (impact.will_delete?.length) {
    lines.push(`${t('admin.guardianProfile.willDelete')}: ${impact.will_delete.join(' · ')}`);
  }
  if (impact.will_remain?.length) {
    lines.push(`${t('admin.guardianProfile.willRemain')}: ${impact.will_remain.join(' · ')}`);
  }
  if (impact.blockers?.length) {
    for (const blocker of impact.blockers) {
      lines.push(deleteBlockerMessage(t, blocker));
    }
  } else if (impact.blocker_message) {
    lines.push(impact.blocker_message);
  }
  return lines;
}
