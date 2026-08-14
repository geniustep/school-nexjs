'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { buildGlobalAcademicYearQuery } from '@/features/academic-context/utils/global-academic-year-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Student } from '@/types/student';
import { isLibraryDueAtFuture, minimumLibraryDueAt } from './library-dates';
import { LibraryModal } from './library-ui';
import type { LibraryCopyRow } from './library-contract';

export type LibraryCheckoutValues = {
  studentId: number;
  dueAt: string;
  notes: string;
};

export function libraryStudentLabel(student: Student): string {
  const name = student.full_name || student.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || `#${student.id}`;
  const ref = student.school_number || student.code || student.massar_code || student.matricule;
  return ref ? `${name} — ${ref}` : name;
}

function studentReference(student: Student): string | null {
  return student.school_number || student.code || student.massar_code || student.matricule || null;
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [dueError, setDueError] = useState('');
  const [minimumDue] = useState(() => minimumLibraryDueAt());
  const [notes, setNotes] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmedSearch = useMemo(() => search.trim(), [search]);
  const dueInvalid = Boolean(dueAt) && !isLibraryDueAtFuture(dueAt);

  useEffect(() => {
    if (selectedStudent || trimmedSearch.length < 2 || activeAcademicYearId == null) {
      setStudents([]);
      setStudentError('');
      setLoadingStudents(false);
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
            page_size: 8,
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
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeAcademicYearId, activeSchoolId, selectedStudent, trimmedSearch]);

  function chooseStudent(student: Student) {
    setSelectedStudent(student);
    setStudents([]);
    setSearch('');
    setStudentError('');
  }

  function changeStudent() {
    setSelectedStudent(null);
    setSearch('');
    setStudents([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudent || !dueAt || busy) return;
    if (!isLibraryDueAtFuture(dueAt)) {
      setDueError('اختر موعد إرجاع بعد وقت الإعارة الحالي.');
      return;
    }
    setDueError('');
    setBusy(true);
    try {
      await onSubmit({ studentId: Number(selectedStudent.id), dueAt, notes });
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
          {selectedStudent ? (
            <div className="library-selected-student" aria-live="polite">
              <div className="library-selected-student__identity">
                <strong dir="auto">{selectedStudent.full_name || selectedStudent.name || [selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(' ') || `#${selectedStudent.id}`}</strong>
                {studentReference(selectedStudent) ? <span><bdi dir="auto">{studentReference(selectedStudent)}</bdi></span> : null}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={changeStudent}>تغيير</button>
            </div>
          ) : (
            <>
              <input
                id="library-checkout-student-search"
                className="input"
                dir="auto"
                autoComplete="off"
                placeholder="اكتب اسم التلميذ أو رقمه"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <p className="library-form-note">اكتب حرفين على الأقل، ثم اضغط مباشرة على التلميذ المطلوب.</p>
            </>
          )}
        </div>

        {!selectedStudent && loadingStudents ? <p className="library-form-status">جارٍ البحث…</p> : null}
        {!selectedStudent && studentError ? <p className="library-form-error">{studentError}</p> : null}

        {!selectedStudent && trimmedSearch.length >= 2 && !loadingStudents && !studentError && students.length === 0 ? (
          <p className="library-form-status">لا يوجد تلميذ مطابق لهذا البحث.</p>
        ) : null}

        {!selectedStudent && students.length > 0 ? (
          <div className="library-student-results" role="listbox" aria-label="نتائج البحث عن التلاميذ">
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                role="option"
                aria-selected="false"
                className="library-student-option"
                onClick={() => chooseStudent(student)}
              >
                <span className="library-student-option__name" dir="auto">{student.full_name || student.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || `#${student.id}`}</span>
                {studentReference(student) ? <span className="library-student-option__ref"><bdi dir="auto">{studentReference(student)}</bdi></span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="library-checkout-due">موعد إرجاع الكتاب</label>
          <input
            id="library-checkout-due"
            required
            type="datetime-local"
            className="input"
            dir="ltr"
            min={minimumDue}
            aria-invalid={dueInvalid || Boolean(dueError)}
            value={dueAt}
            onChange={(event) => { setDueAt(event.target.value); setDueError(''); }}
          />
          {dueInvalid || dueError ? <p className="library-form-error">{dueError || 'موعد إرجاع الكتاب يجب أن يكون بعد وقت الإعارة الحالي.'}</p> : null}
        </div>

        <div className="field">
          <label htmlFor="library-checkout-notes">ملاحظات</label>
          <textarea id="library-checkout-notes" className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </div>
        <p className="library-form-note">إعارة الموظفين ستُفعّل بعد توفر معرّف علاقة الموظف الموثوق من الـAPI.</p>
        <div className="form-actions">
          <button disabled={busy || !selectedStudent || !dueAt || dueInvalid} className="btn btn--primary">{busy ? 'جارٍ تنفيذ الإعارة…' : 'تأكيد الإعارة'}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </LibraryModal>
  );
}
