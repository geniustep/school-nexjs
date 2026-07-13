'use client';

import { use } from 'react';
import { ClassJournalDetailPrintView } from '@/features/teaching-planning/print/views/class-journal-print-views';

export default function TeacherClassJournalDetailPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClassJournalDetailPrintView entryId={id} audience="teacher" />;
}
