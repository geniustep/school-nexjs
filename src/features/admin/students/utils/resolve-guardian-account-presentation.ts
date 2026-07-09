import type { GuardianAccountInfo, GuardianSummary } from '@/types/student-360';
import type { UserAccountInfo } from '@/types/account';

export type GuardianAccountPresentationStatus = 'active' | 'inactive' | 'no_account' | 'unknown';

export type GuardianAccessProvisioningOutcome = 'created' | 'exists' | null;

export interface GuardianAccountPresentation {
  code: string | null;
  login: string | null;
  status: GuardianAccountPresentationStatus;
  statusLabelKey: string;
  hasVisibleAccountInfo: boolean;
  /** Post-create provisioning metadata from atomic student create response */
  accessProvisioning?: GuardianAccessProvisioningOutcome;
  accessProvisioningLabelKey?: string | null;
}

export type GuardianAccountPresentationSource =
  | Pick<GuardianSummary, 'code' | 'account' | 'has_user_account'>
  | null
  | undefined;

const STATUS_LABEL_KEYS: Record<GuardianAccountPresentationStatus, string> = {
  active: 'admin.guardianAccount.status.active',
  inactive: 'admin.guardianAccount.status.inactive',
  no_account: 'admin.guardianAccount.status.noAccount',
  unknown: 'admin.guardianAccount.status.unknown',
};

function trim(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readGuardianAccount(
  source: GuardianAccountPresentationSource,
): GuardianAccountInfo | UserAccountInfo | null {
  if (!source?.account || typeof source.account !== 'object') return null;
  return source.account;
}

function readAccountStatus(
  account: GuardianAccountInfo | UserAccountInfo | null,
  source: GuardianAccountPresentationSource,
): string | null {
  const fromAccount = trim(account?.status ?? null);
  if (fromAccount) return fromAccount;
  if (source?.has_user_account === false) return 'no_account';
  return null;
}

export function normalizeGuardianAccountPresentationStatus(
  rawStatus: string | null | undefined,
  options?: { hasUserAccount?: boolean | null },
): GuardianAccountPresentationStatus {
  const normalized = trim(rawStatus)?.toLowerCase() ?? null;
  if (normalized === 'active') return 'active';
  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'no_account' || normalized === 'not_created') return 'no_account';
  if (options?.hasUserAccount === false) return 'no_account';
  if (options?.hasUserAccount === true && !normalized) return 'active';
  return 'unknown';
}

const ACCESS_PROVISIONING_LABEL_KEYS: Record<Exclude<GuardianAccessProvisioningOutcome, null>, string> = {
  created: 'admin.guardianAccount.accessCreated',
  exists: 'admin.guardianAccount.accessExists',
};

function readAccessProvisioningOutcome(
  rel: Record<string, unknown>,
  guardian: Record<string, unknown> | null,
): GuardianAccessProvisioningOutcome {
  const created =
    rel.access_account_created === true || guardian?.access_account_created === true;
  const exists =
    rel.access_account_exists === true || guardian?.access_account_exists === true;
  if (created) return 'created';
  if (exists) return 'exists';
  return null;
}

export function resolveGuardianAccountPresentation(
  source: GuardianAccountPresentationSource,
  options?: { accessProvisioning?: GuardianAccessProvisioningOutcome },
): GuardianAccountPresentation {
  const code = trim(source?.code ?? null);
  const account = readGuardianAccount(source);
  const login = trim(account?.login ?? null);
  const hasUserAccount =
    account && 'has_user_account' in account && typeof account.has_user_account === 'boolean'
      ? account.has_user_account
      : source?.has_user_account;
  const status = normalizeGuardianAccountPresentationStatus(readAccountStatus(account, source), {
    hasUserAccount,
  });

  const hasVisibleAccountInfo = Boolean(
    code || login || status !== 'unknown' || options?.accessProvisioning,
  );
  const accessProvisioning = options?.accessProvisioning ?? null;

  return {
    code,
    login,
    status,
    statusLabelKey: STATUS_LABEL_KEYS[status],
    hasVisibleAccountInfo,
    accessProvisioning,
    accessProvisioningLabelKey: accessProvisioning
      ? ACCESS_PROVISIONING_LABEL_KEYS[accessProvisioning]
      : null,
  };
}

export function extractGuardianAccountPresentationsFromCreateResponse(
  data: unknown,
): Array<{ name: string; presentation: GuardianAccountPresentation }> {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const relationships = Array.isArray(record.guardian_relationships)
    ? record.guardian_relationships
    : [];
  return relationships
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rel = item as Record<string, unknown>;
      const guardian = rel.guardian;
      if (!guardian || typeof guardian !== 'object') return null;
      const g = guardian as Record<string, unknown>;
      const accessProvisioning = readAccessProvisioningOutcome(rel, g);
      const name =
        trim(typeof g.name === 'string' ? g.name : null) ??
        trim(typeof g.display_name === 'string' ? g.display_name : null) ??
        trim(typeof g.full_name === 'string' ? g.full_name : null) ??
        '—';
      return {
        name,
        presentation: resolveGuardianAccountPresentation(
          {
            code: trim(typeof g.code === 'string' ? g.code : null),
            has_user_account:
              typeof g.has_user_account === 'boolean' ? g.has_user_account : undefined,
            account:
              g.account && typeof g.account === 'object'
                ? (g.account as GuardianAccountInfo)
                : null,
          },
          { accessProvisioning },
        ),
      };
    })
    .filter(
      (
        entry,
      ): entry is { name: string; presentation: GuardianAccountPresentation } =>
        entry != null && entry.presentation.hasVisibleAccountInfo,
    );
}

export const STUDENT_CREATE_GUARDIAN_ONBOARDING_STORAGE_KEY = 'student-create-guardian-onboarding';

export function persistStudentCreateGuardianOnboarding(
  studentId: number,
  guardians: Array<{ name: string; presentation: GuardianAccountPresentation }>,
): void {
  if (typeof window === 'undefined' || guardians.length === 0) return;
  try {
    sessionStorage.setItem(
      STUDENT_CREATE_GUARDIAN_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ studentId, guardians }),
    );
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function readStudentCreateGuardianOnboarding(
  studentId: number,
): Array<{ name: string; presentation: GuardianAccountPresentation }> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STUDENT_CREATE_GUARDIAN_ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      studentId?: number;
      guardians?: Array<{ name: string; presentation: GuardianAccountPresentation }>;
    };
    if (parsed.studentId !== studentId || !Array.isArray(parsed.guardians)) return null;
    return parsed.guardians.filter((entry) => entry.presentation?.hasVisibleAccountInfo);
  } catch {
    return null;
  }
}

export function clearStudentCreateGuardianOnboarding(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STUDENT_CREATE_GUARDIAN_ONBOARDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
