import { isRelationshipActive } from './relationship-types';
import { hasCriticalHealthAlert, normalizeStudentHealthSummary } from './normalize-student-health';
import type { Student360TabId } from './student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';

export type Student360TabIndicator = {
  tab: Student360TabId;
  label: string;
  tone?: 'red' | 'amber' | 'green' | 'slate';
};

export function buildStudent360TabIndicators(
  details: StudentDetailsData,
  options: {
    showFinance: boolean;
    showHealth: boolean;
    showDocuments: boolean;
  },
): Partial<Record<Student360TabId, Student360TabIndicator>> {
  const { showFinance, showHealth, showDocuments } = options;
  const out: Partial<Record<Student360TabId, Student360TabIndicator>> = {};

  if (details.current_enrollment) {
    out.enrollment = {
      tab: 'enrollment',
      label: '●',
      tone: 'green',
    };
  } else {
    out.enrollment = {
      tab: 'enrollment',
      label: '!',
      tone: 'amber',
    };
  }

  const activeGuardians = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  if (activeGuardians.length > 0) {
    out.guardians = {
      tab: 'guardians',
      label: String(activeGuardians.length),
      tone: 'slate',
    };
  }

  if (showDocuments && details.document_summary) {
    const missing = details.document_summary.missing_required;
    if (missing > 0) {
      out.documents = {
        tab: 'documents',
        label: String(missing),
        tone: 'red',
      };
    }
  }

  if (showFinance && details.finance_summary && details.finance_summary.total_overdue > 0) {
    out.finance = {
      tab: 'finance',
      label: '!',
      tone: 'red',
    };
  }

  if (showHealth) {
    const healthSummary = normalizeStudentHealthSummary(details.health_summary);
    if (healthSummary) {
      if (hasCriticalHealthAlert(healthSummary)) {
        out.health = {
          tab: 'health',
          label: '!',
          tone: 'red',
        };
      } else if (!healthSummary.has_profile) {
        out.health = {
          tab: 'health',
          label: '!',
          tone: 'amber',
        };
      }
    }
  }

  return out;
}
