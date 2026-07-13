'use client';

import { use } from 'react';
import { TeacherClassJournalDetail } from '@/features/teacher/delivery/components/teacher-class-journal-detail';

export default function TeacherClassJournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeacherClassJournalDetail entryId={id} />;
}
