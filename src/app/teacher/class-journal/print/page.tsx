'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { ClassJournalReportPrintView } from '@/features/teaching-planning/print/views/class-journal-print-views';
import { useT } from '@/features/i18n/locale-context';

function Inner() {
  return <ClassJournalReportPrintView audience="teacher" />;
}

export default function TeacherClassJournalReportPrintPage() {
  const t = useT();
  return (
    <Suspense fallback={<LoadingState label={t('common.loading')} />}>
      <Inner />
    </Suspense>
  );
}
