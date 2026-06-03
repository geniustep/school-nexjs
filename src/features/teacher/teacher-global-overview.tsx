'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { ResourceView } from '@/components/states/resource';
import { LoadingState } from '@/components/states/states';
import {
  TeacherContentToolbar,
  TeacherEmptyState,
  TeacherPageHeader,
} from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import type { ClassTagged } from '@/features/teacher/use-teacher-class-aggregate';
import type { ResourceState } from '@/lib/hooks/use-resource';

type TeacherClassRef = { id: number; name: string };

export function TeacherOverviewGuideEmpty({
  icon,
  title,
  hint,
}: {
  icon: string;
  title: string;
  hint?: string;
}) {
  const t = useT();
  return (
    <div className="t-overview-empty">
      <TeacherEmptyState compact icon={icon} title={title} description={hint} />
      <Link href="/teacher/classes" className="btn btn--primary btn--sm">
        {t('teacher.viewMyClasses')}
      </Link>
    </div>
  );
}

export function TeacherOverviewClassLabel({
  classId,
  className,
}: {
  classId: number;
  className: string;
}) {
  return (
    <Link href={`/teacher/classes/${classId}`} className="t-overview-class">
      {className}
    </Link>
  );
}

export function TeacherOverviewLayout<T>({
  title,
  subtitle,
  classesState,
  contentLoading,
  contentError,
  items,
  emptyIcon,
  emptyTitle,
  emptyHint,
  showCreateLink = true,
  children,
}: {
  title: string;
  subtitle: string;
  classesState: ResourceState<TeacherClassRef[]>;
  contentLoading: boolean;
  contentError: string | null;
  items: ClassTagged<T>[];
  emptyIcon: string;
  emptyTitle: string;
  emptyHint: string;
  showCreateLink?: boolean;
  children: (filtered: ClassTagged<T>[]) => ReactNode;
}) {
  const t = useT();
  const [classFilter, setClassFilter] = useState('');

  const filtered = useMemo(() => {
    if (!classFilter) return items;
    return items.filter((x) => String(x.classId) === classFilter);
  }, [items, classFilter]);

  const classes = classesState.data ?? [];

  return (
    <div className="teacher-workspace teacher-workspace--overview">
      <TeacherPageHeader
        title={title}
        subtitle={subtitle}
        actions={
          showCreateLink ? (
            <Link href="/teacher/classes" className="btn btn--ghost btn--sm">
              {t('teacher.createFromClass')}
            </Link>
          ) : undefined
        }
      />

      <ResourceView
        state={classesState}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <TeacherOverviewGuideEmpty
            icon="🏫"
            title={t('empty.classes')}
            hint={t('teacher.emptyClassesHint')}
          />
        }
      >
        {() => {
          if (contentLoading) return <LoadingState label={t('common.loading')} />;
          if (contentError) {
            return (
              <TeacherOverviewGuideEmpty
                icon="!"
                title={t('errors.serverErrorTitle')}
                hint={contentError}
              />
            );
          }
          if (items.length === 0) {
            return (
              <TeacherOverviewGuideEmpty
                icon={emptyIcon}
                title={emptyTitle}
                hint={emptyHint}
              />
            );
          }

          return (
            <>
              <TeacherContentToolbar>
                {classes.length > 1 && (
                  <label className="t-overview-filter">
                    <span className="t-overview-filter__label">{t('teacher.filterByClass')}</span>
                    <select
                      className="select"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="">{t('teacher.filterAllClasses')}</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <span className="muted t-content-count">
                  {t('teacher.itemCount', { count: filtered.length })}
                </span>
              </TeacherContentToolbar>

              {filtered.length === 0 ? (
                <TeacherEmptyState
                  compact
                  icon="🔍"
                  title={t('teacher.noItemsForClass')}
                  description={t('teacher.filterAllClasses')}
                />
              ) : (
                children(filtered)
              )}
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
