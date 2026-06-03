'use client';

import { useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { ClassCard } from '@/features/teacher/class-card';
import { TeacherPageHeader, TeacherEmptyState } from '@/features/teacher/ui/teacher-primitives';
import { useResource } from '@/lib/hooks/use-resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherClassesPage() {
  const t = useT();
  const [query, setQuery] = useState('');
  const state = useResource<TeacherClass[]>(endpoints.teacher.classes);

  const filtered = useMemo(() => {
    if (!state.data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.data;
    return state.data.filter((c) => c.name.toLowerCase().includes(q));
  }, [state.data, query]);

  return (
    <div className="teacher-workspace teacher-workspace--classes">
      <TeacherPageHeader
        title={t('nav.myClasses')}
        subtitle={t('teacher.myClassesDesc')}
        actions={
          state.data && state.data.length > 2 ? (
            <input
              className="input t-search"
              type="search"
              placeholder={t('teacher.searchClasses')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('teacher.searchClasses')}
            />
          ) : undefined
        }
      />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <TeacherEmptyState icon="🏫" title={t('empty.classes')} description={t('empty.classes')} />
        }
      >
        {() =>
          filtered.length === 0 ? (
            <TeacherEmptyState
              compact
              icon="🔍"
              title={t('teacher.noClassMatch')}
              description={t('admin.adjustSearch')}
            />
          ) : (
            <div
              className="grid grid--class-cards"
              data-count={filtered.length <= 2 ? filtered.length : undefined}
            >
              {filtered.map((c) => (
                <ClassCard key={c.id} classInfo={c} variant="full" />
              ))}
            </div>
          )
        }
      </ResourceView>
    </div>
  );
}
