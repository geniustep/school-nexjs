import { isRelationshipActive } from './relationship-types';
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
    t: (key: string, params?: Record<string, string | number>) => string;
  },
): Partial<Record<Student360TabId, Student360TabIndicator>> {
  const { showFinance, showHealth, showDocuments, t } = options;
  const out: Partial<Record<Student360TabId, Student360TabIndicator>> = {};

  if (details.current_enrollment) {
    out.enrollment = {
      tab: 'enrollment',
      label: t('admin.student360.indicators.enrolled'),
      tone: 'green',
    };
  } else {
    out.enrollment = {
      tab: 'enrollment',
      label: t('admin.student360.indicators.notEnrolled'),
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
      label: t('admin.student360.indicators.overdue'),
      tone: 'red',
    };
  }

  if (showHealth && details.health_summary) {
    if (details.health_summary.has_critical_alert) {
      out.health = {
        tab: 'health',
        label: '!',
        tone: 'red',
      };
    } else if (!details.health_summary.has_profile) {
      out.health = {
        tab: 'health',
        label: t('admin.student360.indicators.noHealth'),
        tone: 'amber',
      };
    }
  }

  return out;
}
