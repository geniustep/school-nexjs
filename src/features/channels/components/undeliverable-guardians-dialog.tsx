'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * On-demand undeliverable guardians drill-down (Odoo 255).
 * GET only; no PII beyond id/name; closes on school context change via parent.
 */

import { useEffect, useRef, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  listUndeliverableGuardians,
} from '@/features/channels/api/admin-channels-api';
import {
  UNDELIVERABLE_PAGE_SIZE,
  normalizeUndeliverableGuardianRows,
  undeliverableAccountStatusKey,
  undeliverableGuardiansErrorKey,
  undeliverableHasMore,
} from '@/features/channels/utils/undeliverable-guardians-present';
import type { AdminChannel, UndeliverableGuardianRow } from '@/types/admin-channel';
import type { ApiMeta } from '@/types/api';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; rows: UndeliverableGuardianRow[]; meta: ApiMeta }
  | { kind: 'error'; messageKey: string };

export function UndeliverableGuardiansDialog({
  open,
  channel,
  onClose,
}: {
  open: boolean;
  channel: AdminChannel | null;
  onClose: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' });
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestGenRef = useRef(0);
  const schoolAtOpenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !channel) {
      setLoadState({ kind: 'idle' });
      setPage(1);
      setLoadingMore(false);
      return;
    }

    schoolAtOpenRef.current = activeSchoolId ?? null;
    const gen = ++requestGenRef.current;
    setLoadState({ kind: 'loading' });
    setPage(1);

    const query =
      activeSchoolId != null
        ? { page: 1, page_size: UNDELIVERABLE_PAGE_SIZE, active_school_id: activeSchoolId }
        : { page: 1, page_size: UNDELIVERABLE_PAGE_SIZE };

    void listUndeliverableGuardians(channel.id, query).then((res) => {
      if (gen !== requestGenRef.current) return;
      if (schoolAtOpenRef.current !== (activeSchoolId ?? null)) return;
      if (!res.success) {
        setLoadState({
          kind: 'error',
          messageKey: undeliverableGuardiansErrorKey(res.error),
        });
        return;
      }
      setLoadState({
        kind: 'ready',
        rows: normalizeUndeliverableGuardianRows(res.data),
        meta: res.meta ?? {},
      });
    });

    return () => {
      requestGenRef.current += 1;
    };
  }, [open, channel, activeSchoolId]);

  async function loadMore() {
    if (!channel || loadState.kind !== 'ready' || loadingMore) return;
    if (!undeliverableHasMore(loadState.rows.length, loadState.meta)) return;

    const nextPage = page + 1;
    const gen = requestGenRef.current;
    setLoadingMore(true);
    const query =
      activeSchoolId != null
        ? {
            page: nextPage,
            page_size: UNDELIVERABLE_PAGE_SIZE,
            active_school_id: activeSchoolId,
          }
        : { page: nextPage, page_size: UNDELIVERABLE_PAGE_SIZE };

    const res = await listUndeliverableGuardians(channel.id, query);
    setLoadingMore(false);
    if (gen !== requestGenRef.current) return;
    if (schoolAtOpenRef.current !== (activeSchoolId ?? null)) return;
    if (!res.success) {
      setLoadState({
        kind: 'error',
        messageKey: undeliverableGuardiansErrorKey(res.error),
      });
      return;
    }
    const nextRows = normalizeUndeliverableGuardianRows(res.data);
    setPage(nextPage);
    setLoadState({
      kind: 'ready',
      rows: [...loadState.rows, ...nextRows],
      meta: res.meta ?? {},
    });
  }

  async function retry() {
    if (!channel) return;
    const gen = ++requestGenRef.current;
    schoolAtOpenRef.current = activeSchoolId ?? null;
    setLoadState({ kind: 'loading' });
    setPage(1);
    const query =
      activeSchoolId != null
        ? { page: 1, page_size: UNDELIVERABLE_PAGE_SIZE, active_school_id: activeSchoolId }
        : { page: 1, page_size: UNDELIVERABLE_PAGE_SIZE };
    const res = await listUndeliverableGuardians(channel.id, query);
    if (gen !== requestGenRef.current) return;
    if (!res.success) {
      setLoadState({
        kind: 'error',
        messageKey: undeliverableGuardiansErrorKey(res.error),
      });
      return;
    }
    setLoadState({
      kind: 'ready',
      rows: normalizeUndeliverableGuardianRows(res.data),
      meta: res.meta ?? {},
    });
  }

  const canLoadMore =
    loadState.kind === 'ready' && undeliverableHasMore(loadState.rows.length, loadState.meta);

  return (
    <ConfirmationDialog
      open={open}
      size="wide"
      closeOnBackdrop
      loading={false}
      title={t('channels.audience.undeliverable.title')}
      confirmLabel={
        loadState.kind === 'error'
          ? t('channels.audience.undeliverable.retry')
          : t('common.close')
      }
      cancelLabel={t('common.cancel')}
      onConfirm={() => {
        if (loadState.kind === 'error') {
          void retry();
          return;
        }
        onClose();
      }}
      onClose={onClose}
      body={
        <div
          className="undeliverable-guardians"
          data-testid="undeliverable-guardians-dialog"
        >
          <p className="muted tiny" dir="auto">
            {t('channels.audience.undeliverable.description')}
          </p>

          {loadState.kind === 'loading' ? (
            <p role="status" aria-live="polite">
              {t('channels.audience.undeliverable.loading')}
            </p>
          ) : null}

          {loadState.kind === 'error' ? (
            <p className="form-error" role="alert" aria-live="assertive">
              {t(loadState.messageKey)}
            </p>
          ) : null}

          {loadState.kind === 'ready' && loadState.rows.length === 0 ? (
            <p role="status">{t('channels.audience.undeliverable.empty')}</p>
          ) : null}

          {loadState.kind === 'ready' && loadState.rows.length > 0 ? (
            <ul className="undeliverable-guardians__list" role="list">
              {loadState.rows.map((row) => (
                <li
                  key={`${row.guardian.id}-${row.reason_code}-${row.account_status}`}
                  className="undeliverable-guardians__row"
                  data-testid={`undeliverable-guardian-${row.guardian.id}`}
                >
                  <p dir="auto">
                    <span className="muted tiny">
                      {t('channels.audience.undeliverable.guardianLabel')}:{' '}
                    </span>
                    <strong>{row.guardian.name}</strong>
                  </p>
                  {row.students.length > 0 ? (
                    <ul className="undeliverable-guardians__students">
                      {row.students.map((student) => (
                        <li key={student.id} dir="auto">
                          <span className="muted tiny">
                            {t('channels.audience.undeliverable.studentLabel')}:{' '}
                          </span>
                          {student.name}
                          <span className="channels-list__meta-sep" aria-hidden="true">
                            ·
                          </span>
                          <span className="muted tiny">
                            {t('channels.audience.undeliverable.classLabel')}:{' '}
                          </span>
                          {student.class.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p dir="auto" data-testid={`undeliverable-status-${row.guardian.id}`}>
                    <span className="muted tiny">
                      {t('channels.audience.undeliverable.statusLabel')}:{' '}
                    </span>
                    {t(undeliverableAccountStatusKey(row.account_status))}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {canLoadMore ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              aria-label={t('channels.audience.undeliverable.loadMore')}
            >
              {loadingMore
                ? t('channels.audience.undeliverable.loading')
                : t('channels.audience.undeliverable.loadMore')}
            </button>
          ) : null}
        </div>
      }
    />
  );
}
