import type { RelationshipType } from './student-360';

export type StudentQuickRegistrationLanguage = 'ar' | 'fr';

export interface StudentQuickRegistrationGuardianInput {
  name: string;
  phone: string;
  relationship_type: RelationshipType;
}

export interface StudentQuickRegistrationPayload {
  first_name_ar?: string;
  last_name_ar?: string;
  first_name_fr?: string;
  last_name_fr?: string;
  status: 'active';
  active: true;
  admission_date: string;
  enrollment: {
    actual_join_date: string;
  };
  academic: {
    school_id: number;
    academic_year_id: number;
    level_id: number;
    enrollment_date: string;
  };
  quick_registration: {
    enabled: true;
    guardian_is_financial_responsible: boolean;
    create_guardians: StudentQuickRegistrationGuardianInput[];
    auto_finance_setup: true;
  };
}

export interface StudentQuickRegistrationPostSetupMeta {
  job_id: number;
  state: string;
}

export interface StudentQuickRegistrationCreateResponse {
  id: number;
  post_setup?: StudentQuickRegistrationPostSetupMeta;
}
