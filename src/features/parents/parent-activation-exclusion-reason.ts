import type { Locale } from '@/lib/i18n/config';
import type { ParentActivationExclusionReason } from '@/types/parent-activation-campaign';

type TranslateFn = (key: string) => string;

const existingReasonKeys: Partial<Record<ParentActivationExclusionReason, string>> = {
  no_active_relationship: 'admin.parentActivation.reason.noActiveRelationship',
  account_not_allowed: 'admin.parentActivation.reason.accountNotAllowed',
  communication_not_allowed: 'admin.parentActivation.reason.communicationNotAllowed',
  no_user_account: 'admin.parentActivation.reason.noUserAccount',
  inactive_user_account: 'admin.parentActivation.reason.inactiveUserAccount',
  identity_unavailable: 'admin.parentActivation.reason.identityUnavailable',
};

const contractReasonLabels: Record<Locale, Record<string, string>> = {
  ar: {
    legal_status_unknown: 'الصفة القانونية غير محددة',
    not_legal_guardian: 'ليس وليًا قانونيًا',
    account_blocked: 'حساب رقيم محظور',
  },
  en: {
    legal_status_unknown: 'Legal guardian status is not specified',
    not_legal_guardian: 'Not a legal guardian',
    account_blocked: 'Raqeem account access is blocked',
  },
  fr: {
    legal_status_unknown: 'Le statut de représentant légal n’est pas renseigné',
    not_legal_guardian: 'N’est pas représentant légal',
    account_blocked: 'L’accès au compte Raqeem est bloqué',
  },
  es: {
    legal_status_unknown: 'El estado de tutor legal no está definido',
    not_legal_guardian: 'No es tutor legal',
    account_blocked: 'El acceso a la cuenta de Raqeem está bloqueado',
  },
};

const unknownReasonLabels: Record<Locale, string> = {
  ar: 'سبب الاستبعاد غير معروف',
  en: 'Unknown exclusion reason',
  fr: 'Motif d’exclusion inconnu',
  es: 'Motivo de exclusión desconocido',
};

export function getParentActivationExclusionLabel(
  locale: Locale,
  t: TranslateFn,
  reason: string | null,
): string | null {
  if (!reason) return null;

  const contractLabel = contractReasonLabels[locale][reason];
  if (contractLabel) return contractLabel;

  const translationKey = existingReasonKeys[reason as ParentActivationExclusionReason];
  if (translationKey) return t(translationKey);

  return unknownReasonLabels[locale];
}
