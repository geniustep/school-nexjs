import type { Locale } from '@/lib/i18n/config';
import type {
  GuardianAccountAccessPolicy,
  GuardianLegalStatus,
} from '@/types/guardian-access';
import {
  GUARDIAN_ACCOUNT_ACCESS_POLICIES,
  GUARDIAN_LEGAL_STATUSES,
} from '@/types/guardian-access';

const LEGAL_STATUS_SET = new Set<string>(GUARDIAN_LEGAL_STATUSES);
const ACCESS_POLICY_SET = new Set<string>(GUARDIAN_ACCOUNT_ACCESS_POLICIES);

export type GuardianAccessOutcome =
  | 'allowed_explicit'
  | 'allowed_legal'
  | 'pending_legal'
  | 'denied_not_legal'
  | 'blocked';

export interface GuardianAccessSource {
  legal_status?: unknown;
  is_legal_guardian?: unknown;
  account_access_policy?: unknown;
}

export interface GuardianAccessCopy {
  sectionTitle: string;
  sectionHint: string;
  legalTitle: string;
  legalUnknown: string;
  legalUnknownHint: string;
  legalYes: string;
  legalYesHint: string;
  legalNo: string;
  legalNoHint: string;
  accessTitle: string;
  accessInherit: string;
  accessInheritHint: string;
  accessAllowed: string;
  accessAllowedHint: string;
  accessBlocked: string;
  accessBlockedHint: string;
  outcomeAllowedExplicit: string;
  outcomeAllowedLegal: string;
  outcomePendingLegal: string;
  outcomeDeniedNotLegal: string;
  outcomeBlocked: string;
  badgeAccessAllowed: string;
  badgeAccessBlocked: string;
}

const COPY: Record<Locale, GuardianAccessCopy> = {
  ar: {
    sectionTitle: 'الأهلية والوصول',
    sectionHint: 'صلة القرابة لا تحدد الصفة القانونية أو صلاحية حساب رقيم تلقائيًا.',
    legalTitle: 'الصفة القانونية',
    legalUnknown: 'غير محددة',
    legalUnknownHint: 'استخدمها عندما لم تُحسم الصفة القانونية بعد.',
    legalYes: 'ولي قانوني',
    legalYesHint: 'تم تأكيد الصفة القانونية لهذا التلميذ.',
    legalNo: 'ليس وليًا قانونيًا',
    legalNoHint: 'تم تأكيد عدم الصفة القانونية لهذا التلميذ.',
    accessTitle: 'الوصول إلى حساب رقيم',
    accessInherit: 'حسب الصفة القانونية',
    accessInheritHint: 'يسمح بالحساب فقط عندما تكون الصفة «ولي قانوني».',
    accessAllowed: 'مسموح',
    accessAllowedHint: 'إذن صريح بحساب رقيم دون تغيير الصفة القانونية.',
    accessBlocked: 'محظور',
    accessBlockedHint: 'يمنع حساب رقيم والتفعيل لهذه العلاقة.',
    outcomeAllowedExplicit: 'الوصول مسموح بقرار المدرسة دون تغيير الصفة القانونية.',
    outcomeAllowedLegal: 'الوصول مسموح لأن الصفة القانونية مؤكدة.',
    outcomePendingLegal: 'الوصول معلّق حتى تحديد الصفة القانونية أو اختيار «مسموح».',
    outcomeDeniedNotLegal: 'الوصول غير مسموح لأن الصفة القانونية «ليس وليًا قانونيًا».',
    outcomeBlocked: 'حساب رقيم محظور لهذه العلاقة.',
    badgeAccessAllowed: 'حساب رقيم مسموح',
    badgeAccessBlocked: 'حساب رقيم محظور',
  },
  fr: {
    sectionTitle: 'Statut et accès',
    sectionHint: 'Le lien de parenté ne détermine pas automatiquement le statut légal ni l’accès au compte Raqeem.',
    legalTitle: 'Statut légal',
    legalUnknown: 'Non défini',
    legalUnknownHint: 'À utiliser lorsque le statut légal n’a pas encore été confirmé.',
    legalYes: 'Représentant légal',
    legalYesHint: 'Le statut légal pour cet élève est confirmé.',
    legalNo: 'Non représentant légal',
    legalNoHint: 'L’absence de statut légal pour cet élève est confirmée.',
    accessTitle: 'Accès au compte Raqeem',
    accessInherit: 'Selon le statut légal',
    accessInheritHint: 'L’accès est autorisé uniquement si le statut légal est confirmé.',
    accessAllowed: 'Autorisé',
    accessAllowedHint: 'Autorisation explicite du compte sans modifier le statut légal.',
    accessBlocked: 'Bloqué',
    accessBlockedHint: 'Bloque le compte Raqeem et l’activation pour cette relation.',
    outcomeAllowedExplicit: 'Accès autorisé par l’établissement sans modifier le statut légal.',
    outcomeAllowedLegal: 'Accès autorisé car le statut légal est confirmé.',
    outcomePendingLegal: 'Accès en attente de confirmation du statut légal ou d’une autorisation explicite.',
    outcomeDeniedNotLegal: 'Accès non autorisé car la personne n’est pas représentant légal.',
    outcomeBlocked: 'Le compte Raqeem est bloqué pour cette relation.',
    badgeAccessAllowed: 'Compte Raqeem autorisé',
    badgeAccessBlocked: 'Compte Raqeem bloqué',
  },
  en: {
    sectionTitle: 'Eligibility and access',
    sectionHint: 'Relationship type does not automatically decide legal status or Raqeem account access.',
    legalTitle: 'Legal status',
    legalUnknown: 'Not specified',
    legalUnknownHint: 'Use when the legal status has not been confirmed yet.',
    legalYes: 'Legal guardian',
    legalYesHint: 'Legal status for this student has been confirmed.',
    legalNo: 'Not a legal guardian',
    legalNoHint: 'It has been confirmed that this person is not a legal guardian for this student.',
    accessTitle: 'Raqeem account access',
    accessInherit: 'Follow legal status',
    accessInheritHint: 'Account access is allowed only when legal status is confirmed.',
    accessAllowed: 'Allowed',
    accessAllowedHint: 'Explicit account permission without changing legal status.',
    accessBlocked: 'Blocked',
    accessBlockedHint: 'Blocks Raqeem account access and activation for this relationship.',
    outcomeAllowedExplicit: 'Access is allowed by the school without changing legal status.',
    outcomeAllowedLegal: 'Access is allowed because legal status is confirmed.',
    outcomePendingLegal: 'Access is pending until legal status is confirmed or “Allowed” is selected.',
    outcomeDeniedNotLegal: 'Access is not allowed because this person is not a legal guardian.',
    outcomeBlocked: 'Raqeem account access is blocked for this relationship.',
    badgeAccessAllowed: 'Raqeem account allowed',
    badgeAccessBlocked: 'Raqeem account blocked',
  },
  es: {
    sectionTitle: 'Elegibilidad y acceso',
    sectionHint: 'El parentesco no determina automáticamente el estado legal ni el acceso a la cuenta de Raqeem.',
    legalTitle: 'Estado legal',
    legalUnknown: 'Sin definir',
    legalUnknownHint: 'Úselo cuando el estado legal aún no esté confirmado.',
    legalYes: 'Tutor legal',
    legalYesHint: 'El estado legal para este alumno está confirmado.',
    legalNo: 'No es tutor legal',
    legalNoHint: 'Se ha confirmado que no es tutor legal de este alumno.',
    accessTitle: 'Acceso a la cuenta Raqeem',
    accessInherit: 'Según el estado legal',
    accessInheritHint: 'El acceso se permite solo cuando el estado legal está confirmado.',
    accessAllowed: 'Permitido',
    accessAllowedHint: 'Permiso explícito de cuenta sin cambiar el estado legal.',
    accessBlocked: 'Bloqueado',
    accessBlockedHint: 'Bloquea la cuenta Raqeem y la activación para esta relación.',
    outcomeAllowedExplicit: 'Acceso permitido por la escuela sin cambiar el estado legal.',
    outcomeAllowedLegal: 'Acceso permitido porque el estado legal está confirmado.',
    outcomePendingLegal: 'Acceso pendiente hasta confirmar el estado legal o seleccionar “Permitido”.',
    outcomeDeniedNotLegal: 'Acceso no permitido porque no es tutor legal.',
    outcomeBlocked: 'La cuenta Raqeem está bloqueada para esta relación.',
    badgeAccessAllowed: 'Cuenta Raqeem permitida',
    badgeAccessBlocked: 'Cuenta Raqeem bloqueada',
  },
};

