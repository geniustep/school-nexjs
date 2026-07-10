import type { TranslateFn } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';
import type { GuardianDuplicateMatch } from '@/types/student-360';
import { normalizeGuardianSummary } from '@/features/admin/students/utils/normalize-guardian';
import { normalizePersonSearchResult } from '@/features/admin/students/utils/normalize-person-search';
import { resolveMaskedIdentityDocument } from './identity-document';

export interface ParentApiErrorContext {
  message: string;
  identityConflict?: boolean;
  candidates?: GuardianDuplicateMatch[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeCandidate(raw: unknown): GuardianDuplicateMatch | null {
  const asPerson = normalizePersonSearchResult(raw);
  if (asPerson) return asPerson;
  const asGuardian = normalizeGuardianSummary(raw);
  if (asGuardian) return asGuardian;
  return null;
}

export function extractIdentityConflictCandidates(
  details: Record<string, unknown> | undefined,
): GuardianDuplicateMatch[] {
  if (!details) return [];
  const buckets = [details.candidate, details.candidates, details.matches, details.guardian];
  const out: GuardianDuplicateMatch[] = [];
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) {
      for (const item of bucket) {
        const normalized = normalizeCandidate(item);
        if (normalized) out.push(normalized);
      }
    } else {
      const normalized = normalizeCandidate(bucket);
      if (normalized) out.push(normalized);
    }
  }
  return out;
}

/** Safe candidate presentation — masked identity only, never full document number. */
export function identityConflictCandidateLabel(candidate: GuardianDuplicateMatch): {
  name: string;
  maskedIdentity: string | null;
  href: string;
} {
  return {
    name: candidate.name,
    maskedIdentity: resolveMaskedIdentityDocument(candidate),
    href: `/admin/parents/${candidate.id}`,
  };
}

export function mapParentApiError(error: ApiErrorBody, t: TranslateFn): ParentApiErrorContext {
  const code = String(error.code ?? '');
  const message = error.message?.trim() ?? '';
  const details = asRecord(error.details) ?? undefined;

  if (
    message.includes('student_ids') ||
    message.includes('Direct student_ids') ||
    message.includes('guardian relationship endpoints')
  ) {
    return { message: t('admin.parentProfile.saveRelationshipsManagedSeparately') };
  }

  if (code === 'guardian_identity_candidate_exists') {
    return {
      message: t('admin.identityDocument.duplicateExists'),
      identityConflict: true,
      candidates: extractIdentityConflictCandidates(details),
    };
  }

  switch (code) {
    case 'validation_error': {
      if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
        if (
          message.includes('student_ids') ||
          message.includes('Direct student_ids') ||
          message.includes('guardian relationship')
        ) {
          return { message: t('admin.parentProfile.saveRelationshipsManagedSeparately') };
        }
        return { message };
      }
      return { message: t('admin.parentProfile.saveFailed') };
    }
    case 'permission_denied':
    case 'forbidden':
      return { message: t('errors.forbidden') };
    case 'not_found':
      return { message: t('errors.notFound') };
    default: {
      if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
        if (
          message.includes('student_ids') ||
          message.includes('Direct student_ids') ||
          message.includes('guardian relationship')
        ) {
          return { message: t('admin.parentProfile.saveRelationshipsManagedSeparately') };
        }
        return { message };
      }
      return { message: t('admin.parentProfile.saveFailed') };
    }
  }
}
