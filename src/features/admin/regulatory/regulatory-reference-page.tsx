'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale } from '@/features/i18n/locale-context';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { fetchRegulatoryReferenceOverview, projectRegulatoryReferenceToCalendar } from './api';
import { regulatoryCalendarState, type RegulatoryCalendarState } from './regulatory-calendar-state';
import type { RegulatoryReferenceItem, RegulatoryReferenceOverview } from './types';
import './regulatory-reference.css';

type Copy = {
  title: string;
  subtitle: string;
  source: string;
  schoolYear: string;
  release: string;
  official: string;
  calendarDraft: string;
  notCreated: string;
  openCalendar: string;
  createDraft: string;
  creating: string;
  created: string;
  upcoming: string;
  pending: string;
  pendingHint: string;
  noUpcoming: string;
  noPending: string;
  sourcePage: string;
  sourcePages: string;
  datePending: string;
  refresh: string;
  distinctionTitle: string;
  distinctionText: string;
  loadError: string;
  missingYear: string;
  publishedAt: string;
  localReview: string;
};

const COPY: Record<'ar' | 'en' | 'fr' | 'es', Copy> = {
  ar: {
    title: 'المرجع الرسمي للسنة الدراسية',
    subtitle: 'قرارات ومواعيد الوزارة المرتبطة بالسنة الدراسية الحالية، كما وصلت من Raqeem Center.',
    source: 'المرجع الوزاري',
    schoolYear: 'السنة الدراسية',
    release: 'الإصدار',
    official: 'مرجع رسمي',
    calendarDraft: 'تقويم المؤسسة',
    notCreated: 'لم يُنشأ بعد',
    openCalendar: 'فتح تقويم المؤسسة',
    createDraft: 'إنشاء مسودة التقويم من المقرر الرسمي',
    creating: 'جارٍ إنشاء المسودة…',
    created: 'تم إنشاء مسودة التقويم للمراجعة.',
    upcoming: 'المواعيد الرسمية القادمة',
    pending: 'تواريخ رسمية بانتظار التحديد',
    pendingHint: 'تبقى هذه العناصر بالنص الرسمي كما وردت، ولا يحولها رقيم إلى تاريخ ميلادي تقديري.',
    noUpcoming: 'لا توجد مواعيد رسمية قادمة ضمن هذه السنة.',
    noPending: 'لا توجد تواريخ رسمية معلقة.',
    sourcePage: 'المصدر: الصفحة {page}',
    sourcePages: 'المصدر: الصفحات {from}–{to}',
    datePending: 'التاريخ الميلادي غير محدد رسميًا',
    refresh: 'تحديث',
    distinctionTitle: 'المرجع الرسمي ≠ تقويم المؤسسة',
    distinctionText: 'هذه الصفحة تعرض ما ورد رسميًا. عند إنشاء المسودة تُضاف العناصر المناسبة إلى تقويم المؤسسة كعناصر رسمية مقفلة، بينما تبقى أحداث المدرسة المحلية قابلة للتعديل والمراجعة قبل النشر.',
    loadError: 'تعذر تحميل المرجع الرسمي.',
    missingYear: 'اختر سنة دراسية صالحة أولًا.',
    publishedAt: 'نشر الإصدار',
    localReview: 'حالة تقويم المؤسسة موضحة أدناه.',
  },
  en: {
    title: 'Official school-year reference',
    subtitle: 'Ministry decisions and dates linked to the active school year, delivered through Raqeem Center.',
    source: 'Ministerial reference',
    schoolYear: 'School year',
    release: 'Release',
    official: 'Official reference',
    calendarDraft: 'School calendar',
    notCreated: 'Not created yet',
    openCalendar: 'Open school calendar',
    createDraft: 'Create calendar draft from official reference',
    creating: 'Creating draft…',
    created: 'Calendar draft created for review.',
    upcoming: 'Upcoming official dates',
    pending: 'Official dates awaiting confirmation',
    pendingHint: 'These items remain in their official wording and are not converted into estimated Gregorian dates.',
    noUpcoming: 'No upcoming official dates for this school year.',
    noPending: 'No official dates are pending.',
    sourcePage: 'Source: page {page}',
    sourcePages: 'Source: pages {from}–{to}',
    datePending: 'Gregorian date not officially specified',
    refresh: 'Refresh',
    distinctionTitle: 'Official reference ≠ school calendar',
    distinctionText: 'This page shows the official source. Creating a draft adds eligible items to the school calendar as locked official events while local school events remain editable and reviewable before publication.',
    loadError: 'Unable to load the official reference.',
    missingYear: 'Select a valid school year first.',
    publishedAt: 'Release published',
    localReview: 'The school calendar status is shown below.',
  },
  fr: {
    title: 'Référence officielle de l’année scolaire',
    subtitle: 'Décisions et dates ministérielles liées à l’année scolaire active, distribuées via Raqeem Center.',
    source: 'Référence ministérielle',
    schoolYear: 'Année scolaire',
    release: 'Version',
    official: 'Référence officielle',
    calendarDraft: 'Calendrier de l’établissement',
    notCreated: 'Pas encore créé',
    openCalendar: 'Ouvrir le calendrier de l’établissement',
    createDraft: 'Créer le brouillon depuis la référence officielle',
    creating: 'Création du brouillon…',
    created: 'Brouillon du calendrier créé pour révision.',
    upcoming: 'Prochaines dates officielles',
    pending: 'Dates officielles en attente de confirmation',
    pendingHint: 'Ces éléments conservent leur libellé officiel et ne sont pas convertis en dates grégoriennes estimées.',
    noUpcoming: 'Aucune date officielle à venir pour cette année scolaire.',
    noPending: 'Aucune date officielle en attente.',
    sourcePage: 'Source : page {page}',
    sourcePages: 'Source : pages {from}–{to}',
    datePending: 'Date grégorienne non fixée officiellement',
    refresh: 'Actualiser',
    distinctionTitle: 'Référence officielle ≠ calendrier de l’établissement',
    distinctionText: 'Cette page présente la source officielle. La création d’un brouillon ajoute les éléments éligibles au calendrier comme événements officiels verrouillés, tout en conservant les événements locaux modifiables avant publication.',
    loadError: 'Impossible de charger la référence officielle.',
    missingYear: 'Sélectionnez d’abord une année scolaire valide.',
    publishedAt: 'Version publiée',
    localReview: 'L’état du calendrier de l’établissement est indiqué ci-dessous.',
  },
  es: {
    title: 'Referencia oficial del curso escolar',
    subtitle: 'Decisiones y fechas ministeriales vinculadas al curso activo, distribuidas mediante Raqeem Center.',
    source: 'Referencia ministerial',
    schoolYear: 'Curso escolar',
    release: 'Versión',
    official: 'Referencia oficial',
    calendarDraft: 'Calendario del centro',
    notCreated: 'Aún no creado',
    openCalendar: 'Abrir calendario del centro',
    createDraft: 'Crear borrador desde la referencia oficial',
    creating: 'Creando borrador…',
    created: 'Borrador del calendario creado para revisión.',
    upcoming: 'Próximas fechas oficiales',
    pending: 'Fechas oficiales pendientes de confirmación',
    pendingHint: 'Estos elementos conservan su texto oficial y no se convierten en fechas gregorianas estimadas.',
    noUpcoming: 'No hay próximas fechas oficiales para este curso.',
    noPending: 'No hay fechas oficiales pendientes.',
    sourcePage: 'Fuente: página {page}',
    sourcePages: 'Fuente: páginas {from}–{to}',
    datePending: 'Fecha gregoriana no especificada oficialmente',
    refresh: 'Actualizar',
    distinctionTitle: 'Referencia oficial ≠ calendario del centro',
    distinctionText: 'Esta página muestra la fuente oficial. Al crear un borrador, los elementos aptos se añaden como eventos oficiales bloqueados y los eventos locales siguen siendo editables antes de publicar.',
    loadError: 'No se pudo cargar la referencia oficial.',
    missingYear: 'Seleccione primero un curso escolar válido.',
    publishedAt: 'Versión publicada',
    localReview: 'El estado del calendario del centro se muestra a continuación.',
  },
};

