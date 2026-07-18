'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Teacher Teaching Stage 9 — review status (document-scoped), publications,
 * draft/official print, and period closure read-only status.
 *
 * Contract boundary: Odoo 224 has no teacher review-queue list endpoint.
 * Document status is loaded when document_type + document_id are present.
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiErrorView,
  EmptyState,
  LoadingState,
  PermissionDeniedState,
} from '@/components/states/states';
import { NumericText } from '@/components/ui/numeric-text';
import { PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { downloadTeachingBinary } from '@/features/teaching-review-publication/review-publication-download';
import { teachingStage9ErrorMessageKey } from '@/features/teaching-review-publication/review-publication-errors';
import {
  closureStateMessageKey,
  documentTypeMessageKey,
  printLocaleMessageKey,
  publicationStatusMessageKey,
  reviewStateMessageKey,
} from '@/features/teaching-review-publication/review-publication-labels';
import {
  buildTeacherReviewPublicationHref,
  parseTeacherReviewPublicationQuery,
} from '@/features/teaching-review-publication/review-publication-url';
import {
  fetchTeacherClosureStatus,
  fetchTeacherPublications,
  fetchTeacherReviewStatus,
} from '@/features/teacher/teaching-review-publication/api/teacher-review-publication-api';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type {
  TeacherClosureStatus,
  TeacherReviewPublicationTab,
  TeachingArchiveItem,
  TeachingPrintLocale,
  TeachingReviewStatus,
} from '@/types/teaching-review-publication';
import '@/features/admin/teaching-review-publication/review-publication.css';

function errorMessage(t: (key: string) => string, error: ApiErrorBody | null): string {
  if (!error) return t('teachingReviewPublication.errors.generic');
  const key = teachingStage9ErrorMessageKey(error.code);
  const localized = t(key);
  return localized === key
    ? error.message || t('teachingReviewPublication.errors.generic')
    : localized;
}

export function TeacherReviewPublicationPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsed = parseTeacherReviewPublicationQuery(searchParams);
  const requestSeq = useRef(0);

  const [tab, setTab] = useState<TeacherReviewPublicationTab>(parsed.tab);
  const [status, setStatus] = useState<TeachingReviewStatus | null>(null);
  const [publications, setPublications] = useState<TeachingArchiveItem[]>([]);
  const [closure, setClosure] = useState<TeacherClosureStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [page, setPage] = useState(parsed.page);
  const [total, setTotal] = useState(0);

  const syncUrl = useCallback(
    (next: Partial<typeof parsed> & { tab?: TeacherReviewPublicationTab; page?: number }) => {
      router.replace(
        buildTeacherReviewPublicationHref({
          academicYearId: next.academicYearId ?? parsed.academicYearId,
          termId: next.termId ?? parsed.termId,
          documentType: next.documentType ?? parsed.documentType,
          documentId: next.documentId ?? parsed.documentId,
          publicationId: next.publicationId ?? parsed.publicationId,
          tab: next.tab ?? tab,
          page: next.page ?? page,
          returnTo: parsed.returnTo,
        }),
        { scroll: false },
      );
    },
    [page, parsed, router, tab],
  );

  const loadStatus = useCallback(async () => {
    if (!parsed.documentType || !parsed.documentId) {
      setStatus(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await fetchTeacherReviewStatus(
      parsed.documentType,
      Number(parsed.documentId),
    );
    if (seq !== requestSeq.current) return;
    setLoading(false);
    if (!res.success) {
      setStatus(null);
      setError(res.error);
      return;
    }
    setStatus(res.data);
  }, [parsed.documentId, parsed.documentType]);

  const loadPublications = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await fetchTeacherPublications({
      academic_year_id: parsed.academicYearId
        ? Number(parsed.academicYearId)
        : undefined,
      document_type: parsed.documentType || undefined,
      page,
      page_size: 50,
    });
    if (seq !== requestSeq.current) return;
    setLoading(false);
    if (!res.success) {
      setPublications([]);
      setError(res.error);
      return;
    }
    setPublications(res.data.items);
    setTotal(res.data.pagination.total);
  }, [page, parsed.academicYearId, parsed.documentType]);

  const loadClosure = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await fetchTeacherClosureStatus({
      academic_year_id: parsed.academicYearId
        ? Number(parsed.academicYearId)
        : undefined,
      term_id: parsed.termId ? Number(parsed.termId) : undefined,
    });
    if (seq !== requestSeq.current) return;
    setLoading(false);
    if (!res.success) {
      setClosure(null);
      setError(res.error);
      return;
    }
    setClosure(res.data);
  }, [parsed.academicYearId, parsed.termId]);

  useEffect(() => {
    setTab(parsed.tab);
    setPage(parsed.page);
  }, [parsed.page, parsed.tab]);

  useEffect(() => {
    if (tab === 'status' || tab === 'print') void loadStatus();
    if (tab === 'publications' || tab === 'print') void loadPublications();
    if (tab === 'closure') void loadClosure();
  }, [loadClosure, loadPublications, loadStatus, tab]);

  async function downloadDraft(locale: TeachingPrintLocale) {
    if (!parsed.documentType || !parsed.documentId) return;
    setLiveMessage(t('teachingReviewPublication.print.draftLabel'));
    const result = await downloadTeachingBinary(
      endpoints.teacher.teachingDocumentDraftPrint(
        parsed.documentType,
        parsed.documentId,
      ),
      `draft-${parsed.documentType}-${parsed.documentId}-${locale}.pdf`,
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

  async function downloadOfficial(publicationId: number, locale: TeachingPrintLocale) {
    const result = await downloadTeachingBinary(
      endpoints.teacher.teachingPublicationDownload(publicationId),
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

  const tabs: { id: TeacherReviewPublicationTab; label: string }[] = [
    { id: 'status', label: t('teachingReviewPublication.teacherTabs.status') },
    { id: 'publications', label: t('teachingReviewPublication.teacherTabs.publications') },
    { id: 'print', label: t('teachingReviewPublication.teacherTabs.print') },
    { id: 'closure', label: t('teachingReviewPublication.teacherTabs.closure') },
  ];

  const returnHref =
    parsed.returnTo ||
    buildTeacherReviewPublicationHref({
      academicYearId: parsed.academicYearId,
      returnTo: '/teacher/teaching/planning',
    });

  return (
    <div className="teacher-workspace review-publication">
      <PageHeader
        title={t('teacher.teachingReviewPublication.title')}
        subtitle={t('teacher.teachingReviewPublication.subtitle')}
      />

      <p>
        <Link
          href={parsed.returnTo || '/teacher/teaching/planning'}
          className="btn btn--ghost btn--sm"
        >
          {t('teachingReviewPublication.actions.backToPlanning')}
        </Link>
      </p>

      {closure?.closed ? (
        <div className="review-publication__banner" role="status">
          {closure.legacy_closed
            ? t('teachingReviewPublication.closure.legacyWarning')
            : t('teachingReviewPublication.teacher.periodClosedReadonly')}
        </div>
      ) : null}

      <div
        className="review-publication__tabs"
        role="tablist"
        aria-label={t('teachingReviewPublication.tabs.label')}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`btn btn--sm${tab === item.id ? ' btn--primary' : ' btn--ghost'}`}
            onClick={() => {
              setTab(item.id);
              syncUrl({ tab: item.id });
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

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
          <ApiErrorView
            error={error}
            onRetry={() => {
              if (tab === 'status') void loadStatus();
              if (tab === 'publications' || tab === 'print') void loadPublications();
              if (tab === 'closure') void loadClosure();
            }}
          />
        )
      ) : null}

      {!loading && !error && tab === 'status' && (
        <section aria-labelledby="trp-status-heading">
          <h2 id="trp-status-heading">
            {t('teachingReviewPublication.teacherTabs.status')}
          </h2>
          {!parsed.documentType || !parsed.documentId ? (
            <EmptyState
              title={t('teachingReviewPublication.empty.teacherStatusTitle')}
              description={t('teachingReviewPublication.empty.teacherStatusDesc')}
            />
          ) : status ? (
            <article className="review-publication__card">
              <header>
                <h3>{t(documentTypeMessageKey(status.document_type))}</h3>
                <p>
                  {t(reviewStateMessageKey(status.review_state))}
                  {status.latest_correction_reason
                    ? ` · ${t('teachingReviewPublication.badges.correctionRequired')}`
                    : ''}
                </p>
              </header>
              <dl className="review-publication__meta">
                <dt>{t('teachingReviewPublication.fields.revision')}</dt>
                <dd>
                  <NumericText>{status.revision_no ?? 0}</NumericText>
                </dd>
                {status.latest_correction_reason ? (
                  <>
                    <dt>{t('teachingReviewPublication.fields.correctionReason')}</dt>
                    <dd>{status.latest_correction_reason}</dd>
                  </>
                ) : null}
                {status.latest_publication?.publication_no ? (
                  <>
                    <dt>{t('teachingReviewPublication.fields.publicationNo')}</dt>
                    <dd>
                      <NumericText>{status.latest_publication.publication_no}</NumericText>
                    </dd>
                    <dt>{t('teachingReviewPublication.fields.publicationStatus')}</dt>
                    <dd>
                      {t(
                        publicationStatusMessageKey(status.latest_publication.status),
                      )}
                    </dd>
                  </>
                ) : null}
              </dl>
              <p className="review-publication__live">
                {t('teachingReviewPublication.teacher.noAdminActions')}
              </p>
            </article>
          ) : null}
        </section>
      )}

      {!loading && !error && (tab === 'publications' || tab === 'print') && (
        <section aria-labelledby="trp-pubs-heading">
          <h2 id="trp-pubs-heading">
            {tab === 'print'
              ? t('teachingReviewPublication.teacherTabs.print')
              : t('teachingReviewPublication.teacherTabs.publications')}
          </h2>

          {tab === 'print' && parsed.documentType && parsed.documentId ? (
            <div className="row review-publication__actions" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn btn--sm"
                aria-label={t('teachingReviewPublication.actions.printDraftAr')}
                onClick={() => void downloadDraft('ar')}
              >
                {t('teachingReviewPublication.actions.printDraftAr')}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                aria-label={t('teachingReviewPublication.actions.printDraftFr')}
                onClick={() => void downloadDraft('fr')}
              >
                {t('teachingReviewPublication.actions.printDraftFr')}
              </button>
              <p className="review-publication__live">
                {t('teachingReviewPublication.print.draftLabel')}
              </p>
            </div>
          ) : null}

          {!publications.length ? (
            <EmptyState
              title={t('teachingReviewPublication.empty.publicationsTitle')}
              description={t('teachingReviewPublication.empty.publicationsDesc')}
            />
          ) : (
            <div className="review-publication__list">
              {publications.map((item) => (
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
                    <dt>{t('teachingReviewPublication.fields.locales')}</dt>
                    <dd>
                      {item.locales_available.length
                        ? item.locales_available
                            .map((locale) => t(printLocaleMessageKey(locale)))
                            .join(' · ')
                        : t('teachingReviewPublication.empty.noOfficialFile')}
                    </dd>
                  </dl>
                  {item.allowed_actions.download ? (
                    <div className="row review-publication__actions">
                      {(['ar', 'fr'] as TeachingPrintLocale[]).map((locale) => (
                        <button
                          key={locale}
                          type="button"
                          className="btn btn--sm"
                          disabled={
                            item.locales_available.length > 0 &&
                            !item.locales_available.includes(locale)
                          }
                          aria-label={
                            locale === 'ar'
                              ? t('teachingReviewPublication.actions.printOfficialAr')
                              : t('teachingReviewPublication.actions.printOfficialFr')
                          }
                          onClick={() => void downloadOfficial(item.id, locale)}
                        >
                          {locale === 'ar'
                            ? t('teachingReviewPublication.actions.printOfficialAr')
                            : t('teachingReviewPublication.actions.printOfficialFr')}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {total > 50 ? (
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
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page * 50 >= total}
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

      {!loading && !error && tab === 'closure' && (
        <section aria-labelledby="trp-closure-heading">
          <h2 id="trp-closure-heading">
            {t('teachingReviewPublication.teacherTabs.closure')}
          </h2>
          {!closure ? (
            <EmptyState
              title={t('teachingReviewPublication.empty.closureTitle')}
              description={t('teachingReviewPublication.empty.closureDesc')}
            />
          ) : (
            <article className="review-publication__card">
              <p>
                {closure.closed
                  ? t('teachingReviewPublication.teacher.periodClosedReadonly')
                  : t('teachingReviewPublication.closureStates.open')}
              </p>
              {closure.closure ? (
                <dl className="review-publication__meta">
                  <dt>{t('teachingReviewPublication.fields.closureState')}</dt>
                  <dd>{t(closureStateMessageKey(closure.closure.state))}</dd>
                  <dt>{t('teachingReviewPublication.fields.revision')}</dt>
                  <dd>
                    <NumericText>{closure.closure.closure_revision ?? 0}</NumericText>
                  </dd>
                </dl>
              ) : null}
              {closure.legacy_closed ? (
                <p className="review-publication__warning">
                  {t('teachingReviewPublication.closure.legacyWarning')}
                </p>
              ) : null}
            </article>
          )}
        </section>
      )}

      <p>
        <Link href={returnHref.split('?')[0] === '/teacher/teaching/review-publication' ? '/teacher/teaching/planning' : (parsed.returnTo || '/teacher/teaching/planning')} className="btn btn--ghost btn--sm">
          {t('teachingReviewPublication.actions.back')}
        </Link>
      </p>
    </div>
  );
}
