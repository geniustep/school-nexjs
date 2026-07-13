'use client';

/**
 * Academic Terms management — year-scoped list + optional initialize.
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAcademicYearTerms,
  initializeAcademicYearTerms,
} from '@/features/academic-context/api/academic-context-api';
import { formatTermOptionLabel } from '@/features/academic-context/utils/academic-context-display';
import { useSession } from '@/features/auth/session-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import {
  canManageAcademicTerms,
  canViewAcademicTerms,
} from '@/lib/permissions/academic-context';
import { PermissionDeniedState, EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import type { AcademicTermOption } from '@/types/academic-context';

export function AcademicTermsPage() {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const canView = canViewAcademicTerms(user);
  const canManage = canManageAcademicTerms(user);
  const { options: yearOptions } = useAcademicYearOptions();

  const [yearId, setYearId] = useState('');
  const [terms, setTerms] = useState<AcademicTermOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowedActions, setAllowedActions] = useState<Record<string, boolean>>({});
  const [initOpen, setInitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [term1Name, setTerm1Name] = useState('');
  const [term1Start, setTerm1Start] = useState('');
  const [term1End, setTerm1End] = useState('');
  const [term2Name, setTerm2Name] = useState('');
  const [term2Start, setTerm2Start] = useState('');
  const [term2End, setTerm2End] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const loadTerms = useCallback(async () => {
    if (!yearId) {
      setTerms([]);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchAcademicYearTerms(yearId);
    setLoading(false);
    if (!res.success) {
      setError(res.error.message);
      setTerms([]);
      return;
    }
    setTerms(res.data.terms);
    setAllowedActions(res.data.allowed_actions ?? {});
  }, [yearId]);

  useEffect(() => {
    void loadTerms();
  }, [loadTerms]);

  useEffect(() => {
    if (!yearId && yearOptions.length) {
      setYearId(String(yearOptions[0].id));
    }
  }, [yearId, yearOptions]);

  const canInitialize =
    canManage &&
    terms.length === 0 &&
    !loading &&
    Boolean(yearId) &&
    (allowedActions.initialize !== false);

  const columns: Column<AcademicTermOption>[] = useMemo(
    () => [
      {
        key: 'year',
        header: t('academicContext.fields.academicYear'),
        render: (row) => row.academic_year?.name ?? yearOptions.find((y) => String(y.id) === yearId)?.name ?? '—',
      },
      {
        key: 'name',
        header: t('academicContext.fields.term'),
        render: (row) => <span dir="auto">{row.name}</span>,
      },
      {
        key: 'code',
        header: t('academicContext.terms.code'),
        render: (row) => (
          <span dir="ltr">{row.code ?? '—'}</span>
        ),
      },
      {
        key: 'sequence',
        header: t('academicContext.terms.sequence'),
        render: (row) => row.sequence ?? '—',
      },
      {
        key: 'dates',
        header: t('academicContext.terms.dates'),
        render: (row) => (
          <span dir="ltr">
            {row.date_start ?? '—'} → {row.date_end ?? '—'}
          </span>
        ),
      },
      {
        key: 'state',
        header: t('academicContext.terms.state'),
        render: (row) => row.state ?? (row.active === false ? 'inactive' : 'active'),
      },
      {
        key: 'active',
        header: t('academicContext.terms.active'),
        render: (row) =>
          row.active === false ? t('common.no') : t('common.yes'),
      },
    ],
    [t, yearId, yearOptions],
  );

  async function handleInitialize() {
    if (!yearId || submitting) return;
    if (!term1Start || !term1End || !term2Start || !term2End) {
      toast.error(t('academicContext.terms.datesRequiredExplicit'));
      return;
    }
    if (term1Start > term1End || term2Start > term2End) {
      toast.error(t('academicContext.errors.term_dates_invalid'));
      return;
    }
    if (!(term1End < term2Start || term2End < term1Start)) {
      // allow adjacent; block strict overlap
      if (term1Start <= term2End && term2Start <= term1End) {
        setConflictMessage(t('academicContext.errors.term_dates_overlap'));
        return;
      }
    }
    setSubmitting(true);
    setConflictMessage(null);
    const res = await initializeAcademicYearTerms(yearId, {
      term_1_name: term1Name.trim() || null,
      term_1_date_start: term1Start,
      term_1_date_end: term1End,
      term_2_name: term2Name.trim() || null,
      term_2_date_start: term2Start,
      term_2_date_end: term2End,
    });
    setSubmitting(false);
    if (!res.success) {
      const code = res.error.code;
      if (
        code === 'terms_partially_initialized' ||
        code === 'terms_configuration_conflict'
      ) {
        setConflictMessage(
          t(`academicContext.errors.${code}`) !== `academicContext.errors.${code}`
            ? t(`academicContext.errors.${code}`)
            : res.error.message,
        );
        return;
      }
      toast.error(
        t(`academicContext.errors.${code}`) !== `academicContext.errors.${code}`
          ? t(`academicContext.errors.${code}`)
          : res.error.message,
      );
      return;
    }
    toast.success(t('academicContext.terms.initializeSuccess'));
    setInitOpen(false);
    setTerm1Name('');
    setTerm1Start('');
    setTerm1End('');
    setTerm2Name('');
    setTerm2Start('');
    setTerm2End('');
    await loadTerms();
  }

  if (!canView) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  const selectedYearName =
    yearOptions.find((y) => String(y.id) === yearId)?.name ?? '—';

  return (
    <div className="col" style={{ gap: 16 }}>
      <PageHeader
        title={t('academicContext.terms.title')}
        description={t('academicContext.terms.description')}
      />

      <div className="toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label className="field" style={{ minWidth: 220 }}>
          <span>{t('academicContext.fields.academicYear')}</span>
          <select
            className="select"
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            aria-label={t('academicContext.fields.academicYear')}
          >
            <option value="">{t('academicContext.placeholders.academicYear')}</option>
            {yearOptions.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
        {canInitialize ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setInitOpen(true)}
          >
            {t('academicContext.terms.initialize')}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="muted" role="alert">
          {error}
        </p>
      ) : null}

      {!yearId ? (
        <EmptyState title={t('academicContext.hints.chooseYearFirst')} />
      ) : loading ? (
        <p role="status">{t('academicContext.loading')}</p>
      ) : terms.length === 0 ? (
        <EmptyState
          title={t('academicContext.terms.empty')}
          description={
            canManage
              ? t('academicContext.terms.emptyManageHint')
              : t('academicContext.terms.emptyReadonlyHint')
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={terms}
          rowKey={(row) => row.id}
        />
      )}

      {/* Preview of codes as returned (e.g. T1/T2) — no rename */}
      {terms.length > 0 ? (
        <p className="muted tiny" dir="auto">
          {terms.map((term) => formatTermOptionLabel(term)).join(' · ')}
        </p>
      ) : null}

      <ConfirmationDialog
        open={initOpen}
        title={t('academicContext.terms.initialize')}
        size="form"
        closeOnBackdrop={!submitting}
        loading={submitting}
        confirmLabel={t('academicContext.terms.initializeSubmit')}
        onConfirm={() => void handleInitialize()}
        onClose={() => {
          if (!submitting) setInitOpen(false);
        }}
        body={
          <div className="grid grid--form">
            <p className="muted tiny">
              {t('academicContext.terms.initializeYearReadonly')}:{' '}
              <strong dir="auto">{selectedYearName}</strong>
            </p>
            <p className="muted tiny">{t('academicContext.terms.datesRequiredExplicit')}</p>
            {conflictMessage ? (
              <p role="alert" className="academic-context-filters__error">
                {conflictMessage}
              </p>
            ) : null}
            <label className="field">
              <span>{t('academicContext.terms.term1Name')}</span>
              <input
                className="input"
                value={term1Name}
                onChange={(e) => setTerm1Name(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.term1Start')} *</span>
              <input
                className="input"
                type="date"
                value={term1Start}
                onChange={(e) => setTerm1Start(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.term1End')} *</span>
              <input
                className="input"
                type="date"
                value={term1End}
                onChange={(e) => setTerm1End(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.term2Name')}</span>
              <input
                className="input"
                value={term2Name}
                onChange={(e) => setTerm2Name(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.term2Start')} *</span>
              <input
                className="input"
                type="date"
                value={term2Start}
                onChange={(e) => setTerm2Start(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.term2End')} *</span>
              <input
                className="input"
                type="date"
                value={term2End}
                onChange={(e) => setTerm2End(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
            <div className="muted tiny" dir="ltr">
              <strong>{t('academicContext.terms.preview')}</strong>
              <br />
              1: {term1Name || '—'} {term1Start || '…'} → {term1End || '…'}
              <br />
              2: {term2Name || '—'} {term2Start || '…'} → {term2End || '…'}
            </div>
          </div>
        }
      />
    </div>
  );
}
