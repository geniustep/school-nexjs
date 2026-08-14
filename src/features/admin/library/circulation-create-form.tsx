'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { buildGlobalAcademicYearQuery } from '@/features/academic-context/utils/global-academic-year-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Student } from '@/types/student';
import { LibraryModal } from './library-ui';
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
      <form onSubmit={submit} className="form-stack">
        <div className="library-form-summary">
          <strong dir="auto">{copy.title.name}</strong>
          <span className="muted tiny">رقم الجرد: <bdi className="mono" dir="auto">{copy.accession}</bdi></span>
        </div>
        <div className="field">
          <label htmlFor="library-checkout-student-search">التلميذ</label>
          <input
            id="library-checkout-student-search"
            className="input"
            dir="auto"
            placeholder="ابحث بالاسم أو الرقم"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setStudentId(''); }}
          />
        </div>
        {loadingStudents ? <p className="library-form-status">جارٍ البحث…</p> : null}
        {studentError ? <p className="library-form-error">{studentError}</p> : null}
        {trimmedSearch.length >= 2 && !loadingStudents ? (
          <div className="field">
            <label htmlFor="library-checkout-student">نتائج البحث</label>
            <select id="library-checkout-student" required className="select" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">اختر التلميذ</option>
              {students.map((student) => <option key={student.id} value={student.id}>{studentLabel(student)}</option>)}
            </select>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="library-checkout-due">تاريخ الاستحقاق</label>
          <input id="library-checkout-due" required type="datetime-local" className="input" dir="ltr" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="library-checkout-notes">ملاحظات</label>
          <textarea id="library-checkout-notes" className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </div>
        <p className="library-form-note">إعارة الموظفين ستُفعّل بعد توفر معرّف علاقة الموظف الموثوق من الـAPI.</p>
        <div className="form-actions">
          <button disabled={busy || !studentId || !dueAt} className="btn btn--primary">{busy ? 'جارٍ تنفيذ الإعارة…' : 'تأكيد الإعارة'}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </LibraryModal>
  );
}
