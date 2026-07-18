'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Admin Teaching Stage 9 — review queue, official publication, print/archive,
 * exports, and period closure. Backend remains SoT for all business rules.
 */

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiErrorView,
  EmptyState,
  LoadingState,
  PermissionDeniedState,
} from '@/components/states/states';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { NumericText } from '@/components/ui/numeric-text';
import { PageHeader } from '@/components/ui/primitives';
import { AcademicContextFilters } from '@/features/academic-context';
import {
  approveDocumentOfficial,
  archivePublication,
  authorizePeriodException,
  closeTeachingPeriod,
  createTeachingExport,
  fetchAdminArchive,
  fetchAdminReviewQueue,
  fetchClosureEvents,
  fetchDocumentVersions,
  fetchExportStatus,
  fetchPeriodClosurePreview,
  fetchPeriodClosures,
  fetchPeriodExceptions,
  markDocumentReviewed,
  reopenTeachingPeriod,
  requestDocumentChanges,
} from '@/features/admin/teaching-review-publication/api/admin-review-publication-api';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { downloadTeachingBinary } from '@/features/teaching-review-publication/review-publication-download';
import { teachingStage9ErrorMessageKey } from '@/features/teaching-review-publication/review-publication-errors';
import {
  closureScopeMessageKey,
  closureStateMessageKey,
  documentTypeMessageKey,
  exportFormatMessageKey,
  exportStatusMessageKey,
  printLocaleMessageKey,
  publicationStatusMessageKey,
  reviewStateMessageKey,
} from '@/features/teaching-review-publication/review-publication-labels';
import {
  buildAdminReviewPublicationHref,
  parseAdminReviewPublicationQuery,
} from '@/features/teaching-review-publication/review-publication-url';
import { endpoints } from '@/lib/api/endpoints';
import {
  canApproveTeachingOfficialPublication,
  canAuthorizeTeachingPeriodException,
  canCloseTeachingPeriod,
  canExportTeaching,
  canManageTeachingArchive,
  canManageTeachingReviews,
  canOfficialPrintTeaching,
  canReopenTeachingPeriod,
  canSeeTeachingReviewPublication,
  canViewTeachingArchive,
  canViewTeachingReviewQueue,
} from '@/lib/permissions/teaching-planning';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { ApiErrorBody } from '@/types/api';
import type {
  AdminReviewPublicationTab,
  TeachingArchiveItem,
  TeachingClosureEvent,
  TeachingClosurePreview,
  TeachingDocumentVersionsPayload,
  TeachingExportFormat,
  TeachingExportRequest,
  TeachingPeriodClosure,
  TeachingPeriodException,
  TeachingPrintLocale,
  TeachingReviewQueueItem,
  TeachingReviewQueuePayload,
} from '@/types/teaching-review-publication';
import {
  TEACHING_DOCUMENT_TYPES,
  TEACHING_EXPORT_FORMATS,
  TEACHING_EXPORT_LIMITS,
} from '@/types/teaching-review-publication';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';
import '@/features/admin/teaching-review-publication/review-publication.css';

const EMPTY_SELECTION: AcademicContextSelection = {
  academicYearId: '',
  cycleId: '',
  levelId: '',
  trackId: '',
  teachingLanguageId: '',
  subjectId: '',
  offeringId: '',
  referenceId: '',
  termId: '',
  classId: '',
};

type DialogKind =
  | null
  | 'mark_reviewed'
  | 'request_changes'
  | 'approve'
  | 'archive'
  | 'close'
  | 'reopen'
  | 'exception';

function errorMessage(
  t: (key: string) => string,
  error: ApiErrorBody | null,
): string {
  if (!error) return t('teachingReviewPublication.errors.generic');
  const key = teachingStage9ErrorMessageKey(error.code);
  const localized = t(key);
  return localized === key
    ? error.message || t('teachingReviewPublication.errors.generic')
    : localized;
}

