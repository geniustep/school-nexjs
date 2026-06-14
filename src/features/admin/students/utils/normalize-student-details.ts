import type { ParentLink } from '@/types/student';
import type {
  GuardianRelationship,
  StudentCapabilities,
  StudentDetailsData,
  StudentDocumentSummary,
  StudentHealthSummary,
  StudentSummary,
} from '@/types/student-360';
import { normalizeStudentFinanceOverviewSummary } from './normalize-student-finance';

const DEFAULT_CAPABILITIES: StudentCapabilities = {
  can_manage: false,
  can_manage_guardians: false,
  can_view_finance: false,
  can_view_documents: false,
  can_manage_documents: false,
  can_view_health: false,
  can_manage_health: false,
};

function isNestedDetails(data: Record<string, unknown>): boolean {
  return typeof data.student === 'object' && data.student !== null;
}

function legacyParentsToRelationships(parents: ParentLink[] | undefined): GuardianRelationship[] {
  if (!parents?.length) return [];
  return parents.map((p, index) => ({
    relationship_id: -(p.id),
    guardian: { id: p.id, name: p.name, phone: p.phone },
    relationship_type: 'other',
    is_primary_contact: index === 0,
    is_legal_guardian: false,
    is_financial_responsible: false,
    receives_notifications: true,
    is_emergency_contact: false,
    is_authorized_pickup: false,
    state: 'active',
    active: true,
  }));
}

/** Normalize GET /admin/students/{id} — nested Student 360 or legacy flat student. */
export function normalizeStudentDetailsResponse(data: unknown): StudentDetailsData | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;

  if (isNestedDetails(raw)) {
    const student = raw.student as StudentSummary;
    return {
      student,
      current_enrollment: (raw.current_enrollment as StudentDetailsData['current_enrollment']) ?? null,
      enrollment_history: Array.isArray(raw.enrollment_history)
        ? (raw.enrollment_history as StudentDetailsData['enrollment_history'])
        : [],
      guardian_relationships: Array.isArray(raw.guardian_relationships)
        ? (raw.guardian_relationships as GuardianRelationship[])
        : legacyParentsToRelationships(student.parents ?? (raw.parents as ParentLink[] | undefined)),
      capabilities: (raw.capabilities as StudentCapabilities) ?? DEFAULT_CAPABILITIES,
      document_summary: (raw.document_summary as StudentDocumentSummary | null) ?? null,
      health_summary: (raw.health_summary as StudentHealthSummary | null) ?? null,
      finance_summary: normalizeStudentFinanceOverviewSummary(raw.finance_summary),
      parents: (raw.parents as ParentLink[] | undefined) ?? student.parents,
      parent_ids: raw.parent_ids as number[] | undefined,
    };
  }

  if (typeof raw.id === 'number') {
    const student = raw as unknown as StudentSummary;
    return {
      student,
      current_enrollment: null,
      enrollment_history: [],
      guardian_relationships: legacyParentsToRelationships(student.parents),
      capabilities: DEFAULT_CAPABILITIES,
      parents: student.parents,
    };
  }

  return null;
}
