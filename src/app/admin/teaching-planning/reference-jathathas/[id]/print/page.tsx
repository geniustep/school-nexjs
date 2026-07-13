'use client';

import { use } from 'react';
import { ReferenceJathathaPrintView } from '@/features/teaching-planning/print/views/reference-jathatha-print-view';

export default function AdminReferenceJathathaPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReferenceJathathaPrintView jathathaId={id} />;
}
