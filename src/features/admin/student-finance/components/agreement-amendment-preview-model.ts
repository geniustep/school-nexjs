export type AmendmentStudioLocale = 'ar' | 'fr' | 'en' | 'es';

export type AmendmentReasonPresetKey =
  | 'manager_decision'
  | 'family_request'
  | 'administrative_correction'
  | 'exceptional_review'
  | 'previous_agreement_error'
  | 'other';

export interface AmendmentReasonPresetOption {
  key: AmendmentReasonPresetKey;
  label: string;
}

export interface AmendmentPreviewPeriodLike {
  id: number;
  label: string;
  periodKey?: string | null;
  periodStart?: string | null;
  selectable?: boolean;
}

const REASON_PRESETS: Record<AmendmentStudioLocale, Record<AmendmentReasonPresetKey, string>> = {
  ar: {
    manager_decision: 'قرار المدير',
    family_request: 'طلب من الأسرة',
    administrative_correction: 'تصحيح إداري',
    exceptional_review: 'تخفيض أو مراجعة استثنائية',
    previous_agreement_error: 'تصحيح خطأ سابق في الاتفاق',
    other: 'أخرى',
  },
  fr: {
    manager_decision: 'Décision de la direction',
    family_request: 'Demande de la famille',
    administrative_correction: 'Correction administrative',
    exceptional_review: 'Révision exceptionnelle',
    previous_agreement_error: "Correction d'une erreur antérieure de l'accord",
    other: 'Autre',
  },
  en: {
    manager_decision: 'Management decision',
    family_request: 'Family request',
    administrative_correction: 'Administrative correction',
    exceptional_review: 'Exceptional review',
    previous_agreement_error: 'Correction of a previous agreement error',
    other: 'Other',
  },
  es: {
    manager_decision: 'Decisión de la dirección',
    family_request: 'Solicitud de la familia',
    administrative_correction: 'Corrección administrativa',
    exceptional_review: 'Revisión excepcional',
    previous_agreement_error: 'Corrección de un error anterior del acuerdo',
    other: 'Otro',
  },
};

const LOCALE_TAGS: Record<AmendmentStudioLocale, string> = {
  ar: 'ar-MA',
  fr: 'fr-MA',
  en: 'en-GB',
  es: 'es-ES',
};

export function normalizeAmendmentStudioLocale(locale: string): AmendmentStudioLocale {
  return locale === 'ar' || locale === 'fr' || locale === 'es' ? locale : 'en';
}

export function getAmendmentReasonPresetOptions(locale: string): AmendmentReasonPresetOption[] {
  const normalized = normalizeAmendmentStudioLocale(locale);
  const copy = REASON_PRESETS[normalized];
  return (
    [
      'manager_decision',
      'family_request',
      'administrative_correction',
      'exceptional_review',
      'previous_agreement_error',
      'other',
    ] as AmendmentReasonPresetKey[]
  ).map((key) => ({ key, label: copy[key] }));
}

export function resolveAmendmentReasonPresetLabel(
  locale: string,
  key: AmendmentReasonPresetKey,
): string {
  const normalized = normalizeAmendmentStudioLocale(locale);
  return REASON_PRESETS[normalized][key];
}

function readPeriodKey(value: string | null | undefined): string | null {
  const match = String(value ?? '').match(/\b(\d{4})-(0[1-9]|1[0-2])\b/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function formatPeriodKey(periodKey: string, locale: string): string {
  const match = periodKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return periodKey;
  const normalized = normalizeAmendmentStudioLocale(locale);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat(LOCALE_TAGS[normalized], {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function labelForPeriod(period: AmendmentPreviewPeriodLike, locale: string): string {
  const label = period.label?.trim();
  if (label) return label;
  const key = readPeriodKey(period.periodKey) ?? readPeriodKey(period.periodStart);
  return key ? formatPeriodKey(key, locale) : String(period.id);
}

function findPeriodForRaw(
  raw: string,
  periods: AmendmentPreviewPeriodLike[],
): AmendmentPreviewPeriodLike | null {
  const rawKey = readPeriodKey(raw);
  if (!rawKey) return null;
  return (
    periods.find((period) => {
      const optionKey = readPeriodKey(period.periodKey) ?? readPeriodKey(period.periodStart);
      return optionKey === rawKey;
    }) ?? null
  );
}

function unique(values: string[]): string[] {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

export function resolveAffectedMonthLabels({
  periods,
  affectedPeriods,
  effectivePeriodId,
  effectivePeriodEndId,
  locale,
}: {
  periods: AmendmentPreviewPeriodLike[];
  affectedPeriods?: string[] | null;
  effectivePeriodId: string;
  effectivePeriodEndId: string;
  locale: string;
}): string[] {
  if (affectedPeriods?.length) {
    return unique(
      affectedPeriods.map((raw) => {
        const matched = findPeriodForRaw(raw, periods);
        if (matched) return labelForPeriod(matched, locale);
        const key = readPeriodKey(raw);
        return key ? formatPeriodKey(key, locale) : raw;
      }),
    );
  }

  const startIndex = periods.findIndex((period) => String(period.id) === effectivePeriodId);
  if (startIndex < 0) return [];

  const endId = effectivePeriodEndId.trim();
  if (endId && endId === effectivePeriodId) {
    return [labelForPeriod(periods[startIndex]!, locale)];
  }

  const endIndex = endId
    ? periods.findIndex((period) => String(period.id) === endId)
    : periods.length - 1;
  const safeEnd = endIndex >= startIndex ? endIndex : startIndex;

  return periods
    .slice(startIndex, safeEnd + 1)
    .filter((period) => period.selectable !== false)
    .map((period) => labelForPeriod(period, locale));
}

export function isSingleMonthSelection(
  effectivePeriodId: string,
  effectivePeriodEndId: string,
): boolean {
  const start = effectivePeriodId.trim();
  return start !== '' && effectivePeriodEndId.trim() === start;
}
