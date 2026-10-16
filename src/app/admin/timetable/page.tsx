'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 * Selected weekly design implemented; browser Design QA pending.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { endpoints } from '@/lib/api/endpoints';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';
import { useLocale } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import '@/features/admin/timetable/timetable-workspace.css';

type Draft = {
  draft_id: number; name: string; state: string; scope_mode: string;
  scope_class_ids?: number[]; conflict_count: number; warning_count: number;
  line_count: number; can_publish: boolean;
};
const PAGE_SIZE = 20;

export function TimetableWorkspace() {
  const { t } = useLocale();
  const user = useSession();
  const [page, setPage] = useState(1);
  const [selectedClass, setSelectedClass] = useState('');
  const drafts = useGlobalAcademicYearResource<Draft[]>(`${endpoints.admin.timetable}/drafts`, { page, limit: PAGE_SIZE });
  const known = drafts.data !== null && !drafts.error;
  const rows = drafts.data ?? [];
  const states: Record<string, 'published' | 'validated' | 'archived' | 'draft'> = { published: 'published', validated: 'validated', archived: 'archived', draft: 'draft' };
  const aside = <aside className="timetable-workspace__drafts" aria-labelledby="timetable-drafts-title" aria-busy={drafts.fetching}>
    <div className="timetable-workspace__section-head"><h2 id="timetable-drafts-title">{t('timetableWorkspace.draftsTitle')}</h2><span className="muted tiny">{t('timetableWorkspace.page')} {page}</span></div>
    <ResourceView state={drafts} isEmpty={(data) => data.length === 0} empty={<EmptyState compact title={t('timetableWorkspace.noDrafts')} />}>
      {(data) => <ul className="timetable-workspace__draft-list">{data.map((draft) => <li key={draft.draft_id}>
        <div className="timetable-workspace__draft-heading"><strong dir="auto">{draft.name}</strong><Badge tone={draft.state === 'published' ? 'green' : draft.state === 'validated' ? 'blue' : 'slate'}>{states[draft.state] ? t(`timetableWorkspace.${states[draft.state]}`) : draft.state}</Badge></div>
        <dl className="timetable-workspace__draft-counts">
          <div><dt>{t('timetableWorkspace.sessions')}</dt><dd>{draft.line_count}</dd></div>
          <div><dt>{t('timetableWorkspace.warnings')}</dt><dd>{draft.warning_count}</dd></div>
          <div><dt>{t('timetableWorkspace.conflicts')}</dt><dd>{draft.conflict_count}</dd></div>
        </dl>
        {draft.scope_class_ids?.length === 1 && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedClass(String(draft.scope_class_ids![0]))}>{t('timetableWorkspace.viewClass')}</button>}
      </li>)}</ul>}
    </ResourceView>
    <div className="timetable-workspace__pagination">
      <button type="button" className="btn btn--ghost btn--sm" disabled={page === 1 || drafts.loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('common.previous')}</button>
      <span aria-live="polite">{page}</span>
      <button type="button" className="btn btn--ghost btn--sm" disabled={drafts.loading || !!drafts.error || !drafts.data || rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>{t('common.next')}</button>
    </div>
  </aside>;
  return <div className="admin-workspace timetable-workspace">
    <PageHeader title={t('timetable.title')} subtitle={t('admin.timetableDesc')} actions={<div className="timetable-workspace__actions">
      {canViewAcademicSetup(user) && <Link className="btn btn--ghost btn--sm" href="/admin/timetable/setup">{t('timetableWorkspace.settings')}</Link>}
      <Link className="btn btn--ghost btn--sm" href="/admin/timetable/bulk">{t('timetableWorkspace.detailedEditor')}</Link>
      <Link className="btn btn--primary btn--sm" href="/admin/timetable/studio">{t('timetableWorkspace.studio')}</Link>
    </div>} />
    <section className="timetable-workspace__summary" aria-label={t('timetableWorkspace.summaryScope')} aria-busy={drafts.fetching}>
      <span className="muted tiny">{t('timetableWorkspace.summaryScope')}</span>
      <span>{t('timetableWorkspace.published')} <strong>{known ? rows.filter((d) => d.state === 'published').length : '—'}</strong></span>
      <span>{t('timetableWorkspace.drafts')} <strong>{known ? rows.filter((d) => d.state === 'draft' || d.state === 'validated').length : '—'}</strong></span>
      <span>{t('timetableWorkspace.conflicts')} <strong>{known ? rows.reduce((sum, d) => sum + d.conflict_count, 0) : '—'}</strong></span>
    </section>
    <AdminTimetablePanel initialView="week" selectedClass={selectedClass} onClassChange={setSelectedClass} aside={aside} />
  </div>;
}

export default function AdminTimetablePage() {
  const { activeAcademicYearId } = useAdminSession();
  return <RequireAdminPermission permission="view_timetable"><TimetableWorkspace key={activeAcademicYearId ?? 'none'} /></RequireAdminPermission>;
}
