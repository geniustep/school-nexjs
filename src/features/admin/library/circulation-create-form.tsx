'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { buildGlobalAcademicYearQuery } from '@/features/academic-context/utils/global-academic-year-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Student } from '@/types/student';
import { LibraryModal, libraryInputClass, libraryPrimaryButton } from './library-ui';
import type { LibraryCopyRow } from './library-contract';

export type LibraryCheckoutValues = {
  studentId: number;
  dueAt: string;
  notes: string;
};

function studentLabel(student: Student): string {
  const name = student.full_name || student.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || `#${student.id}`;
  const ref = student.school_number || student.code || student.massar_code || student.matricule;
  return ref ? `${name} — ${ref}` : name;
}

export function LibraryCirculationCreateForm({
  copy,
  onClose,
  onSubmit,
}: {
  copy: LibraryCopyRow;
  onClose: () => void;
  onSubmit: (values: LibraryCheckoutValues) => Promise<void>;
}) {
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmedSearch = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    if (trimmedSearch.length < 2 || activeAcademicYearId == null) {
      setStudents([]);
      setStudentError('');
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingStudents(true);
      setStudentError('');
      void api.get<Student[]>(
        endpoints.admin.students,
        buildGlobalAcademicYearQuery(
          {
            search: trimmedSearch,
            page: 1,
            page_size: 10,
            active_school_id: activeSchoolId ?? undefined,
          },
          activeAcademicYearId,
        ),
      ).then((result) => {
        if (!active) return;
        if (result.success) setStudents(Array.isArray(result.data) ? result.data : []);
        else {
          setStudents([]);
          setStudentError('تعذر البحث عن التلاميذ.');
        }
        setLoadingStudents(false);
      });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeAcademicYearId, activeSchoolId, trimmedSearch]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!studentId || !dueAt) return;
    setBusy(true);
    try {
      await onSubmit({ studentId: Number(studentId), dueAt, notes });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LibraryModal title="إعارة كتاب" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <div className="font-medium">{copy.title.name}</div>
          <div className="mt-1 text-slate-500">رقم الجرد: {copy.accession}</div>
        </div>
        <input
          className={libraryInputClass}
          placeholder="ابحث عن التلميذ بالاسم أو الرقم"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setStudentId(''); }}
        />
        {loadingStudents ? <p className="text-sm text-slate-500">جارٍ البحث…</p> : null}
        {studentError ? <p className="text-sm text-red-600">{studentError}</p> : null}
        {trimmedSearch.length >= 2 && !loadingStudents ? (
          <select required className={libraryInputClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">اختر التلميذ</option>
            {students.map((student) => <option key={student.id} value={student.id}>{studentLabel(student)}</option>)}
          </select>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span>تاريخ الاستحقاق</span>
          <input required type="datetime-local" className={libraryInputClass} value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        <textarea className={libraryInputClass} placeholder="ملاحظات اختيارية" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        <p className="text-xs text-slate-500">إعارة الموظفين ستُفعّل بعد توفر معرّف علاقة الموظف الموثوق من الـAPI.</p>
        <button disabled={busy || !studentId || !dueAt} className={libraryPrimaryButton}>{busy ? 'جارٍ تنفيذ الإعارة…' : 'تأكيد الإعارة'}</button>
      </form>
    </LibraryModal>
  );
}
