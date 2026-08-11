'use client';

/**
 * Academic Terms management — global-year-scoped list, create, initialize, and edit.
 * Confirmed (active) terms allow date edits without draft toggle.
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAcademicTerm,
  fetchAcademicYearTerms,
  initializeAcademicYearTerms,
  updateAcademicTerm,
} from '@/features/academic-context/api/academic-context-api';
import { formatTermOptionLabel } from '@/features/academic-context/utils/academic-context-display';
import {
  buildTermUpdatePayload,
  validateCreateTermForm,
  validateTermEditForm,
  type CreateTermFormValues,
  type TermEditFormValues,
} from '@/features/academic-context/utils/build-term-update-payload';
import { resolveAcademicTermEditErrorMessage } from '@/features/academic-context/utils/term-edit-errors';
import {
  canEditAcademicTermDates,
  canEditAcademicTermIdentity,
  canShowEditAcademicTerm,
} from '@/features/academic-context/utils/term-editability';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  canManageAcademicTerms,
  canViewAcademicTerms,
} from '@/lib/permissions/academic-context';
import {
  PermissionDeniedState,
  EmptyState,
  LoadingState,
  ErrorState,
} from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import type { AcademicTermOption } from '@/types/academic-context';

const EMPTY_EDIT_FORM: TermEditFormValues = {
  name: '',
  code: '',
  date_start: '',
  date_end: '',
};

const EMPTY_CREATE_FORM: CreateTermFormValues = {
  name: '',
  code: '',
  date_start: '',
  date_end: '',
};

function termStateLabel(
  state: string | null | undefined,
  translate: (key: string) => string,
): string {
  if (state === 'draft') return translate('academicContext.terms.stateDraft');
  if (state === 'active') return translate('academicContext.terms.stateActive');
  if (state === 'done' || state === 'completed') {
    return translate('academicContext.terms.stateDone');
  }
  return state ?? '—';
}

export function AcademicTermsPage() {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const canView = canViewAcademicTerms(user);
  const canManage = canManageAcademicTerms(user);
  const {
    activeAcademicYearId,
    academicYears: yearOptions,
    academicYearLoading,
    academicYearError,
  } = useAdminSession();
  const yearId = activeAcademicYearId != null ? String(activeAcademicYearId) : '';

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

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTermFormValues>(EMPTY_CREATE_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTerm, setEditTerm] = useState<AcademicTermOption | null>(null);
  const [editForm, setEditForm] = useState<TermEditFormValues>(EMPTY_EDIT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const canInitialize =
    canManage &&
    terms.length === 0 &&
    !loading &&
    Boolean(yearId) &&
    (allowedActions.initialize !== false);

  const canCreate = canManage && Boolean(yearId) && !loading;

  const editIdentityAllowed = editTerm ? canEditAcademicTermIdentity(editTerm) : false;
  const editDatesAllowed = editTerm ? canEditAcademicTermDates(editTerm) : false;

  function openEditDialog(term: AcademicTermOption) {
    setEditTerm(term);
    setEditForm({
      name: term.name ?? '',
      code: term.code ?? '',
      date_start: term.date_start ?? '',
      date_end: term.date_end ?? '',
    });
    setEditError(null);
  }

  function closeEditDialog() {
    if (editSubmitting) return;
    setEditTerm(null);
    setEditForm(EMPTY_EDIT_FORM);
    setEditError(null);
  }

  function openCreateDialog() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    if (createSubmitting) return;
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
  }

  async function handleCreateSave() {
    if (!yearId || createSubmitting) return;

    const validation = validateCreateTermForm(createForm);
    if (validation) {
      const validationKey =
        validation === 'name_required'
          ? 'academicContext.terms.editNameRequired'
          : validation === 'code_required'
            ? 'academicContext.terms.editCodeRequired'
            : validation === 'date_start_required'
              ? 'academicContext.terms.editDateStartRequired'
              : validation === 'date_end_required'
                ? 'academicContext.terms.editDateEndRequired'
                : 'academicContext.errors.term_dates_invalid';
      setCreateError(t(validationKey));
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    const res = await createAcademicTerm(yearId, {
      name: createForm.name.trim(),
      code: createForm.code.trim(),
      date_start: createForm.date_start,
      date_end: createForm.date_end,
    });
    setCreateSubmitting(false);

    if (!res.success) {
      const message = resolveAcademicTermEditErrorMessage(res.error, t);
      setCreateError(message);
      toast.error(message);
      return;
    }

    toast.success(t('academicContext.terms.createSuccess'));
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    await loadTerms();
  }

  async function handleEditSave() {
    if (!editTerm || editSubmitting) return;

    const validation = validateTermEditForm(editForm, {
      requireIdentity: editIdentityAllowed,
    });
    if (validation) {
      const validationKey =
        validation === 'name_required'
          ? 'academicContext.terms.editNameRequired'
          : validation === 'code_required'
            ? 'academicContext.terms.editCodeRequired'
            : validation === 'date_start_required'
              ? 'academicContext.terms.editDateStartRequired'
              : validation === 'date_end_required'
                ? 'academicContext.errors.term_dates_invalid';
      setEditError(t(validationKey));
      return;
    }

    const payload = buildTermUpdatePayload(editTerm, editForm, {
      includeIdentity: editIdentityAllowed,
    });
    if (!payload) {
      setEditError(t('academicContext.terms.editNoChanges'));
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    const res = await updateAcademicTerm(editTerm.id, payload);
    setEditSubmitting(false);

    if (!res.success) {
      const message = resolveAcademicTermEditErrorMessage(res.error, t);
      setEditError(message);
      toast.error(message);
      return;
    }

    setTerms((prev) =>
      prev.map((row) => (row.id === res.data.id ? res.data : row)),
    );
    toast.success(t('academicContext.terms.editSuccess'));
    setEditTerm(null);
    setEditForm(EMPTY_EDIT_FORM);
    setEditError(null);
  }

  const columns: Column<AcademicTermOption>[] = useMemo(
    () => [
      {
        key: 'year',
        header: t('academicContext.fields.academicYear'),
        render: (row) =>
          row.academic_year?.name ??
          yearOptions.find((y) => String(y.id) === yearId)?.name ??
          '—',
      },
      {
        key: 'name',
        header: t('academicContext.fields.term'),
        render: (row) => <span dir="auto">{row.name}</span>,
      },
      {
        key: 'code',
        header: t('academicContext.terms.code'),
        render: (row) => <span dir="ltr">{row.code ?? '—'}</span>,
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
        render: (row) => termStateLabel(row.state, t),
      },
      {
        key: 'active',
        header: t('academicContext.terms.active'),
        render: (row) =>
          row.active === false ? t('common.no') : t('common.yes'),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) =>
          canShowEditAcademicTerm(row, canManage) ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => openEditDialog(row)}
            >
              {t('academicContext.terms.edit')}
            </button>
          ) : null,
      },
    ],
    [t, yearId, yearOptions, canManage],
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

  if (academicYearLoading || (!activeAcademicYearId && !academicYearError)) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (academicYearError) {
    return <ErrorState error={academicYearError} />;
  }

  const selectedYearName =
    yearOptions.find((y) => String(y.id) === yearId)?.name ?? '—';

  return (
    <div className="col" style={{ gap: 16 }}>
      <PageHeader
        title={t('academicContext.terms.title')}
        subtitle={t('academicContext.terms.description')}
      />

      <div className="toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
        {canCreate ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={openCreateDialog}
          >
            {t('academicContext.terms.create')}
          </button>
        ) : null}
        {canInitialize ? (
          <button
            type="button"
            className="btn btn--ghost"
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
          action={
            canCreate ? (
              <button type="button" className="btn btn--primary" onClick={openCreateDialog}>
                {t('academicContext.terms.create')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={terms}
          rowKey={(row) => row.id}
        />
      )}

      {terms.length > 0 ? (
        <p className="muted tiny" dir="auto">
          {terms.map((term) => formatTermOptionLabel(term)).join(' · ')}
        </p>
      ) : null}

      <ConfirmationDialog
        open={createOpen}
        title={t('academicContext.terms.createTitle')}
        size="form"
        closeOnBackdrop={!createSubmitting}
        loading={createSubmitting}
        confirmLabel={t('academicContext.terms.createSubmit')}
        onConfirm={() => handleCreateSave()}
        onClose={closeCreateDialog}
        body={
          <div className="grid grid--form">
            <p className="muted tiny">
              {t('academicContext.terms.initializeYearReadonly')}:{' '}
              <strong dir="auto">{selectedYearName}</strong>
            </p>
            {createError ? (
              <p role="alert" className="academic-context-filters__error">
                {createError}
              </p>
            ) : null}
            <label className="field">
              <span>{t('academicContext.terms.editName')}</span>
              <input
                className="input"
                name="create_term_name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={createSubmitting}
                required
                aria-label={t('academicContext.terms.editName')}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.editCode')}</span>
              <input
                className="input"
                name="create_term_code"
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, code: e.target.value }))
                }
                disabled={createSubmitting}
                required
                aria-label={t('academicContext.terms.editCode')}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.editDateStart')}</span>
              <input
                className="input"
                type="date"
                name="create_term_date_start"
                value={createForm.date_start}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, date_start: e.target.value }))
                }
                disabled={createSubmitting}
                required
                aria-label={t('academicContext.terms.editDateStart')}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.editDateEnd')}</span>
              <input
                className="input"
                type="date"
                name="create_term_date_end"
                value={createForm.date_end}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, date_end: e.target.value }))
                }
                disabled={createSubmitting}
                required
                aria-label={t('academicContext.terms.editDateEnd')}
              />
            </label>
          </div>
        }
      />

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

      <ConfirmationDialog
        open={Boolean(editTerm)}
        title={t('academicContext.terms.editTitle')}
        size="form"
        closeOnBackdrop={!editSubmitting}
        loading={editSubmitting}
        confirmLabel={t('academicContext.terms.saveEdit')}
        onConfirm={() => handleEditSave()}
        onClose={closeEditDialog}
        body={
          <div className="grid grid--form">
            {editTerm ? (
              <p className="muted tiny" dir="auto">
                {t('academicContext.terms.state')}:{' '}
                <strong>{termStateLabel(editTerm.state, t)}</strong>
              </p>
            ) : null}
            {editError ? (
              <p role="alert" className="academic-context-filters__error">
                {editError}
              </p>
            ) : null}
            <label className="field">
              <span>{t('academicContext.terms.editName')}</span>
              <input
                className="input"
                name="term_name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={editSubmitting || !editIdentityAllowed}
                required={editIdentityAllowed}
                readOnly={!editIdentityAllowed}
                aria-label={t('academicContext.terms.editName')}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.editCode')}</span>
              <input
                className="input"
                name="term_code"
                value={editForm.code}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, code: e.target.value }))
                }
                disabled={editSubmitting || !editIdentityAllowed}
                required={editIdentityAllowed}
                readOnly={!editIdentityAllowed}
                aria-label={t('academicContext.terms.editCode')}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.editDateStart')}</span>
              <input
                className="input"
                type="date"
                name="term_date_start"
                value={editForm.date_start}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, date_start: e.target.value }))
                }
                disabled={editSubmitting || !editDatesAllowed}
                required
                aria-label={t('academicContext.terms.editDateStart')}
              />
            </label>
            <label className="field">
              <span>{t('academicContext.terms.editDateEnd')}</span>
              <input
                className="input"
                type="date"
                name="term_date_end"
                value={editForm.date_end}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, date_end: e.target.value }))
                }
                disabled={editSubmitting || !editDatesAllowed}
                required
                aria-label={t('academicContext.terms.editDateEnd')}
              />
            </label>
          </div>
        }
      />
    </div>
  );
}