const CALENDAR_STATE_HINTS: Record<
  'ar' | 'en' | 'fr' | 'es',
  Record<RegulatoryCalendarState, string>
> = {
  ar: {
    not_created: 'لم يُنشأ تقويم المؤسسة بعد. يمكن إنشاء مسودة من المرجع الرسمي ثم مراجعتها قبل النشر.',
    draft: 'تقويم المؤسسة ما زال مسودة بانتظار المراجعة قبل الاعتماد والنشر.',
    under_review: 'تقويم المؤسسة قيد المراجعة قبل الاعتماد والنشر.',
    published: 'تم اعتماد ونشر تقويم المؤسسة.',
    archived: 'تقويم المؤسسة هذا مؤرشف ولا يمثل التقويم المنشور الحالي.',
    other: 'حالة تقويم المؤسسة موضحة أدناه. افتح التقويم لمراجعة تفاصيله.',
  },
  en: {
    not_created: 'The school calendar has not been created yet. Create a draft from the official reference and review it before publication.',
    draft: 'The school calendar is still a draft awaiting review before approval and publication.',
    under_review: 'The school calendar is under review before approval and publication.',
    published: 'The school calendar has been approved and published.',
    archived: 'This school calendar is archived and is not the currently published calendar.',
    other: 'The school calendar status is shown below. Open the calendar to review its details.',
  },
  fr: {
    not_created: 'Le calendrier de l’établissement n’a pas encore été créé. Créez un brouillon depuis la référence officielle puis révisez-le avant publication.',
    draft: 'Le calendrier de l’établissement est encore un brouillon en attente de révision avant validation et publication.',
    under_review: 'Le calendrier de l’établissement est en cours de révision avant validation et publication.',
    published: 'Le calendrier de l’établissement a été validé et publié.',
    archived: 'Ce calendrier de l’établissement est archivé et ne correspond pas au calendrier actuellement publié.',
    other: 'L’état du calendrier est indiqué ci-dessous. Ouvrez-le pour consulter ses détails.',
  },
  es: {
    not_created: 'El calendario del centro aún no se ha creado. Cree un borrador desde la referencia oficial y revíselo antes de publicarlo.',
    draft: 'El calendario del centro sigue siendo un borrador pendiente de revisión antes de su aprobación y publicación.',
    under_review: 'El calendario del centro está en revisión antes de su aprobación y publicación.',
    published: 'El calendario del centro ha sido aprobado y publicado.',
    archived: 'Este calendario del centro está archivado y no es el calendario publicado actualmente.',
    other: 'El estado del calendario se muestra a continuación. Ábralo para revisar sus detalles.',
  },
};

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(values[key] ?? ''));
}

