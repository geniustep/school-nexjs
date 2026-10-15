'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useState } from 'react';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { endpoints } from '@/lib/api/endpoints';
import { PageHeader } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';
import { useLocale } from '@/features/i18n/locale-context';

type Draft = {
  draft_id: number;
  name: string;
  state: string;
  scope_mode: string;
  scope_class_ids?: number[];
  conflict_count: number;
  warning_count: number;
  line_count: number;
  can_publish: boolean;
};

const PAGE_SIZE = 20;

function CentralDrafts() {
  const { locale } = useLocale();
  const fr = locale === 'fr';
  const [page, setPage] = useState(1);
  const drafts = useGlobalAcademicYearResource<Draft[]>(
    `${endpoints.admin.timetable}/drafts`,
    { page, limit: PAGE_SIZE },
  );
  const stateLabel = (value: string) => {
    const labels: Record<string, [string, string]> = {
      draft: ['مسودة', 'Brouillon'],
      validated: ['تم التحقق', 'Validé'],
      published: ['منشور', 'Publié'],
      archived: ['مؤرشف', 'Archivé'],
    };
    const translation = labels[value];
    return translation ? translation[fr ? 1 : 0] : value;
  };
  return (
    <section id="timetable-drafts" className="mb-8 scroll-mt-8" aria-label={fr ? 'Brouillons des emplois du temps' : 'مسودات استعمال الزمن'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{fr ? 'Brouillons des emplois du temps' : 'مسودات استعمال الزمن'}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{fr ? 'Consultez les états des brouillons de votre établissement.' : 'تابع حالات المسودات حسب السنة الدراسية والصلاحيات.'}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {drafts.loading ? <p role="status" className="p-5 text-sm">{fr ? 'Chargement des brouillons…' : 'جارٍ تحميل المسودات…'}</p> :
         drafts.error ? <div className="flex flex-wrap items-center gap-3 p-5"><p role="alert">{fr ? 'Impossible de charger les brouillons.' : 'تعذر تحميل المسودات.'}</p><button type="button" className="btn btn--ghost btn--sm" onClick={() => drafts.reload()}>{fr ? 'Réessayer' : 'إعادة المحاولة'}</button></div> :
         !drafts.data?.length ? <p className="p-5 text-sm text-[var(--muted-foreground)]">{fr ? 'Aucun brouillon pour cette année scolaire.' : 'لا توجد مسودات لهذه السنة الدراسية.'}</p> :
         <ul className="divide-y divide-[var(--border)]">
           {drafts.data.map((draft) => (
             <li key={draft.draft_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
               <div className="min-w-0">
                 <p className="font-medium" dir="auto">{draft.name}</p>
                 <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                   {stateLabel(draft.state)} · {draft.line_count} {fr ? 'séances' : 'حصص'} · {draft.warning_count} {fr ? 'avertissements' : 'تنبيهات'} · {draft.conflict_count} {fr ? 'conflits' : 'تعارضات'}
                 </p>
               </div>

             </li>
           ))}
         </ul>}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        <button type="button" className="btn btn--ghost btn--sm" disabled={page === 1 || drafts.loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>{fr ? 'Précédent' : 'السابق'}</button>
        <span className="text-sm">{fr ? 'Page' : 'الصفحة'} {page}</span>
        <button type="button" className="btn btn--ghost btn--sm" disabled={drafts.loading || !drafts.data || drafts.data.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>{fr ? 'Suivant' : 'التالي'}</button>
      </div>
    </section>
  );
}

export default function AdminTimetablePage() {
  const { t } = useLocale();

  return (
    <RequireAdminPermission permission="view_timetable">
      <div className="admin-workspace">
        <PageHeader title={t('timetable.title')} subtitle={t('admin.timetableDesc')} />
        <CentralDrafts />
        <AdminTimetablePanel />
      </div>
    </RequireAdminPermission>
  );
}
