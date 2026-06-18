/** Independent guardian link — POST /admin/guardians/link-partner */

export type ExistingPersonRole =
  | 'guardian'
  | 'teacher'
  | 'admin'
  | 'employee'
  | 'student'
  | 'user';

export type GuardianLinkCandidate = {
  partner_id: number;
  display_name: string;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  existing_roles: ExistingPersonRole[];
  can_link_as_guardian: boolean;
  guardian_id?: number | null;
  teacher_id?: number | null;
  user_id?: number | null;
  reason?: string | null;
};

export type GuardianLinkPartnerPayload = {
  partner_id: number;
  preferred_language?: string;
  notification_opt_in?: boolean;
};

export type GuardianLinkPartnerGuardian = {
  id: number;
  partner_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  preferred_language?: string | null;
  notification_opt_in?: boolean | null;
};

export type GuardianLinkPartnerAccount = {
  user_id?: number | null;
  roles_added?: string[];
  roles_existing?: string[];
  active_role_changed?: boolean;
};

export type GuardianLinkPartnerResponse = {
  guardian: GuardianLinkPartnerGuardian;
  person: GuardianLinkCandidate;
  account?: GuardianLinkPartnerAccount | null;
};
