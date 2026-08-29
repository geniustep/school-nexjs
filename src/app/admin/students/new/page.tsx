'use client';

import { useRouter } from 'next/navigation';
import { StudentCreateForm } from '@/features/admin/students/components/student-create-form';

export default function AdminStudentCreatePage() {
  const router = useRouter();

  return (
    <StudentCreateForm
      onCancel={() => router.push('/admin/students')}
      onSaved={(studentId, mode) => {
        if (mode === 'list') {
          router.push('/admin/students');
          return;
        }
        router.push(`/admin/students/${studentId}`);
      }}
    />
  );
}