export function AdminReviewPublicationPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsed = parseAdminReviewPublicationQuery(searchParams);

  const canSee = canSeeTeachingReviewPublication(user);
  const canViewQueue = canViewTeachingReviewQueue(user);
  const canManage = canManageTeachingReviews(user);
  const canApprove = canApproveTeachingOfficialPublication(user);
  const canPrintOfficial = canOfficialPrintTeaching(user);
  const canArchiveView = canViewTeachingArchive(user);
  const canArchiveManage = canManageTeachingArchive(user);
  const canExport = canExportTeaching(user);
  const canClose = canCloseTeachingPeriod(user);
  const canReopen = canReopenTeachingPeriod(user);
  const canException = canAuthorizeTeachingPeriodException(user);

  const [selection, setSelection] = useState<AcademicContextSelection>(() => ({
    ...EMPTY_SELECTION,
    academicYearId: parsed.academicYearId,
    termId: parsed.termId,
  }));
  const [tab, setTab] = useState<AdminReviewPublicationTab>(parsed.tab);
  const [documentType, setDocumentType] = useState(parsed.documentType);
  const [reviewState, setReviewState] = useState(parsed.reviewState);
  const [archiveStatus, setArchiveStatus] = useState(parsed.status);
  const [page, setPage] = useState(parsed.page);

  const [queue, setQueue] = useState<TeachingReviewQueuePayload | null>(null);
  const [archive, setArchive] = useState<{
    items: TeachingArchiveItem[];
    total: number;
  } | null>(null);
  const [closures, setClosures] = useState<TeachingPeriodClosure[]>([]);
  const [preview, setPreview] = useState<TeachingClosurePreview | null>(null);
  const [exportRequest, setExportRequest] = useState<TeachingExportRequest | null>(null);
  const [versions, setVersions] = useState<TeachingDocumentVersionsPayload | null>(null);
  const [events, setEvents] = useState<TeachingClosureEvent[]>([]);
  const [exceptions, setExceptions] = useState<TeachingPeriodException[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [activeItem, setActiveItem] = useState<TeachingReviewQueueItem | null>(null);
  const [activeArchive, setActiveArchive] = useState<TeachingArchiveItem | null>(null);
  const [activeClosure, setActiveClosure] = useState<TeachingPeriodClosure | null>(null);
  const [reason, setReason] = useState('');
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [scopeType, setScopeType] = useState<'term' | 'academic_year'>('term');
  const [exportType, setExportType] = useState<TeachingExportFormat>('pdf');
  const [exportLocale, setExportLocale] = useState<TeachingPrintLocale>('ar');
  const [exceptionAction, setExceptionAction] = useState('correct');
  const [exceptionDocType, setExceptionDocType] = useState('homework');
  const [exceptionDocId, setExceptionDocId] = useState('');
  const [mutating, setMutating] = useState(false);
  const requestSeq = useRef(0);

  const syncUrl = useCallback(
    (next: {
      tab?: AdminReviewPublicationTab;
      page?: number;
      documentType?: string;
      reviewState?: string;
      status?: string;
      academicYearId?: string;
      termId?: string;
    }) => {
      const href = buildAdminReviewPublicationHref({
        academicYearId: next.academicYearId ?? selection.academicYearId,
        termId: next.termId ?? selection.termId,
        documentType: next.documentType ?? documentType,
        reviewState: next.reviewState ?? reviewState,
        status: next.status ?? archiveStatus,
        tab: next.tab ?? tab,
        page: next.page ?? page,
        returnTo: parsed.returnTo,
      });
      router.replace(href, { scroll: false });
    },
    [
      archiveStatus,
      documentType,
      page,
      parsed.returnTo,
      reviewState,
      router,
      selection.academicYearId,
      selection.termId,
      tab,
    ],
  );

  const loadQueue = useCallback(async () => {
    if (!canViewQueue) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await fetchAdminReviewQueue({
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
      document_type: documentType || undefined,
      review_state: reviewState || undefined,
      page,
      page_size: 50,
    });
    if (seq !== requestSeq.current) return;
    setLoading(false);
    if (!res.success) {
      setQueue(null);
      setError(res.error);
      return;
    }
    setQueue(res.data);
  }, [canViewQueue, documentType, page, reviewState, selection.academicYearId]);

  const loadArchive = useCallback(async () => {
    if (!canArchiveView) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await fetchAdminArchive({
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
      period_id: selection.termId ? Number(selection.termId) : undefined,
      document_type: documentType || undefined,
      status: archiveStatus || undefined,
      page,
      page_size: 50,
    });
    if (seq !== requestSeq.current) return;
    setLoading(false);
    if (!res.success) {
      setArchive(null);
      setError(res.error);
      return;
    }
    setArchive({
      items: res.data.items,
      total: res.data.pagination.total,
    });
  }, [
    archiveStatus,
    canArchiveView,
    documentType,
    page,
    selection.academicYearId,
    selection.termId,
  ]);

  const loadClosures = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await fetchPeriodClosures({
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
      page: 1,
      page_size: 50,
    });
    if (seq !== requestSeq.current) return;
    setLoading(false);
    if (!res.success) {
      setClosures([]);
      setError(res.error);
      return;
    }
    setClosures(res.data.items);
  }, [selection.academicYearId]);

  useEffect(() => {
    if (!canSee) return;
    if (tab === 'queue' || tab === 'publications') void loadQueue();
    if (tab === 'archive' || tab === 'publications') void loadArchive();
    if (tab === 'closure') void loadClosures();
  }, [canSee, loadArchive, loadClosures, loadQueue, tab]);

  useEffect(() => {
    setSelection((prev) => ({
      ...prev,
      academicYearId: parsed.academicYearId || prev.academicYearId,
      termId: parsed.termId || prev.termId,
    }));
    setTab(parsed.tab);
    setDocumentType(parsed.documentType);
    setReviewState(parsed.reviewState);
    setArchiveStatus(parsed.status);
    setPage(parsed.page);
  }, [parsed.academicYearId, parsed.documentType, parsed.page, parsed.reviewState, parsed.status, parsed.tab, parsed.termId]);

  async function openVersions(item: TeachingReviewQueueItem) {
    setActiveItem(item);
    setVersions(null);
    const res = await fetchDocumentVersions(item.document_type, item.document_id);
    if (!res.success) {
      setLiveMessage(errorMessage(t, res.error));
      return;
    }
    setVersions(res.data);
  }

  async function runMutation(action: () => Promise<ApiResponseLike>) {
    if (mutating) return;
    setMutating(true);
    setLiveMessage('');
    try {
      const res = await action();
      if (!res.success) {
        setLiveMessage(errorMessage(t, res.error));
        return;
      }
      setDialog(null);
      setReason('');
      setAcknowledgeWarnings(false);
      setLiveMessage(t('teachingReviewPublication.live.success'));
      if (tab === 'queue' || tab === 'publications') await loadQueue();
      if (tab === 'archive' || tab === 'publications') await loadArchive();
      if (tab === 'closure') await loadClosures();
    } finally {
      setMutating(false);
    }
  }

  type ApiResponseLike =
    | { success: true; data?: unknown }
    | { success: false; error: ApiErrorBody };

  async function handleDownloadDraft(
    item: TeachingReviewQueueItem,
    locale: TeachingPrintLocale,
  ) {
    setLiveMessage(t('teachingReviewPublication.print.draftLabel'));
    const result = await downloadTeachingBinary(
      endpoints.admin.teachingDocumentDraftPrint(item.document_type, item.document_id),
      `draft-${item.document_type}-${item.document_id}-${locale}.pdf`,
      { locale },
    );
    setLiveMessage(
      result.ok
        ? t('teachingReviewPublication.live.downloadReady')
        : errorMessage(t, {
            code: result.code ?? result.reason,
            message: result.message ?? '',
          }),
    );
  }

  async function handleDownloadOfficial(
    publicationId: number,
    locale: TeachingPrintLocale,
    allowed: boolean,
  ) {
    if (!allowed || !canPrintOfficial) {
      setLiveMessage(t('teachingReviewPublication.errors.officialPrintForbidden'));
      return;
    }
    const result = await downloadTeachingBinary(
      endpoints.admin.teachingPublicationDownload(publicationId),
      `official-${publicationId}-${locale}.pdf`,
      { locale },
    );
    setLiveMessage(
      result.ok
        ? t('teachingReviewPublication.live.downloadReady')
        : errorMessage(t, {
            code: result.code ?? result.reason,
            message: result.message ?? '',
          }),
    );
  }

  async function handleCreateExport() {
    if (!canExport || mutating) return;
    setMutating(true);
    setLiveMessage('');
    const res = await createTeachingExport({
      export_type: exportType,
      locale: exportLocale,
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
      period_id: selection.termId ? Number(selection.termId) : undefined,
      document_types: documentType ? [documentType] : undefined,
    });
    setMutating(false);
    if (!res.success) {
      setLiveMessage(errorMessage(t, res.error));
      return;
    }
    setExportRequest(res.data);
    setLiveMessage(t(exportStatusMessageKey(res.data.status)));
  }

  async function handleRefreshExport() {
    if (!exportRequest) return;
    const res = await fetchExportStatus(exportRequest.id);
    if (!res.success) {
      setLiveMessage(errorMessage(t, res.error));
      return;
    }
    setExportRequest(res.data);
  }

  async function handleDownloadExport() {
    if (!exportRequest?.download_ready || exportRequest.status !== 'ready') {
      setLiveMessage(t('teachingReviewPublication.errors.exportNotReady'));
      return;
    }
    const result = await downloadTeachingBinary(
      endpoints.admin.teachingExportDownload(exportRequest.id),
      `teaching-export-${exportRequest.id}.${exportRequest.export_type === 'zip' ? 'zip' : exportRequest.export_type === 'csv' ? 'csv' : exportRequest.export_type === 'json_audit' ? 'json' : 'pdf'}`,
    );
    setLiveMessage(
      result.ok
        ? t('teachingReviewPublication.live.downloadReady')
        : errorMessage(t, {
            code: result.code ?? result.reason,
            message: result.message ?? '',
          }),
    );
  }

  async function handleLoadPreview() {
    if (!canClose || !selection.academicYearId) return;
    if (scopeType === 'term' && !selection.termId) {
      setLiveMessage(t('teachingReviewPublication.closure.termRequired'));
      return;
    }
    setLoading(true);
    const res = await fetchPeriodClosurePreview({
      academic_year_id: Number(selection.academicYearId),
      scope_type: scopeType,
      term_id: scopeType === 'term' ? Number(selection.termId) : undefined,
    });
    setLoading(false);
    if (!res.success) {
      setPreview(null);
      setLiveMessage(errorMessage(t, res.error));
      return;
    }
    setPreview(res.data);
  }

  async function loadClosureDetails(closure: TeachingPeriodClosure) {
    setActiveClosure(closure);
    const [eventsRes, exceptionsRes] = await Promise.all([
      fetchClosureEvents(closure.id),
      canClose || canException
        ? fetchPeriodExceptions(closure.id)
        : Promise.resolve({ success: true as const, data: [] as TeachingPeriodException[] }),
    ]);
    if (eventsRes.success) setEvents(eventsRes.data);
    if (exceptionsRes.success) setExceptions(exceptionsRes.data);
  }

  if (!canSee) {
    return (
      <RequireTeachingPlanningAccess>
        <PermissionDeniedState />
      </RequireTeachingPlanningAccess>
    );
  }

  const counts = queue?.counts;
  const tabs: { id: AdminReviewPublicationTab; label: string; enabled: boolean }[] = [
    { id: 'queue', label: t('teachingReviewPublication.tabs.queue'), enabled: canViewQueue },
    {
      id: 'publications',
      label: t('teachingReviewPublication.tabs.publications'),
      enabled: canViewQueue || canArchiveView,
    },
    {
      id: 'archive',
      label: t('teachingReviewPublication.tabs.archive'),
      enabled: canArchiveView,
    },
    { id: 'exports', label: t('teachingReviewPublication.tabs.exports'), enabled: canExport },
    {
      id: 'closure',
      label: t('teachingReviewPublication.tabs.closure'),
      enabled: canViewQueue || canClose,
    },
  ];

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace teaching-planning-list review-publication">
        <TeachingPlanningListBack />
        <PageHeader
          title={t('admin.teachingPlanning.reviewPublication.title')}
          subtitle={t('admin.teachingPlanning.reviewPublication.subtitle')}
        />

        <AcademicContextFilters
          audience="admin"
          scope="teaching_planning"
          layout="compact"
          selection={selection}
          onSelectionChange={(next) => {
            setSelection(next);
            setPage(1);
            setQueue(null);
            setArchive(null);
            setPreview(null);
            syncUrl({
              academicYearId: next.academicYearId,
              termId: next.termId,
              page: 1,
            });
          }}
          showAcademicYear
          showTerm
          showClass={false}
          showSubject={false}
          showOffering={false}
        />

        <div className="review-publication__tabs" role="tablist" aria-label={t('teachingReviewPublication.tabs.label')}>
          {tabs
            .filter((item) => item.enabled)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`btn btn--sm${tab === item.id ? ' btn--primary' : ' btn--ghost'}`}
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                  syncUrl({ tab: item.id, page: 1 });
                }}
              >
                {item.label}
              </button>
            ))}
        </div>

        <div className="review-publication__filters row" aria-label={t('teachingReviewPublication.filters.label')}>
          <label>
            <span>{t('teachingReviewPublication.filters.documentType')}</span>
            <select
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                setPage(1);
                syncUrl({ documentType: e.target.value, page: 1 });
              }}
            >
              <option value="">{t('common.allStatuses')}</option>
              {TEACHING_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(documentTypeMessageKey(type))}
                </option>
              ))}
            </select>
          </label>
          {(tab === 'queue' || tab === 'publications') && (
            <label>
              <span>{t('teachingReviewPublication.filters.reviewState')}</span>
              <select
                value={reviewState}
                onChange={(e) => {
                  setReviewState(e.target.value);
                  setPage(1);
                  syncUrl({ reviewState: e.target.value, page: 1 });
                }}
              >
                <option value="">{t('common.allStatuses')}</option>
                <option value="not_reviewed">{t(reviewStateMessageKey('not_reviewed'))}</option>
                <option value="reviewed">{t(reviewStateMessageKey('reviewed'))}</option>
                <option value="correction_requested">
                  {t(reviewStateMessageKey('correction_requested'))}
                </option>
              </select>
            </label>
          )}
          {(tab === 'archive' || tab === 'publications') && (
            <label>
              <span>{t('teachingReviewPublication.filters.publicationStatus')}</span>
              <select
                value={archiveStatus}
                onChange={(e) => {
                  setArchiveStatus(e.target.value);
                  setPage(1);
                  syncUrl({ status: e.target.value, page: 1 });
                }}
              >
                <option value="">{t('common.allStatuses')}</option>
                <option value="approved">{t(publicationStatusMessageKey('approved'))}</option>
                <option value="superseded">{t(publicationStatusMessageKey('superseded'))}</option>
                <option value="archived">{t(publicationStatusMessageKey('archived'))}</option>
              </select>
            </label>
          )}
        </div>

        {counts && (tab === 'queue' || tab === 'publications') && (
          <div className="review-publication__counts" aria-live="polite">
            <span>
              {t('teachingReviewPublication.counts.pending')}:{' '}
              <NumericText>{counts.pending_review}</NumericText>
            </span>
            <span>
              {t('teachingReviewPublication.counts.correction')}:{' '}
              <NumericText>{counts.correction_requested}</NumericText>
            </span>
            <span>
              {t('teachingReviewPublication.counts.reviewedNotPublished')}:{' '}
              <NumericText>{counts.reviewed_not_officially_published}</NumericText>
            </span>
            <span>
              {t('teachingReviewPublication.counts.published')}:{' '}
              <NumericText>{counts.officially_published}</NumericText>
            </span>
          </div>
        )}

        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>
        {liveMessage ? (
          <p className="review-publication__live" role="status">
            {liveMessage}
          </p>
        ) : null}

        {loading ? <LoadingState /> : null}
        {error ? (
          error.code === 'permission_denied' || error.code?.endsWith('_forbidden') ? (
            <PermissionDeniedState />
          ) : (
            <ApiErrorView error={error} onRetry={() => {
              if (tab === 'queue' || tab === 'publications') void loadQueue();
              if (tab === 'archive') void loadArchive();
              if (tab === 'closure') void loadClosures();
            }} />
          )
        ) : null}

        {!loading && !error && tab === 'queue' && canViewQueue && (
          <section aria-labelledby="rp-queue-heading">
            <h2 id="rp-queue-heading">{t('teachingReviewPublication.tabs.queue')}</h2>
            {!queue?.items.length ? (
              <EmptyState
                title={t('teachingReviewPublication.empty.queueTitle')}
                description={t('teachingReviewPublication.empty.queueDesc')}
              />
            ) : (
              <div className="review-publication__list">
                {queue.items.map((item) => (
                  <article
                    key={`${item.document_type}-${item.document_id}`}
                    className="review-publication__card"
                  >
                    <header>
                      <h3>{item.title || item.reference}</h3>
                      <p>
                        {t(documentTypeMessageKey(item.document_type))} ·{' '}
                        {t(reviewStateMessageKey(item.review_state))}
                        {item.correction_requested
                          ? ` · ${t('teachingReviewPublication.badges.correctionRequired')}`
                          : ''}
                      </p>
                    </header>
                    <dl className="review-publication__meta">
                      {item.owner_teacher?.name ? (
                        <>
                          <dt>{t('teachingReviewPublication.fields.teacher')}</dt>
                          <dd>{item.owner_teacher.name}</dd>
                        </>
                      ) : null}
                      {item.class?.name ? (
                        <>
                          <dt>{t('teachingReviewPublication.fields.class')}</dt>
                          <dd>{item.class.name}</dd>
                        </>
                      ) : null}
                      {item.offering?.name ? (
                        <>
                          <dt>{t('teachingReviewPublication.fields.offering')}</dt>
                          <dd>{item.offering.name}</dd>
                        </>
                      ) : null}
                      {item.latest_publication_no ? (
                        <>
                          <dt>{t('teachingReviewPublication.fields.publicationNo')}</dt>
                          <dd>
                            <NumericText>{item.latest_publication_no}</NumericText>
                          </dd>
                        </>
                      ) : null}
                      {item.latest_correction_reason ? (
                        <>
                          <dt>{t('teachingReviewPublication.fields.correctionReason')}</dt>
                          <dd>{item.latest_correction_reason}</dd>
                        </>
                      ) : null}
                    </dl>
                    <div className="row review-publication__actions">
                      {canManage && item.allowed_actions.mark_reviewed ? (
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => {
                            setActiveItem(item);
                            setDialog('mark_reviewed');
                          }}
                        >
                          {t('teachingReviewPublication.actions.markReviewed')}
                        </button>
                      ) : null}
                      {canManage && item.allowed_actions.request_changes ? (
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => {
                            setActiveItem(item);
                            setReason('');
                            setDialog('request_changes');
                          }}
                        >
                          {t('teachingReviewPublication.actions.requestCorrection')}
                        </button>
                      ) : null}
                      {canApprove && item.allowed_actions.approve_official ? (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => {
                            setActiveItem(item);
                            setDialog('approve');
                          }}
                        >
                          {t('teachingReviewPublication.actions.approveOfficial')}
                        </button>
                      ) : null}
                      {item.allowed_actions.view_versions ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void openVersions(item)}
                        >
                          {t('teachingReviewPublication.actions.viewVersions')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-label={t('teachingReviewPublication.actions.printDraftAr')}
                        onClick={() => void handleDownloadDraft(item, 'ar')}
                      >
                        {t('teachingReviewPublication.actions.printDraftAr')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-label={t('teachingReviewPublication.actions.printDraftFr')}
                        onClick={() => void handleDownloadDraft(item, 'fr')}
                      >
                        {t('teachingReviewPublication.actions.printDraftFr')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {queue && queue.pagination.total > queue.pagination.page_size ? (
              <div className="row">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = page - 1;
                    setPage(next);
                    syncUrl({ page: next });
                  }}
                >
                  {t('common.previous')}
                </button>
                <span>
                  <NumericText>{page}</NumericText> /{' '}
                  <NumericText>
                    {Math.max(
                      1,
                      Math.ceil(queue.pagination.total / queue.pagination.page_size),
                    )}
                  </NumericText>
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={!queue.pagination.has_more}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    syncUrl({ page: next });
                  }}
                >
                  {t('common.next')}
                </button>
              </div>
            ) : null}
          </section>
        )}

        {!loading && !error && (tab === 'publications' || tab === 'archive') && canArchiveView && (
          <section aria-labelledby="rp-archive-heading">
            <h2 id="rp-archive-heading">
              {tab === 'publications'
                ? t('teachingReviewPublication.tabs.publications')
                : t('teachingReviewPublication.tabs.archive')}
            </h2>
            {!archive?.items.length ? (
              <EmptyState
                title={t('teachingReviewPublication.empty.archiveTitle')}
                description={t('teachingReviewPublication.empty.archiveDesc')}
              />
            ) : (
              <div className="review-publication__list">
                {archive.items.map((item) => (
                  <article key={item.id} className="review-publication__card">
                    <header>
                      <h3>
                        <NumericText>{item.publication_no ?? item.id}</NumericText>
                      </h3>
                      <p>
                        {t(documentTypeMessageKey(item.document_type))} ·{' '}
                        {t(publicationStatusMessageKey(item.status))}
                      </p>
                    </header>
                    <dl className="review-publication__meta">
                      {item.owner_teacher?.name ? (
                        <>
                          <dt>{t('teachingReviewPublication.fields.teacher')}</dt>
                          <dd>{item.owner_teacher.name}</dd>
                        </>
                      ) : null}
                      <dt>{t('teachingReviewPublication.fields.locales')}</dt>
                      <dd>
                        {item.locales_available.length
                          ? item.locales_available
                              .map((locale) => t(printLocaleMessageKey(locale)))
                              .join(' · ')
                          : t('teachingReviewPublication.empty.noOfficialFile')}
                      </dd>
                    </dl>
                    <div className="row review-publication__actions">
                      {item.allowed_actions.download && canPrintOfficial
                        ? (['ar', 'fr'] as TeachingPrintLocale[]).map((locale) => (
                            <button
                              key={locale}
                              type="button"
                              className="btn btn--sm"
                              disabled={!item.locales_available.includes(locale) && item.locales_available.length > 0}
                              title={
                                !item.attachment_ready
                                  ? t('teachingReviewPublication.empty.noOfficialFile')
                                  : undefined
                              }
                              onClick={() =>
                                void handleDownloadOfficial(
                                  item.id,
                                  locale,
                                  item.allowed_actions.download,
                                )
                              }
                            >
                              {locale === 'ar'
                                ? t('teachingReviewPublication.actions.printOfficialAr')
                                : t('teachingReviewPublication.actions.printOfficialFr')}
                            </button>
                          ))
                        : null}
                      {canArchiveManage && item.allowed_actions.archive ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setActiveArchive(item);
                            setReason('');
                            setDialog('archive');
                          }}
                        >
                          {t('teachingReviewPublication.actions.archive')}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && !error && tab === 'exports' && canExport && (
          <section aria-labelledby="rp-exports-heading">
            <h2 id="rp-exports-heading">{t('teachingReviewPublication.tabs.exports')}</h2>
            <p>{t('teachingReviewPublication.exports.limitsHint', {
              zip: TEACHING_EXPORT_LIMITS.maxZipDocuments,
              mb: 25,
              rows: TEACHING_EXPORT_LIMITS.maxRows,
              hours: TEACHING_EXPORT_LIMITS.expiryHours,
            })}</p>
            <div className="row review-publication__filters">
              <label>
                <span>{t('teachingReviewPublication.filters.exportFormat')}</span>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as TeachingExportFormat)}
                >
                  {TEACHING_EXPORT_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {t(exportFormatMessageKey(format))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('teachingReviewPublication.filters.locale')}</span>
                <select
                  value={exportLocale}
                  onChange={(e) => setExportLocale(e.target.value as TeachingPrintLocale)}
                >
                  <option value="ar">{t(printLocaleMessageKey('ar'))}</option>
                  <option value="fr">{t(printLocaleMessageKey('fr'))}</option>
                </select>
              </label>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={mutating}
                onClick={() => void handleCreateExport()}
              >
                {t('teachingReviewPublication.actions.createExport')}
              </button>
            </div>
            {exportRequest ? (
              <div className="review-publication__card">
                <p>
                  {t(exportStatusMessageKey(exportRequest.status))} ·{' '}
                  <NumericText>{exportRequest.reference ?? exportRequest.id}</NumericText>
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void handleRefreshExport()}
                  >
                    {t('teachingReviewPublication.actions.refreshExport')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={!exportRequest.download_ready || exportRequest.status !== 'ready'}
                    title={
                      exportRequest.status === 'expired'
                        ? t('teachingReviewPublication.errors.exportExpired')
                        : undefined
                    }
                    onClick={() => void handleDownloadExport()}
                  >
                    {t('teachingReviewPublication.actions.downloadExport')}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t('teachingReviewPublication.empty.exportsTitle')}
                description={t('teachingReviewPublication.empty.exportsDesc')}
              />
            )}
          </section>
        )}

        {!loading && !error && tab === 'closure' && (
          <section aria-labelledby="rp-closure-heading">
            <h2 id="rp-closure-heading">{t('teachingReviewPublication.tabs.closure')}</h2>
            {canClose ? (
              <div className="review-publication__card">
                <div className="row review-publication__filters">
                  <label>
                    <span>{t('teachingReviewPublication.filters.scopeType')}</span>
                    <select
                      value={scopeType}
                      onChange={(e) =>
                        setScopeType(e.target.value as 'term' | 'academic_year')
                      }
                    >
                      <option value="term">{t(closureScopeMessageKey('term'))}</option>
                      <option value="academic_year">
                        {t(closureScopeMessageKey('academic_year'))}
                      </option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => void handleLoadPreview()}
                  >
                    {t('teachingReviewPublication.actions.loadPreview')}
                  </button>
                </div>
                {preview ? (
                  <div>
                    <p>
                      {t('teachingReviewPublication.closure.canClose')}:{' '}
                      {preview.can_close
                        ? t('common.yes')
                        : t('common.no')}
                    </p>
                    {preview.preview.legacy_closed ? (
                      <p className="review-publication__warning">
                        {t('teachingReviewPublication.closure.legacyWarning')}
                      </p>
                    ) : null}
                    {preview.preview.hard_blockers.length ? (
                      <ul>
                        {preview.preview.hard_blockers.map((blocker) => (
                          <li key={blocker.code}>
                            {t('teachingReviewPublication.closure.blocker')}: {blocker.code}
                            {blocker.message ? ` — ${blocker.message}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {preview.preview.warnings.length ? (
                      <ul>
                        {preview.preview.warnings.map((warning) => (
                          <li key={`${warning.code}-${warning.count ?? 0}`}>
                            {t('teachingReviewPublication.closure.warning')}: {warning.code}
                            {warning.count != null ? (
                              <>
                                {' '}
                                (<NumericText>{warning.count}</NumericText>)
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {preview.warning_count > 0 ? (
                      <label className="row">
                        <input
                          type="checkbox"
                          checked={acknowledgeWarnings}
                          onChange={(e) => setAcknowledgeWarnings(e.target.checked)}
                        />
                        <span>{t('teachingReviewPublication.closure.acknowledgeWarnings')}</span>
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={!preview.can_close || mutating}
                      onClick={() => {
                        setReason('');
                        setDialog('close');
                      }}
                    >
                      {preview.preview.existing_closure?.state === 'reopened'
                        ? t('teachingReviewPublication.actions.reclose')
                        : t('teachingReviewPublication.actions.close')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!closures.length ? (
              <EmptyState
                title={t('teachingReviewPublication.empty.closureTitle')}
                description={t('teachingReviewPublication.empty.closureDesc')}
              />
            ) : (
              <div className="review-publication__list">
                {closures.map((closure) => (
                  <article key={closure.id} className="review-publication__card">
                    <header>
                      <h3>{closure.name || closure.reference}</h3>
                      <p>
                        {t(closureScopeMessageKey(closure.scope_type))} ·{' '}
                        {t(closureStateMessageKey(closure.state))} ·{' '}
                        {t('teachingReviewPublication.fields.revision')}{' '}
                        <NumericText>{closure.closure_revision ?? 0}</NumericText>
                      </p>
                    </header>
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => void loadClosureDetails(closure)}
                      >
                        {t('teachingReviewPublication.actions.viewEvents')}
                      </button>
                      {canReopen && closure.state === 'closed' ? (
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => {
                            setActiveClosure(closure);
                            setReason('');
                            setDialog('reopen');
                          }}
                        >
                          {t('teachingReviewPublication.actions.reopen')}
                        </button>
                      ) : null}
                      {canException && closure.state === 'closed' ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setActiveClosure(closure);
                            setReason('');
                            setDialog('exception');
                          }}
                        >
                          {t('teachingReviewPublication.actions.authorizeException')}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeClosure && events.length ? (
              <div className="review-publication__card">
                <h3>{t('teachingReviewPublication.closure.eventsTitle')}</h3>
                <ul>
                  {events.map((event) => (
                    <li key={event.id}>
                      {event.event_type} · rev <NumericText>{event.closure_revision ?? 0}</NumericText> ·{' '}
                      {event.event_at}
                      {event.reason ? ` — ${event.reason}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {activeClosure && exceptions.length ? (
              <div className="review-publication__card">
                <h3>{t('teachingReviewPublication.closure.exceptionsTitle')}</h3>
                <ul>
                  {exceptions.map((item) => (
                    <li key={item.id}>
                      {item.document_type}:{item.source_res_id} · {item.allowed_action} ·{' '}
                      {item.state}
                      {item.expires_at ? ` · ${item.expires_at}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}

        {versions ? (
          <section className="review-publication__card" aria-labelledby="rp-versions-heading">
            <h2 id="rp-versions-heading">{t('teachingReviewPublication.versions.title')}</h2>
            {!versions.publications.length ? (
              <EmptyState
                title={t('teachingReviewPublication.empty.publicationsTitle')}
                description={t('teachingReviewPublication.empty.publicationsDesc')}
              />
            ) : (
              <ul>
                {versions.publications.map((pub) => (
                  <li key={pub.id}>
                    <NumericText>{pub.publication_no ?? pub.id}</NumericText> ·{' '}
                    {t(publicationStatusMessageKey(pub.status))} · rev{' '}
                    <NumericText>{pub.source_revision_no ?? 0}</NumericText>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {parsed.returnTo ? (
          <p>
            <Link href={parsed.returnTo} className="btn btn--ghost btn--sm">
              {t('teachingReviewPublication.actions.back')}
            </Link>
          </p>
        ) : null}

        <ConfirmationDialog
          open={dialog === 'mark_reviewed'}
          title={t('teachingReviewPublication.dialogs.markReviewedTitle')}
          body={t('teachingReviewPublication.dialogs.markReviewedBody')}
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              if (!activeItem) return { success: false, error: { code: 'validation_error', message: '' } };
              return markDocumentReviewed(activeItem.document_type, activeItem.document_id);
            })
          }
        />

        <ConfirmationDialog
          open={dialog === 'request_changes'}
          title={t('teachingReviewPublication.dialogs.requestCorrectionTitle')}
          body={
            <label>
              <span>{t('teachingReviewPublication.fields.reason')}</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                dir="auto"
                required
              />
            </label>
          }
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              if (!activeItem || !reason.trim()) {
                return {
                  success: false,
                  error: {
                    code: 'teaching_review_reason_required',
                    message: t('teachingReviewPublication.errors.reviewReasonRequired'),
                  },
                };
              }
              return requestDocumentChanges(
                activeItem.document_type,
                activeItem.document_id,
                reason.trim(),
              );
            })
          }
        />

        <ConfirmationDialog
          open={dialog === 'approve'}
          title={t('teachingReviewPublication.dialogs.approveTitle')}
          body={
            <div>
              <p>{t('teachingReviewPublication.dialogs.approveBody')}</p>
              {activeItem ? (
                <ul>
                  <li>
                    {t(documentTypeMessageKey(activeItem.document_type))} — {activeItem.title}
                  </li>
                  <li>{t(reviewStateMessageKey(activeItem.review_state))}</li>
                  {activeItem.officially_published ? (
                    <li>{t('teachingReviewPublication.dialogs.alreadyPublished')}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          }
          variant="danger"
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              if (!activeItem) {
                return { success: false, error: { code: 'validation_error', message: '' } };
              }
              const res = await approveDocumentOfficial(
                activeItem.document_type,
                activeItem.document_id,
              );
              if (res.success && res.data.publication_no) {
                setLiveMessage(
                  `${t('teachingReviewPublication.live.approved')} ${res.data.publication_no}`,
                );
              }
              return res;
            })
          }
        />

        <ConfirmationDialog
          open={dialog === 'archive'}
          title={t('teachingReviewPublication.dialogs.archiveTitle')}
          body={
            <label>
              <span>{t('teachingReviewPublication.fields.reason')}</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                dir="auto"
              />
            </label>
          }
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              if (!activeArchive || !reason.trim()) {
                return {
                  success: false,
                  error: {
                    code: 'validation_error',
                    message: t('teachingReviewPublication.errors.reviewReasonRequired'),
                  },
                };
              }
              return archivePublication(activeArchive.id, reason.trim());
            })
          }
        />

        <ConfirmationDialog
          open={dialog === 'close'}
          title={t('teachingReviewPublication.dialogs.closeTitle')}
          variant="danger"
          body={
            <div>
              <p>{t('teachingReviewPublication.dialogs.closeBody')}</p>
              <label>
                <span>{t('teachingReviewPublication.fields.reason')}</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  dir="auto"
                  required
                />
              </label>
            </div>
          }
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              if (!selection.academicYearId || !reason.trim() || !preview) {
                return {
                  success: false,
                  error: {
                    code: 'teaching_close_reason_required',
                    message: t('teachingReviewPublication.errors.closeReasonRequired'),
                  },
                };
              }
              return closeTeachingPeriod({
                academic_year_id: Number(selection.academicYearId),
                scope_type: scopeType,
                term_id: scopeType === 'term' ? Number(selection.termId) : undefined,
                reason: reason.trim(),
                acknowledge_warnings: acknowledgeWarnings,
                expected_preview_checksum: preview.preview_checksum ?? undefined,
              });
            })
          }
        />

        <ConfirmationDialog
          open={dialog === 'reopen'}
          title={t('teachingReviewPublication.dialogs.reopenTitle')}
          variant="danger"
          body={
            <div>
              <p>{t('teachingReviewPublication.dialogs.reopenBody')}</p>
              <label>
                <span>{t('teachingReviewPublication.fields.reason')}</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  dir="auto"
                  required
                />
              </label>
            </div>
          }
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              if (!activeClosure || !reason.trim()) {
                return {
                  success: false,
                  error: {
                    code: 'teaching_reopen_reason_required',
                    message: t('teachingReviewPublication.errors.reopenReasonRequired'),
                  },
                };
              }
              return reopenTeachingPeriod(activeClosure.id, {
                reason: reason.trim(),
                expected_closure_revision: activeClosure.closure_revision ?? undefined,
              });
            })
          }
        />

        <ConfirmationDialog
          open={dialog === 'exception'}
          title={t('teachingReviewPublication.dialogs.exceptionTitle')}
          body={
            <div className="stack">
              <p>{t('teachingReviewPublication.dialogs.exceptionBody')}</p>
              <label>
                <span>{t('teachingReviewPublication.filters.documentType')}</span>
                <select
                  value={exceptionDocType}
                  onChange={(e) => setExceptionDocType(e.target.value)}
                >
                  {TEACHING_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(documentTypeMessageKey(type))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('teachingReviewPublication.fields.documentId')}</span>
                <input
                  value={exceptionDocId}
                  onChange={(e) => setExceptionDocId(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label>
                <span>{t('teachingReviewPublication.fields.allowedAction')}</span>
                <input
                  value={exceptionAction}
                  onChange={(e) => setExceptionAction(e.target.value)}
                />
              </label>
              <label>
                <span>{t('teachingReviewPublication.fields.reason')}</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  dir="auto"
                  required
                />
              </label>
            </div>
          }
          loading={mutating}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void runMutation(async () => {
              const docId = Number(exceptionDocId);
              if (!activeClosure || !reason.trim() || !Number.isFinite(docId) || docId <= 0) {
                return {
                  success: false,
                  error: {
                    code: 'teaching_exception_reason_required',
                    message: t('teachingReviewPublication.errors.exceptionReasonRequired'),
                  },
                };
              }
              return authorizePeriodException(activeClosure.id, {
                document_type: exceptionDocType,
                document_id: docId,
                allowed_action: exceptionAction,
                reason: reason.trim(),
              });
            })
          }
        />

        {/* Keep pathname referenced for future deep-link diagnostics */}
        <span className="sr-only">{pathname}</span>
      </div>
    </RequireTeachingPlanningAccess>
  );
}
