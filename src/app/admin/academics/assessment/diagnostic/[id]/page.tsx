'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { use } from 'react';
import { DiagnosticAssessmentDetailWorkspace } from '@/features/admin/diagnostic-assessment/components/diagnostic-assessment-detail-workspace';

export default function AdminDiagnosticAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DiagnosticAssessmentDetailWorkspace assessmentId={id} role="admin" />;
}
