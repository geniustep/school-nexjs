'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useState } from 'react';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { PageHeader } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { useLocale } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

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
          <p className="text-sm text-[var(--muted-foreground)]">{fr ? 'Consultez les états des brouillons et ouvrez le studio pour les modifier.' : 'تابع حالات المسودات وافتح الاستوديو لتعديلها وفق الصلاحيات.'}</p>
        </div>
        <Link href="/admin/timetable/studio" className="btn btn--primary btn--sm">{fr ? 'Ouvrir le studio' : 'فتح الاستوديو'}</Link>
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
               {draft.scope_mode === 'classes' && draft.scope_class_ids?.length === 1 ? (
                 <Link className="btn btn--ghost btn--sm" href="/admin/timetable/studio">
                   {fr ? 'Voir dans le studio' : 'عرض في الاستوديو'}
                 </Link>
               ) : <Link className="btn btn--ghost btn--sm" href="/admin/timetable/studio">{fr ? 'Ouvrir le studio' : 'فتح الاستوديو'}</Link>}
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
  const user = useSession();
  const canManage = hasPermission(user, 'manage_timetable');

  return (
    <RequireAdminPermission permission="view_timetable">
      <div className="admin-workspace">
        <PageHeader title={t('timetable.title')} subtitle={t('admin.timetableDesc')} />
        <nav aria-label="إجراءات استعمال الزمان" className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {canManage ? (
            <Link href="/admin/timetable/setup" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
              <span aria-hidden="true" className="text-xl">⚙️</span>
              <strong className="text-base">إعداد الأيام والفترات</strong>
              <span className="text-sm text-[var(--muted-foreground)]">ضبط أيام الدراسة والحصص والاستراحات دون اختيار قسم.</span>
            </Link>
          ) : null}
          <Link href="/admin/timetable/studio" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
            <span aria-hidden="true" className="text-xl">🧩</span>
            <strong className="text-base">استوديو استعمال الزمان V3</strong>
            <span className="text-sm text-[var(--muted-foreground)]">تحرير شبكة القسم الأسبوعية وحفظ مسودتها، ثم التحقق منها ونشرها حسب الصلاحيات.</span>
          </Link>
          <Link href="/admin/timetable/bulk" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
            <span aria-hidden="true" className="text-xl">📅</span>
            <strong className="text-base">تحرير حصص الأقسام</strong>
            <span className="text-sm text-[var(--muted-foreground)]">اختيار القسم وتحرير مسودة حصصه حسب الإسنادات.</span>
          </Link>
          <a href="#timetable-overview" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
            <span aria-hidden="true" className="text-xl">🗓️</span>
            <strong className="text-base">عرض استعمال الزمان</strong>
            <span className="text-sm text-[var(--muted-foreground)]">الانتقال إلى العرض الحالي أسفل الصفحة.</span>
          </a>
        </nav>
        <CentralDrafts />
        <section id="timetable-overview" aria-label="عرض استعمال الزمان" className="scroll-mt-8">
          <AdminTimetablePanel />
        </section>
      </div>
    </RequireAdminPermission>
  );
}
