import { describe, expect, it } from 'vitest';
import ar from '../../../../../messages/ar.json';
import fr from '../../../../../messages/fr.json';
import {
  agreementAmendmentErrorMessageKey,
  resolveAgreementAmendmentErrorMessage,
} from './agreement-amendment-errors';

const OVERLAP_CODE = 'agreement_service_period_overlap';
const LEGACY_CODE = 'agreement_line_service_already_exists';
const BACKEND_ENGLISH =
  'This service already has an active or overlapping period on this agreement.';
const ARABIC =
  'هذه الخدمة موجودة بالفعل ضمن فترة فعالة أو متداخلة في هذا الاتفاق.';
const FRENCH =
  'Ce service existe déjà sur une période active ou chevauchante de cet accord.';
const LEGACY_ARABIC = 'هذه الخدمة موجودة بالفعل في هذا الاتفاق.';
const LEGACY_FRENCH = 'Ce service existe déjà dans cet accord.';
const GENERIC_AR =
  'تعذر معاينة تعديل الاتفاقية. حاول مرة أخرى أو راجع الإدارة المالية.';
const OVERLAP_KEY =
  'admin.student360.financeWorkspace.agreementAmendment.errors.servicePeriodOverlap';
const LEGACY_KEY =
  'admin.student360.financeWorkspace.agreementAmendment.errors.serviceAlreadyExists';
const GENERIC_KEY = 'admin.student360.financeWorkspace.agreementAmendment.errors.generic';

const catalog = {
  ar: {
    [OVERLAP_KEY]: ARABIC,
    [LEGACY_KEY]: LEGACY_ARABIC,
    [GENERIC_KEY]: GENERIC_AR,
  },
  fr: {
    [OVERLAP_KEY]: FRENCH,
    [LEGACY_KEY]: LEGACY_FRENCH,
    [GENERIC_KEY]:
      "Impossible de prévisualiser la modification de l'accord. Réessayez ou contactez l'administration financière.",
  },
} as const;

function tFor(locale: 'ar' | 'fr') {
  return (key: string) => catalog[locale][key as keyof (typeof catalog)[typeof locale]] ?? key;
}

/** Preview and Apply both call the same resolver with res.error.code / message. */
function resolvePreviewOrApplyError(
  path: 'preview' | 'apply',
  code: string | undefined,
  message: string | undefined,
  locale: 'ar' | 'fr',
  httpStatus = 409,
) {
  void path;
  void httpStatus;
  return resolveAgreementAmendmentErrorMessage(code, message, tFor(locale), {
    code: code ?? 'unknown',
    message: message ?? '',
    details: { status: httpStatus },
  });
}

describe('agreement_service_period_overlap localization', () => {
  it('maps new code to the servicePeriodOverlap translation key', () => {
    expect(agreementAmendmentErrorMessageKey(OVERLAP_CODE)).toBe(OVERLAP_KEY);
  });

  it('1) new code + English backend message + Arabic locale → Arabic', () => {
    const message = resolvePreviewOrApplyError('preview', OVERLAP_CODE, BACKEND_ENGLISH, 'ar');
    expect(message).toBe(ARABIC);
    expect(message).not.toContain(BACKEND_ENGLISH);
  });

  it('2) new code + English backend message + French locale → French', () => {
    const message = resolvePreviewOrApplyError('preview', OVERLAP_CODE, BACKEND_ENGLISH, 'fr');
    expect(message).toBe(FRENCH);
    expect(message).not.toContain(BACKEND_ENGLISH);
  });

  it('3) new code + missing message → localized translation', () => {
    expect(resolvePreviewOrApplyError('preview', OVERLAP_CODE, undefined, 'ar')).toBe(ARABIC);
    expect(resolvePreviewOrApplyError('apply', OVERLAP_CODE, undefined, 'fr')).toBe(FRENCH);
  });

  it('4) new code + HTTP 409 is a recognized business error, not generic server error', () => {
    const message = resolvePreviewOrApplyError('preview', OVERLAP_CODE, BACKEND_ENGLISH, 'ar', 409);
    expect(message).toBe(ARABIC);
    expect(message).not.toBe(GENERIC_AR);
    expect(message).not.toMatch(/server|Unexpected|500/i);
  });

  it('5) new code wins over backend English message', () => {
    const ar = resolveAgreementAmendmentErrorMessage(OVERLAP_CODE, BACKEND_ENGLISH, tFor('ar'));
    const fr = resolveAgreementAmendmentErrorMessage(OVERLAP_CODE, BACKEND_ENGLISH, tFor('fr'));
    expect(ar).toBe(ARABIC);
    expect(fr).toBe(FRENCH);
    expect(ar).not.toBe(BACKEND_ENGLISH);
    expect(fr).not.toBe(BACKEND_ENGLISH);
  });

  it('6) unknown code + backend message keeps current fallback', () => {
    const unknown = 'totally_unknown_amendment_code';
    const message = resolveAgreementAmendmentErrorMessage(unknown, BACKEND_ENGLISH, tFor('ar'));
    expect(message).toBe(BACKEND_ENGLISH);
  });

  it('7) unknown code + no message → generic localized fallback', () => {
    const message = resolveAgreementAmendmentErrorMessage(
      'totally_unknown_amendment_code',
      undefined,
      tFor('ar'),
    );
    expect(message).toBe(GENERIC_AR);
  });

  it('8) Preview path uses mapping', () => {
    expect(resolvePreviewOrApplyError('preview', OVERLAP_CODE, BACKEND_ENGLISH, 'ar')).toBe(ARABIC);
  });

  it('9) Apply path uses the same mapping', () => {
    expect(resolvePreviewOrApplyError('apply', OVERLAP_CODE, BACKEND_ENGLISH, 'fr')).toBe(FRENCH);
  });

  it('10) Arabic/French translation keys exist with exact approved strings', () => {
    const arErrors = ar.admin.student360.financeWorkspace.agreementAmendment.errors;
    const frErrors = fr.admin.student360.financeWorkspace.agreementAmendment.errors;
    expect(arErrors.servicePeriodOverlap).toBe(ARABIC);
    expect(frErrors.servicePeriodOverlap).toBe(FRENCH);
    expect(arErrors.serviceAlreadyExists).toBe(LEGACY_ARABIC);
    expect(frErrors.serviceAlreadyExists).toBe(LEGACY_FRENCH);
  });

  it('11) legacy agreement_line_service_already_exists stays mapped separately', () => {
    expect(agreementAmendmentErrorMessageKey(LEGACY_CODE)).toBe(LEGACY_KEY);
    expect(agreementAmendmentErrorMessageKey(LEGACY_CODE)).not.toBe(OVERLAP_KEY);
    expect(resolveAgreementAmendmentErrorMessage(LEGACY_CODE, 'raw english', tFor('ar'))).toBe(
      LEGACY_ARABIC,
    );
    expect(resolveAgreementAmendmentErrorMessage(LEGACY_CODE, 'raw english', tFor('fr'))).toBe(
      LEGACY_FRENCH,
    );
  });
});
