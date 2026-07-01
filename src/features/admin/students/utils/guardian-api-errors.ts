import type { TranslateFn } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';
import type { GuardianDuplicateField, GuardianDuplicateMatch } from '@/types/student-360';
import { normalizeGuardianSummary } from './normalize-guardian';
import { normalizePersonSearchResult } from './normalize-person-search';

export interface GuardianErrorContext {
  message: string;
  field?: string;
  duplicateField?: GuardianDuplicateField;
  matches?: GuardianDuplicateMatch[];
}

export interface GuardianRemovalBlockerContext {
  message: string;
  code?: string;
  suggestedActions?: Array<{ label: string; href?: string }>;
}

export function isGuardianRelationshipConfirmRequiredError(error: ApiErrorBody): boolean {
  const code = String(error.code ?? '');
  if (code === 'guardian_relationship_has_financial_dependencies') return true;
  const details = error.details as Record<string, unknown> | undefined;
  const status = typeof details?.status === 'number' ? details.status : undefined;
  return status === 409 && code === 'guardian_relationship_has_financial_dependencies';
}

export function mapGuardianRemovalBlocker(
  error: ApiErrorBody,
  t: TranslateFn,
): GuardianRemovalBlockerContext | null {
  const code = String(error.code ?? '');
  const details = error.details as Record<string, unknown> | undefined;
  const agreementId =
    typeof details?.financial_agreement_id === 'number'
      ? details.financial_agreement_id
      : typeof details?.agreement_id === 'number'
        ? details.agreement_id
        : null;

  const suggestedActions: GuardianRemovalBlockerContext['suggestedActions'] = [];
  if (agreementId != null) {
    suggestedActions.push({
      label: t('admin.student360.removeGuardianOpenAgreement'),
      href: `/admin/finance/agreements/${agreementId}`,
    });
  }

  switch (code) {
    case 'guardian_relationship_has_financial_dependencies':
      return null;
    case 'guardian_removal_blocked':
    case 'financial_agreement_blocks_removal':
    case 'active_financial_agreement':
      return {
        code,
        message: t('admin.student360.removeGuardianFinancialBlocker'),
        suggestedActions: suggestedActions.length
          ? suggestedActions
          : [{ label: t('admin.student360.editRelationship') }],
      };
    case 'financial_guardian_conflict':
      return {
        code,
        message: t('admin.student360.removeGuardianFinancialBlocker'),
        suggestedActions: suggestedActions.length
          ? suggestedActions
          : [{ label: t('admin.student360.editRelationship') }],
      };
    case 'primary_guardian_conflict':
      return {
        code,
        message: t('admin.student360.removeGuardianPrimaryBlocker'),
        suggestedActions: [{ label: t('admin.student360.editRelationship') }],
      };
    default: {
      const msg = error.message?.trim();
      const lower = msg?.toLowerCase() ?? '';
      if (
        lower.includes('finance profile') ||
        lower.includes('financial agreement') ||
        lower.includes('financial responsible') ||
        lower.includes('active finance') ||
        lower.includes('billing profile')
      ) {
        return {
          code: code || 'financial_agreement_blocks_removal',
          message: t('admin.student360.removeGuardianFinancialBlocker'),
          suggestedActions: suggestedActions.length
            ? suggestedActions
            : [{ label: t('admin.student360.editRelationship') }],
        };
      }
      if (
        msg &&
        !msg.includes('<') &&
        !lower.includes('traceback') &&
        (code.includes('block') || code.includes('conflict') || msg.length > 12)
      ) {
        return { code, message: msg, suggestedActions };
      }
      return null;
    }
  }
}

export function inferDuplicateField(
  details: Record<string, unknown> | undefined,
  message?: string,
): GuardianDuplicateField {
  const explicit = details?.duplicate_field;
  if (explicit === 'phone' || explicit === 'email' || explicit === 'national_id') {
    return explicit;
  }
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('email')) return 'email';
  if (lower.includes('phone') || lower.includes('mobile')) return 'phone';
  if (lower.includes('identity') || lower.includes('national')) return 'national_id';
  return 'unknown';
}

export function extractGuardianDuplicateMatches(
  details: Record<string, unknown> | undefined,
): GuardianDuplicateMatch[] | undefined {
  if (!details) return undefined;
  const matches = details.matches;
  if (!Array.isArray(matches)) return undefined;
  return matches as GuardianDuplicateMatch[];
}

export function mapGuardianApiError(
  error: ApiErrorBody,
  t: TranslateFn,
): GuardianErrorContext {
  const code = String(error.code ?? '');
  const details = error.details as Record<string, unknown> | undefined;
  const matches = extractGuardianDuplicateMatches(details);

  switch (code) {
    case 'guardian_duplicate': {
      const duplicateField = inferDuplicateField(details, error.message);
      const messageKey =
        duplicateField === 'email'
          ? 'admin.student360.guardianDuplicateEmail'
          : duplicateField === 'phone'
            ? 'admin.student360.guardianDuplicatePhone'
            : 'admin.student360.guardianDuplicate';
      return {
        message: t(messageKey),
        duplicateField,
        matches: matches?.map((m) => normalizeDuplicateMatch(m)),
      };
    }
    case 'guardian_already_linked':
    case 'guardian_relation_already_exists':
      return { message: t('admin.student360.personAlreadyLinkedAsGuardian') };
    case 'duplicate_person': {
      const duplicateField = inferDuplicateField(details, error.message);
      const messageKey =
        duplicateField === 'email'
          ? 'admin.student360.guardianDuplicateEmail'
          : duplicateField === 'phone'
            ? 'admin.student360.duplicatePersonPhone'
            : 'admin.student360.guardianDuplicate';
      return {
        message: t(messageKey),
        duplicateField,
        matches: matches?.map((m) => normalizeDuplicateMatch(m)),
      };
    }
    case 'primary_guardian_conflict':
      return {
        message: t('admin.student360.primaryGuardianConflict'),
        field: 'is_primary_contact',
      };
    case 'financial_guardian_conflict':
      return {
        message: t('admin.student360.financialGuardianConflict'),
        field: 'is_financial_responsible',
      };
    case 'guardian_contact_phone_required':
      return {
        message: t('admin.student360.guardianContactPhoneRequiredBeforeLink'),
        field: 'phone',
      };
    case 'permission_denied':
    case 'forbidden':
      return { message: t('admin.student360.guardianForbidden') };
    case 'not_found':
      return { message: t('admin.student360.guardianNotFound') };
    case 'validation_error': {
      const msg = error.message?.trim();
      if (msg && !msg.includes('<')) return { message: msg };
      return { message: t('admin.student360.guardianValidation') };
    }
    default: {
      const msg = error.message?.trim();
      if (
        msg &&
        (msg.toLowerCase().includes('phone/mobile is required') ||
          msg.toLowerCase().includes('phone is required for guardian'))
      ) {
        return { message: t('admin.student360.guardianContactPhoneRequiredBeforeLink'), field: 'phone' };
      }
      if (msg && !msg.includes('<') && !msg.toLowerCase().includes('traceback')) {
        return { message: msg };
      }
      return { message: t('errors.serverError') };
    }
  }
}

function normalizeDuplicateMatch(match: GuardianDuplicateMatch): GuardianDuplicateMatch {
  const asPerson = normalizePersonSearchResult(match);
  if (asPerson) return asPerson;
  const normalized = normalizeGuardianSummary(match);
  if (!normalized) return match;
  return { ...match, ...normalized, name: normalized.name || match.name };
}
