'use client';

import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { ACTIVE_KANBAN_STATES, CLOSED_KANBAN_STATES } from '../utils/admission-labels';
import { AdmissionCard } from './admission-card';
import type { AdmissionListItem } from '@/types/admission';

export function AdmissionsKanban({
  items,
  showClosed,
}: {
  items: AdmissionListItem[];
  showClosed: boolean;
}) {
  const t = useT();
  const columns = showClosed
    ? [...ACTIVE_KANBAN_STATES, ...CLOSED_KANBAN_STATES]
    : ACTIVE_KANBAN_STATES;

  const grouped = columns.map((state) => ({
    state,
    items: items.filter((item) => item.state === state),
  }));

  if (!items.length) {
    return (
      <EmptyState
        icon="📋"
        title={t('admin.admissions.empty.title')}
        description={t('admin.admissions.empty.description')}
      />
    );
  }

  return (
    <div className="admissions-kanban">
      {grouped.map(({ state, items: columnItems }) => (
        <section key={state} className="admissions-kanban__column" aria-label={state}>
          <header className="admissions-kanban__column-header">
            <span>{t(`admin.admissions.states.${state}`)}</span>
            <span className="badge badge--slate">{columnItems.length}</span>
          </header>
          <div className="admissions-kanban__column-body">
            {columnItems.length === 0 ? (
              <span className="tiny muted">{t('admin.admissions.kanban.emptyColumn')}</span>
            ) : (
              columnItems.map((item) => <AdmissionCard key={item.id} item={item} />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
