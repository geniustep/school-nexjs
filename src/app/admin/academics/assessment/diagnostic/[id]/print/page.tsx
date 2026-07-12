'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { use } from 'react';
import { DiagnosticPrintView } from '@/features/admin/diagnostic-assessment/components/diagnostic-print-view';

export default function AdminDiagnosticAssessmentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DiagnosticPrintView assessmentId={id} role="admin" />;
}
