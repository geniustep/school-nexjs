'use client';

import { CollectionWorkflowForm } from './collection-workflow-form';

export function FinanceCollectionForm({
  onDone,
  onCancel,
  initialStudentId,
  lockStudent = false,
  initialAcademicYearId,
}: {
  onDone: (collectionId: number) => void;
  onCancel: () => void;
  initialStudentId?: number | string;
  lockStudent?: boolean;
  initialAcademicYearId?: number | string;
}) {
  return (
    <CollectionWorkflowForm
      initialStudentId={initialStudentId}
      lockStudent={lockStudent}
      initialAcademicYearId={initialAcademicYearId}
      useInstallmentAllocations
      onDone={(collection) => onDone(collection.id)}
      onCancel={onCancel}
    />
  );
}
