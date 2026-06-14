'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { normalizeGuardianList } from '../utils/normalize-guardian';
import type { GuardianSummary } from '@/types/student-360';

export function GuardianSearchPanel({
  studentId,
  onSelect,
}: {
  studentId: number;
  onSelect: (guardian: GuardianSummary) => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GuardianSummary[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    let active = true;
    setLoading(true);
    setSearched(true);

    api
      .get<GuardianSummary[]>(endpoints.admin.guardiansSearch, {
        q: debouncedQuery,
        page: 1,
        page_size: 20,
        exclude_student_id: studentId,
        active_school_id: activeSchoolId ?? undefined,
      })
      .then((res) => {
        if (!active) return;
        setResults(res.success ? normalizeGuardianList(res.data) : []);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, studentId, activeSchoolId]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('admin.student360.searchGuardianPlaceholder')}
        autoFocus
      />
      {loading && <p className="tiny muted">{t('common.loading')}</p>}
      {!loading && searched && results.length === 0 && (
        <p className="tiny muted">{t('admin.student360.searchGuardianEmpty')}</p>
      )}
      <div className="col" style={{ gap: 8 }}>
        {results.map((g) => (
          <div key={g.id} className="between card" style={{ padding: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <strong>{g.name}</strong>
              {g.phone && <span className="tiny mono muted">{g.phone}</span>}
              {g.email && <span className="tiny muted">{g.email}</span>}
              {g.children_count != null && (
                <span className="tiny muted">
                  {t('admin.student360.childrenCount', { count: g.children_count })}
                </span>
              )}
            </div>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onSelect(g)}>
              {t('admin.student360.selectGuardian')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
