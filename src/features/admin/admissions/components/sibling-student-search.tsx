'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import type { Student } from '@/types/student';

const MIN_QUERY_LENGTH = 2;

export function SiblingStudentSearch({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (studentId: number | null, student?: Student) => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestSeq = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value == null || value <= 0) {
      setSelectedLabel('');
      return;
    }
    let active = true;
    api
      .get<Student>(endpoints.admin.student(value), {
        active_school_id: activeSchoolId ?? undefined,
      })
      .then((res) => {
        if (!active || !res.success) return;
        setSelectedLabel(getStudentDisplayName(res.data));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, activeSchoolId]);

  useEffect(() => {
    if (!open || debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    api
      .get<Student[]>(endpoints.admin.students, {
        search: debouncedQuery,
        page: 1,
        page_size: 12,
        active_school_id: activeSchoolId ?? undefined,
      })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setResults(res.success && Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setLoading(false);
      });
  }, [debouncedQuery, open, activeSchoolId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(student: Student) {
    onChange(student.id, student);
    setSelectedLabel(getStudentDisplayName(student));
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setSelectedLabel('');
    setQuery('');
  }

  return (
    <div className="sibling-student-search" ref={wrapRef}>
      {value != null && value > 0 ? (
        <div className="sibling-student-search__selected">
          <Link href={`/admin/students/${value}`} className="sibling-student-search__link">
            {selectedLabel || `#${value}`}
          </Link>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>
            {t('common.clear')}
          </button>
        </div>
      ) : (
        <>
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t('admin.siblings.searchStudentPlaceholder')}
            autoComplete="off"
          />
          {open && query.trim().length >= MIN_QUERY_LENGTH ? (
            <div className="sibling-student-search__dropdown" role="listbox">
              {loading ? (
                <p className="sibling-student-search__hint">{t('common.loading')}</p>
              ) : results.length === 0 ? (
                <p className="sibling-student-search__hint">{t('admin.siblings.searchStudentEmpty')}</p>
              ) : (
                results.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="sibling-student-search__option"
                    role="option"
                    onClick={() => pick(student)}
                  >
                    <span dir="auto">{getStudentDisplayName(student)}</span>
                    <span className="sibling-student-search__meta mono">#{student.id}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
