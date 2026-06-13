// Academic auto-setup — POST /admin/setup/academic/initialize (Odoo 18.0.1.0.78+).

import type { ApiWarning } from './academic-setup';
import type {
  EnableLevelResultStatus,
  EnableLevelSchoolLevel,
  EnabledTrackResult,
  FirstClassResult,
} from './academic-levels';

export interface AcademicInitializeRequest {
  reference_level_ids: number[];
  track_selections: Record<string, number[]>;
  create_first_classes: boolean;
  enable_reference_subjects: boolean;
}

export type InitializeSubjectBucketStatus = 'enabled' | 'already_enabled' | 'failed' | 'skipped';

export interface InitializeSubjectSummary {
  enabled: number;
  already_enabled: number;
  failed: number;
  skipped?: number;
}

export interface InitializeLevelResult {
  reference_level_id: number;
  code?: string;
  status: EnableLevelResultStatus;
  school_level?: EnableLevelSchoolLevel;
  school_level_id?: number;
  first_class?: FirstClassResult;
  tracks?: EnabledTrackResult[];
  shared_subjects?: InitializeSubjectSummary;
  track_subjects?: InitializeSubjectSummary;
  warnings?: ApiWarning[];
  error?: {
    code: string;
    message: string;
  };
}

export interface AcademicInitializeSummary {
  requested: number;
  enabled: number;
  already_enabled: number;
  failed: number;
  partial_failure?: boolean;
  classes_created?: number;
  classes_already_exist?: number;
  classes_failed?: number;
  subjects_enabled?: number;
  subjects_already_enabled?: number;
  subjects_failed?: number;
}

export interface AcademicInitializeResponse {
  results: InitializeLevelResult[];
  summary: AcademicInitializeSummary;
}

export interface AcademicSetupFeatures {
  academic_auto_setup?: boolean;
}
