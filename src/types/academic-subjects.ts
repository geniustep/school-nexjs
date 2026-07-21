// Reference subject activation — School API v1 admin/subjects/options + enable.

export interface ReferenceSubjectOption {
  id: number;
  code: string;
  name: string;
  display_name: string;
  sequence: number;
  active: boolean;
  required: boolean;
  optional: boolean;
  source: 'level' | 'track';
  enabled: boolean;
  school_subject_id?: number | null;
  can_enable: boolean;
  defaults?: {
    weekly_hours?: number | null;
    session_duration?: number | null;
  };
  legacy_coefficient?: number | null;
  assessment_coefficient?: number | null;
  exam_coefficient?: number | null;
  plan?: {
    legacy_coefficient?: number | null;
    assessment_coefficient?: number | null;
    exam_coefficient?: number | null;
  } | null;
}

export interface SubjectOptionsLevel {
  id: number;
  name: string;
  code: string;
  ref_level_id?: number | null;
  supports_tracks: boolean;
}

export interface SubjectOptionsTrack {
  id: number;
  name: string;
  code: string;
}

export interface SubjectOptionsPermissions {
  can_enable: boolean;
}

export interface SubjectOptionsPayload {
  level: SubjectOptionsLevel;
  track?: SubjectOptionsTrack | null;
  reference_subjects: ReferenceSubjectOption[];
  permissions: SubjectOptionsPermissions;
}

export type EnableSubjectResultStatus = 'enabled' | 'already_enabled' | 'failed';

export interface EnableSubjectSchoolSubject {
  id: number;
  name: string;
  code: string;
  level_id?: number | null;
  track_id?: number | null;
  source?: 'level' | 'track';
}

export interface EnableSubjectResult {
  reference_subject_id: number;
  code?: string;
  status: EnableSubjectResultStatus;
  school_subject?: EnableSubjectSchoolSubject;
  error?: {
    code: string;
    message: string;
  };
}

export interface EnableSubjectsSummary {
  requested: number;
  enabled: number;
  already_enabled: number;
  failed: number;
}

export interface EnableSubjectsResponse {
  results: EnableSubjectResult[];
  summary?: EnableSubjectsSummary;
}
