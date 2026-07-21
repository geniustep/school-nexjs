import type { ApiErrorBody } from '@/types/api';
import { SUBJECT_ENABLEMENT_ERROR_CODES } from '@/types/subject-enablement';
import type { SubjectEnablementConsumerSummary } from '@/types/subject-enablement';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export type MappedEnablementError = {
  message: string;
  code: string;
  isSafetyBlock: boolean;
  isVersionConflict: boolean;
  isAuth: boolean;
  isForbidden: boolean;
  isNotFound: boolean;
  isServer: boolean;
  consumerSummary: SubjectEnablementConsumerSummary | null;
  operationalSubjectId: number | null;
};

function readDetails(error: ApiErrorBody): Record<string, unknown> {
  return error.details && typeof error.details === 'object'
    ? (error.details as Record<string, unknown>)
    : {};
}

function pickConsumerSummary(
  details: Record<string, unknown>,
): SubjectEnablementConsumerSummary | null {
  const raw = details.consumer_summary;
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  return {
    can_disable: c.can_disable === true,
    disable_block_code:
      typeof c.disable_block_code === 'string' ? c.disable_block_code : null,
    active_consumer_counts:
      (c.active_consumer_counts as SubjectEnablementConsumerSummary['active_consumer_counts']) ??
      {},
    historical_consumer_counts:
      (c.historical_consumer_counts as SubjectEnablementConsumerSummary['historical_consumer_counts']) ??
      {},
  };
}

function formatConsumerCounts(
  counts: SubjectEnablementConsumerSummary['active_consumer_counts'],
  t: Translate,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(counts ?? {})) {
    if (typeof value === 'number' && value > 0) {
      parts.push(t('admin.subjectEnablement.consumerCountLine', { key, count: value }));
    }
  }
  return parts.join(' · ');
}

export function mapEnablementApiError(error: ApiErrorBody, t: Translate): MappedEnablementError {
  const code = String(error.code || '');
  const details = readDetails(error);
  const status = typeof details.status === 'number' ? details.status : null;
  const consumerSummary = pickConsumerSummary(details);
  const operationalSubjectId =
    typeof details.operational_subject_id === 'number'
      ? details.operational_subject_id
      : null;

  const isSafetyBlock =
    code === SUBJECT_ENABLEMENT_ERROR_CODES.hasActiveConsumers ||
    consumerSummary?.disable_block_code ===
      SUBJECT_ENABLEMENT_ERROR_CODES.hasActiveConsumers;

  const isVersionConflict =
    code === SUBJECT_ENABLEMENT_ERROR_CODES.versionConflict ||
    code === SUBJECT_ENABLEMENT_ERROR_CODES.duplicateConflict;

  const isAuth =
    code === SUBJECT_ENABLEMENT_ERROR_CODES.unauthorized ||
    code === 'unauthenticated' ||
    status === 401;

  const isForbidden =
    code === SUBJECT_ENABLEMENT_ERROR_CODES.forbidden ||
    code === SUBJECT_ENABLEMENT_ERROR_CODES.schoolOutOfScope ||
    code === SUBJECT_ENABLEMENT_ERROR_CODES.levelOutOfScope ||
    code === 'permission_denied' ||
    status === 403;

  const isNotFound = code === SUBJECT_ENABLEMENT_ERROR_CODES.notFound || status === 404;

  const isServer = status != null && status >= 500;

  let message: string;
  if (isSafetyBlock) {
    const countsLine = consumerSummary
      ? formatConsumerCounts(consumerSummary.active_consumer_counts, t)
      : '';
    message = countsLine
      ? t('admin.subjectEnablement.errorHasConsumersWithDetails', { details: countsLine })
      : t('admin.subjectEnablement.errorHasConsumers');
  } else if (isVersionConflict) {
    message = t('admin.subjectEnablement.errorVersionConflict');
  } else if (isAuth) {
    message = t('errors.sessionExpired');
  } else if (isForbidden) {
    message = t('admin.subjectEnablement.errorForbidden');
  } else if (isNotFound) {
    message = t('admin.subjectEnablement.errorNotFound');
  } else if (
    code === SUBJECT_ENABLEMENT_ERROR_CODES.invalidPayload ||
    code === SUBJECT_ENABLEMENT_ERROR_CODES.validationError ||
    code === SUBJECT_ENABLEMENT_ERROR_CODES.overlap ||
    code === SUBJECT_ENABLEMENT_ERROR_CODES.invalidJson ||
    status === 400 ||
    status === 422
  ) {
    message = t('admin.subjectEnablement.errorInvalidRequest');
  } else if (isServer) {
    message = t('admin.subjectEnablement.errorServerKeepDraft');
  } else {
    message = t('admin.subjectEnablement.errorGeneric');
  }

  return {
    message,
    code,
    isSafetyBlock,
    isVersionConflict,
    isAuth,
    isForbidden,
    isNotFound,
    isServer,
    consumerSummary,
    operationalSubjectId,
  };
}
