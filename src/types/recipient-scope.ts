/**
 * Canonical administrative recipient_scope — Odoo 18.0.1.0.259+.
 * Backend resolves recipients; clients must not invent audience fields.
 */

export const SCHOOL_BENEFICIARY_KINDS = [
  'everyone',
  'staff',
  'teachers',
  'students',
  'guardians',
  'students_and_guardians',
] as const;

export type SchoolBeneficiaryKind = (typeof SCHOOL_BENEFICIARY_KINDS)[number];

export const SECTION_BENEFICIARY_KINDS = [
  'teachers',
  'students',
  'guardians',
  'students_and_guardians',
] as const;

export type SectionBeneficiaryKind = (typeof SECTION_BENEFICIARY_KINDS)[number];

export type IndividualRecipientType = 'teacher' | 'student' | 'guardian';

export type SchoolRecipientScope = {
  scope_type: 'school';
  beneficiary_kind: SchoolBeneficiaryKind;
};

export type ClassRecipientScope = {
  scope_type: 'class';
  beneficiary_kind: SectionBeneficiaryKind;
  scope_id: number;
};

export type LevelRecipientScope = {
  scope_type: 'level';
  beneficiary_kind: SectionBeneficiaryKind;
  scope_id: number;
};

export type CycleRecipientScope = {
  scope_type: 'cycle';
  beneficiary_kind: SectionBeneficiaryKind;
  scope_id: number;
};

export type IndividualRecipientScope = {
  scope_type: 'individual';
  recipient_type: IndividualRecipientType;
  recipient_id: number;
};

export type GroupRecipientScope =
  | SchoolRecipientScope
  | ClassRecipientScope
  | LevelRecipientScope
  | CycleRecipientScope;

export type RecipientScope = GroupRecipientScope | IndividualRecipientScope;

export type RecipientScopeType = RecipientScope['scope_type'];

export type GeneralCommunicationMode = 'group' | 'individual';

export type GroupScopeLevel = 'school' | 'class' | 'level' | 'cycle';

/** Create/PATCH/Preview body fragment — never includes school_id or recipient_ids. */
export type RecipientScopePayload = {
  recipient_scope: RecipientScope;
};