function sourceLabel(copy: Copy, item: RegulatoryReferenceItem): string | null {
  if (!item.source_page_from) return null;
  if (item.source_page_to && item.source_page_to !== item.source_page_from) {
    return interpolate(copy.sourcePages, { from: item.source_page_from, to: item.source_page_to });
  }
  return interpolate(copy.sourcePage, { page: item.source_page_from });
}

function dateLabel(
  item: RegulatoryReferenceItem,
  formatDate: (value?: string | null) => string,
  copy: Copy,
): string {
  if (!item.date_from) return item.official_date_text || copy.datePending;
  const start = formatDate(item.date_from);
  if (!item.date_to || item.date_to === item.date_from) return start;
  return `${start} – ${formatDate(item.date_to)}`;
}

function ReferenceItems({
  items,
  pending,
  copy,
  formatDate,
}: {
  items: RegulatoryReferenceItem[];
  pending?: boolean;
  copy: Copy;
  formatDate: (value?: string | null) => string;
}) {
  if (items.length === 0) {
    return <div className="regulatory-reference__empty">{pending ? copy.noPending : copy.noUpcoming}</div>;
  }

  return (
    <div className="regulatory-reference__items">
      {items.map((item) => {
        const source = sourceLabel(copy, item);
        return (
          <article className="regulatory-reference__item" key={item.public_id}>
            <div className="regulatory-reference__item-date" dir="auto">
              {dateLabel(item, formatDate, copy)}
            </div>
            <div className="regulatory-reference__item-main">
              <strong dir="auto">{item.title}</strong>
              <div className="regulatory-reference__item-meta">
                <span>{item.code}</span>
                {source ? <span>{source}</span> : null}
              </div>
              {pending && item.official_date_text ? (
                <p className="regulatory-reference__official-text" dir="auto">
                  {item.official_date_text}
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function RegulatoryReferencePage() {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const { formatDate } = useFormat();
  const toast = useToast();
  const user = useSession();
  const {
    activeAcademicYearId,
    academicYears,
    academicYearLoading,
    academicYearError,
  } = useAdminSession();
  const [overview, setOverview] = useState<RegulatoryReferenceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projecting, setProjecting] = useState(false);

  const activeYear = useMemo(
    () => academicYears.find((year) => year.id === activeAcademicYearId) ?? null,
    [academicYears, activeAcademicYearId],
  );

  const canCreate = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_timetable',
    capability: 'manage_timetable',
  });

  const load = useCallback(async () => {
    if (activeAcademicYearId == null) {
      setOverview(null);
      setError(academicYearError?.message ?? copy.missingYear);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchRegulatoryReferenceOverview(activeAcademicYearId);
    if (!res.success) {
      setOverview(null);
      setError(res.error.message || copy.loadError);
      setLoading(false);
      return;
    }
    setOverview(res.data);
    setLoading(false);
  }, [activeAcademicYearId, academicYearError?.message, copy.loadError, copy.missingYear]);

  useEffect(() => {
    if (academicYearLoading) return;
    void load();
  }, [academicYearLoading, load]);

  async function createProjection() {
    if (activeAcademicYearId == null || projecting) return;
    setProjecting(true);
    const res = await projectRegulatoryReferenceToCalendar(activeAcademicYearId);
    setProjecting(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(copy.created);
    await load();
  }

  const references = overview?.release.source_reference_numbers.filter(Boolean) ?? [];
  const primaryReference = references[0] ?? '—';
  const calendarState = regulatoryCalendarState(
    overview?.projection.calendar_id,
    overview?.projection.state,
  );
  const calendarHint = CALENDAR_STATE_HINTS[locale][calendarState] ?? copy.localReview;

  return (
    <RequireAdminPermission permission="view_timetable">
      <div className="admin-workspace regulatory-reference">
        <PageHeader
          title={copy.title}
          subtitle={copy.subtitle}
          actions={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void load()} disabled={loading}>
              {copy.refresh}
            </button>
          }
        />

        {error ? <div className="regulatory-reference__alert regulatory-reference__alert--error">{error}</div> : null}
        {loading || academicYearLoading ? (
          <div className="regulatory-reference__loading">…</div>
        ) : overview ? (
          <>
            <section className="regulatory-reference__hero">
              <div>
                <span className="regulatory-reference__eyebrow">{copy.official}</span>
                <h2 dir="auto">{primaryReference}</h2>
                <p>{calendarHint}</p>
              </div>
              <div className="regulatory-reference__hero-actions">
                {overview.projection.calendar_id ? (
                  <Link className="btn btn--primary btn--sm" href={`/admin/academic-calendars/${overview.projection.calendar_id}`}>
                    {copy.openCalendar}
                  </Link>
                ) : canCreate ? (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => void createProjection()} disabled={projecting}>
                    {projecting ? copy.creating : copy.createDraft}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="regulatory-reference__facts" aria-label={copy.official}>
              <div className="regulatory-reference__fact">
                <span>{copy.source}</span>
                <strong dir="auto">{references.length ? references.join(' · ') : '—'}</strong>
              </div>
              <div className="regulatory-reference__fact">
                <span>{copy.schoolYear}</span>
                <strong dir="auto">{activeYear?.name ?? activeYear?.code ?? '—'}</strong>
              </div>
              <div className="regulatory-reference__fact">
                <span>{copy.release}</span>
                <strong dir="auto">{overview.release.publication_version || '—'}</strong>
              </div>
              <div className="regulatory-reference__fact">
                <span>{copy.calendarDraft}</span>
                {overview.projection.calendar_id ? (
                  <strong><WorkflowBadge state={overview.projection.state ?? 'draft'} /></strong>
                ) : (
                  <strong>{copy.notCreated}</strong>
                )}
              </div>
              {overview.release.published_at ? (
                <div className="regulatory-reference__fact">
                  <span>{copy.publishedAt}</span>
                  <strong>{formatDate(overview.release.published_at.slice(0, 10))}</strong>
                </div>
              ) : null}
            </section>

            <section className="regulatory-reference__note">
              <strong>{copy.distinctionTitle}</strong>
              <p>{copy.distinctionText}</p>
            </section>

            <div className="regulatory-reference__columns">
              <section className="regulatory-reference__panel">
                <div className="regulatory-reference__section-heading">
                  <h2>{copy.upcoming}</h2>
                  <span>{overview.upcoming.length}</span>
                </div>
                <ReferenceItems items={overview.upcoming} copy={copy} formatDate={formatDate} />
              </section>

              <section className="regulatory-reference__panel regulatory-reference__panel--pending">
                <div className="regulatory-reference__section-heading">
                  <h2>{copy.pending}</h2>
                  <span>{overview.pending_official_dates.length}</span>
                </div>
                <p className="regulatory-reference__hint">{copy.pendingHint}</p>
                <ReferenceItems
                  items={overview.pending_official_dates}
                  pending
                  copy={copy}
                  formatDate={formatDate}
                />
              </section>
            </div>
          </>
        ) : null}
      </div>
    </RequireAdminPermission>
  );
}
