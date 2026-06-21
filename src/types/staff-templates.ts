import type { ApiWarning } from '@/types/academic-setup';

export interface StaffTemplateMainPosition {
  code: string;
  name: string;
}

export interface StaffTemplateBundleSelection {
  policy?: string;
  default_bundle_codes?: string[];
  required_bundle_codes?: string[];
  optional_bundle_codes?: string[];
  removable_bundle_codes?: string[];
  available_bundle_codes?: string[];
  forbidden_bundle_codes?: string[];
}

export interface StaffTemplateCapabilityItem {
  code: string;
  label?: string;
  category?: string;
}

export interface StaffCreationTemplate {
  code: string;
  name: string;
  description?: string | null;
  main_position?: StaffTemplateMainPosition | null;
  bundle_codes?: string[];
  bundle_selection?: StaffTemplateBundleSelection | null;
  default_bundle_codes?: string[];
  requires_user_account?: boolean;
  creates_teacher_profile?: boolean;
  required_assignments?: string[];
  allowed_actions?: Record<string, boolean> | string[];
  sensitive?: boolean;
}

export interface StaffTemplateScope {
  school_id?: number;
  level_ids?: number[];
  class_ids?: number[];
}

export interface StaffTemplateAssignments {
  subject_id?: number | null;
  class_ids?: number[];
  academic_year_id?: number | null;
}

export interface StaffTemplatePreviewPayload {
  template_code: string;
  scope: StaffTemplateScope;
  assignments: StaffTemplateAssignments;
  selected_bundle_codes?: string[];
}

export interface StaffTemplatePreview {
  allowed_to_create: boolean;
  effective_capabilities?: string[];
  effective_capability_items?: StaffTemplateCapabilityItem[];
  responsibility_bundles?: string[];
  selected_bundle_codes?: string[];
  scope?: StaffTemplateScope;
  required_fields?: string[];
  warnings?: (string | ApiWarning)[];
  forbidden_capabilities?: string[];
  forbidden_capability_items?: StaffTemplateCapabilityItem[];
  bundle_selection?: StaffTemplateBundleSelection;
}

export interface StaffTemplatePersonInput {
  name: string;
  phone: string;
  email: string;
}

export interface StaffTemplateAccountInput {
  create: boolean;
  login: string;
  password: string;
  password_confirm: string;
}

export interface StaffTemplateCreatePayload {
  template_code: string;
  person: StaffTemplatePersonInput;
  account?: StaffTemplateAccountInput;
  scope: StaffTemplateScope;
  assignments: StaffTemplateAssignments;
  selected_bundle_codes?: string[];
}

export interface StaffTemplateCreateResult {
  id?: number;
  user_id?: number | null;
  teacher_id?: number | null;
  name?: string;
  template_code?: string;
  main_position?: string | null;
  login?: string | null;
  message?: string;
  staff?: {
    user_id?: number | null;
    teacher_id?: number | null;
    name?: string;
  };
}

export type StaffSmartCreateWizardStep = 'template' | 'details' | 'review';

export interface StaffSmartCreateFormState {
  templateCode: string;
  selectedBundleCodes: string[];
  person: StaffTemplatePersonInput;
  createAccount: boolean;
  assignPasswordNow: boolean;
  login: string;
  useDifferentLogin: boolean;
  password: string;
  confirmPassword: string;
  assignments: StaffTemplateAssignments;
}