export function isGuardianLegalStatus(value: unknown): value is GuardianLegalStatus {
  return typeof value === 'string' && LEGAL_STATUS_SET.has(value);
}

export function isGuardianAccountAccessPolicy(value: unknown): value is GuardianAccountAccessPolicy {
  return typeof value === 'string' && ACCESS_POLICY_SET.has(value);
}

export function resolveGuardianLegalStatus(source: GuardianAccessSource): GuardianLegalStatus {
  if (isGuardianLegalStatus(source.legal_status)) return source.legal_status;
  return source.is_legal_guardian === true ? 'yes' : 'unknown';
}

export function resolveGuardianAccountAccessPolicy(source: GuardianAccessSource): GuardianAccountAccessPolicy {
  return isGuardianAccountAccessPolicy(source.account_access_policy)
    ? source.account_access_policy
    : 'inherit_legal';
}

export function resolveGuardianAccessOutcome(
  legalStatus: GuardianLegalStatus,
  policy: GuardianAccountAccessPolicy,
): GuardianAccessOutcome {
  if (policy === 'blocked') return 'blocked';
  if (policy === 'allowed') return 'allowed_explicit';
  if (legalStatus === 'yes') return 'allowed_legal';
  if (legalStatus === 'no') return 'denied_not_legal';
  return 'pending_legal';
}

export function guardianAccessCopy(locale: Locale): GuardianAccessCopy {
  return COPY[locale] ?? COPY.ar;
}

export function legalStatusLabel(locale: Locale, status: GuardianLegalStatus): string {
  const copy = guardianAccessCopy(locale);
  if (status === 'yes') return copy.legalYes;
  if (status === 'no') return copy.legalNo;
  return copy.legalUnknown;
}
