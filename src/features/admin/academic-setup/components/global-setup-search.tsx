'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/features/i18n/locale-context';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import { globalSetupSearch, buildHref } from '../utils/search';

export function GlobalSetupSearch({
  levels,
  classes,
  subjects,
  teachers,
}: {
  levels: Level[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
}) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(
    () => globalSetupSearch(query, levels, classes, subjects, teachers),
    [query, levels, classes, subjects, teachers],
  );

  const navigate = useCallback(
    (href: string, queryParams?: Record<string, string>) => {
      router.push(buildHref(href, queryParams));
      setOpen(false);
      setQuery('');
    },
    [router],
  );

  return (
    <div className="academic-setup-search">
      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={t('admin.academicSetup.searchPlaceholder')}
        aria-label={t('admin.academicSetup.searchPlaceholder')}
        aria-expanded={open && results.length > 0}
      />
      {open && query.length >= 2 && (
        <div className="academic-setup-search__results" role="listbox">
          {results.length === 0 ? (
            <p className="muted tiny" style={{ padding: 12 }}>
              {t('admin.academicSetup.searchEmpty')}
            </p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="academic-setup-search__item"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => navigate(r.href, r.query)}
              >
                <strong>{r.label}</strong>
                {r.hint && <span className="tiny muted"> · {r.hint}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
