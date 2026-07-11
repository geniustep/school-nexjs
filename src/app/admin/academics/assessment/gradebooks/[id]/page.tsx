'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { use } from 'react';
import { GradebookDetailWorkspace } from '@/features/admin/gradebooks/components/gradebook-detail-workspace';

export default function AdminGradebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GradebookDetailWorkspace gradebookId={id} />;
}
