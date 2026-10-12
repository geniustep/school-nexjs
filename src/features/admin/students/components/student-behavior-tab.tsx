'use client';

import { useMemo, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type {
  BehaviorCategory,
  BehaviorEvent,
  BehaviorIncident,
} from '@/types/student-behavior';
import {
  recordBehaviorEvent,
  recoverBehaviorScore,
  resolveBehaviorIncident,
  reverseBehaviorEvent,
} from '../api/student-behavior-api';
import { useStudentBehavior } from '../hooks/use-student-behavior';
import {
  BEHAVIOR_CATEGORY_ORDER,
  formatBehaviorDelta,
  groupBehaviorEventTypes,
  isBehaviorCategory,
} from '../utils/student-behavior';
import './student-behavior.css';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function newIdempotencyKey(studentId: number): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return 'student-behavior:' + studentId + ':' + crypto.randomUUID();
  }
  return 'student-behavior:' + studentId + ':' + Date.now();
}

export function StudentBehaviorTab({
  studentId,
  canManage,
}: {
  studentId: number;
  canManage: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const state = useStudentBehavior(studentId, true);

  const [category, setCategory] = useState<BehaviorCategory>('discipline');
  const [eventCode, setEventCode] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [reverseTarget, setReverseTarget] = useState<number | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const [recoveryAmount, setRecoveryAmount] = useState(1);
  const [recoveryReason, setRecoveryReason] = useState('');

  const [resolveTarget, setResolveTarget] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const grouped = useMemo(
    () => groupBehaviorEventTypes(state.eventTypes),
    [state.eventTypes],
  );
  const availableEvents = grouped.get(category) ?? [];
  const selectedType =
    state.eventTypes.find((item) => item.code === eventCode) ?? null;
  const openIncidents = useMemo(
    () =>
      (state.data?.events ?? [])
        .map((event) => event.incident)
        .filter(
          (incident): incident is BehaviorIncident =>
            Boolean(incident && incident.state === 'open'),
        ),
    [state.data?.events],
  );

  if (state.loading && !state.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (state.error || !state.data) {
    return <ApiErrorView error={state.error!} onRetry={state.reload} />;
  }

  const snapshot = state.data;
  const allowed = snapshot.allowed_actions;
  const canRecord = canManage && allowed.record_event;
  const canRecover = canManage && allowed.recover;
  const canReverse = canManage && allowed.reverse_event;
  const canResolve = canManage && allowed.resolve_incident;

  async function handleRecordEvent(event: React.FormEvent) {
    event.preventDefault();
    if (!canRecord || !selectedType) return;

    const trimmedNote = note.trim();
    if (selectedType.note_required && !trimmedNote) {
      toast.warning(t('admin.student360.behavior.noteRequired'));
      return;
    }

    setSubmitting(true);
    const response = await recordBehaviorEvent(studentId, activeSchoolId, {
      event_type_code: selectedType.code,
      note: trimmedNote || undefined,
      academic_year_id: snapshot.academic_year.id,
      idempotency_key: newIdempotencyKey(studentId),
    });
    setSubmitting(false);

    if (!response.success) {
      toast.error(
        response.error.message || t('admin.student360.behavior.actionFailed'),
      );
      return;
    }

    setEventCode('');
    setNote('');
    toast.success(t('admin.student360.behavior.eventSaved'));
    state.reload();
  }

  async function handleReverse(event: BehaviorEvent) {
    const reason = reverseReason.trim();
    if (!reason) {
      toast.warning(t('admin.student360.behavior.reverseReasonRequired'));
      return;
    }

    setSubmitting(true);
    const response = await reverseBehaviorEvent(
      studentId,
      event.id,
      activeSchoolId,
      reason,
    );
    setSubmitting(false);

    if (!response.success) {
      toast.error(
        response.error.message || t('admin.student360.behavior.actionFailed'),
      );
      return;
    }

    setReverseTarget(null);
    setReverseReason('');
    toast.success(t('admin.student360.behavior.eventReversed'));
    state.reload();
  }

  async function handleRecovery(event: React.FormEvent) {
    event.preventDefault();
    const reason = recoveryReason.trim();
    if (!reason) {
      toast.warning(t('admin.student360.behavior.recoveryReasonRequired'));
      return;
    }

    setSubmitting(true);
    const response = await recoverBehaviorScore(studentId, activeSchoolId, {
      amount: recoveryAmount,
      reason,
      academic_year_id: snapshot.academic_year.id,
    });
    setSubmitting(false);

    if (!response.success) {
      toast.error(
        response.error.message || t('admin.student360.behavior.actionFailed'),
      );
      return;
    }

    setRecoveryAmount(1);
    setRecoveryReason('');
    toast.success(t('admin.student360.behavior.recoverySaved'));
    state.reload();
  }

  async function handleResolve(incident: BehaviorIncident) {
    const reason = resolutionNote.trim();
    if (!reason) {
      toast.warning(t('admin.student360.behavior.resolutionRequired'));
      return;
    }

    setSubmitting(true);
    const response = await resolveBehaviorIncident(
      studentId,
      incident.id,
      activeSchoolId,
      reason,
    );
    setSubmitting(false);

    if (!response.success) {
      toast.error(
        response.error.message || t('admin.student360.behavior.actionFailed'),
      );
      return;
    }

    setResolveTarget(null);
    setResolutionNote('');
    toast.success(t('admin.student360.behavior.incidentResolved'));
    state.reload();
  }

  return (
    <div className="student-behavior student-360-tab-panel">
      <section
        className="student-behavior__summary"
        aria-label={t('admin.student360.behavior.currentBalance')}
      >
        <div className="student-behavior__score">
          <span className="student-behavior__score-value">
            {snapshot.current_balance}
          </span>
          <span className="student-behavior__score-total">/ 100</span>
        </div>

        <div className="student-behavior__summary-grid">
          <div>
            <span>{t('admin.student360.behavior.academicYear')}</span>
            <strong>{snapshot.academic_year.name}</strong>
          </div>
          <div>
            <span>{t('admin.student360.behavior.startingBalance')}</span>
            <strong>{snapshot.starting_balance}</strong>
          </div>
          <div>
            <span>{t('admin.student360.behavior.openIncidents')}</span>
            <strong>{snapshot.open_incidents}</strong>
          </div>
          <div>
            <span>{t('admin.student360.behavior.policyVersion')}</span>
            <strong>{snapshot.policy_version}</strong>
          </div>
        </div>

        <div
          className="student-behavior__score-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={snapshot.current_balance}
        >
          <span style={{ width: snapshot.current_balance + '%' }} />
        </div>
      </section>

      {canRecord ? (
        <section className="student-behavior__card">
          <header>
            <h2>{t('admin.student360.behavior.recordEvent')}</h2>
            <p>{t('admin.student360.behavior.recordEventHint')}</p>
          </header>

          <form className="student-behavior__form" onSubmit={handleRecordEvent}>
            <label>
              <span>{t('admin.student360.behavior.category')}</span>
              <select
                value={category}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isBehaviorCategory(next)) {
                    setCategory(next);
                    setEventCode('');
                  }
                }}
              >
                {BEHAVIOR_CATEGORY_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {t('admin.student360.behavior.categories.' + item)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t('admin.student360.behavior.event')}</span>
              <select
                value={eventCode}
                onChange={(event) => setEventCode(event.target.value)}
              >
                <option value="">
                  {t('admin.student360.behavior.selectEvent')}
                </option>
                {availableEvents.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} ({formatBehaviorDelta(item.default_delta)})
                  </option>
                ))}
              </select>
            </label>

            {selectedType ? (
              <div className="student-behavior__impact" aria-live="polite">
                <span>{t('admin.student360.behavior.impact')}</span>
                <strong>{formatBehaviorDelta(selectedType.default_delta)}</strong>
                <span
                  className={
                    'student-behavior__severity student-behavior__severity--' +
                    selectedType.severity
                  }
                >
                  {t(
                    'admin.student360.behavior.severities.' +
                      selectedType.severity,
                  )}
                </span>
                {selectedType.incident_required ? (
                  <span className="student-behavior__incident-chip">
                    {t('admin.student360.behavior.incidentRequired')}
                  </span>
                ) : null}
              </div>
            ) : null}

            <label className="student-behavior__form-wide">
              <span>
                {t('admin.student360.behavior.note')}
                {selectedType?.note_required ? ' *' : ''}
              </span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('admin.student360.behavior.notePlaceholder')}
              />
            </label>

            <div className="student-behavior__form-actions student-behavior__form-wide">
              <button
                type="submit"
                className="student-behavior__button student-behavior__button--primary"
                disabled={
                  submitting ||
                  !selectedType ||
                  (selectedType.note_required && !note.trim())
                }
              >
                {submitting
                  ? t('admin.student360.behavior.saving')
                  : t('admin.student360.behavior.saveEvent')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="student-behavior__two-column">
        {canRecover ? (
          <section className="student-behavior__card">
            <header>
              <h2>{t('admin.student360.behavior.recovery')}</h2>
              <p>{t('admin.student360.behavior.recoveryDesc')}</p>
            </header>

            <form className="student-behavior__stack" onSubmit={handleRecovery}>
              <label>
                <span>{t('admin.student360.behavior.recoveryAmount')}</span>
                <select
                  value={recoveryAmount}
                  onChange={(event) =>
                    setRecoveryAmount(Number(event.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5].map((amount) => (
                    <option key={amount} value={amount}>
                      +{amount}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('admin.student360.behavior.recoveryReason')}</span>
                <textarea
                  rows={3}
                  value={recoveryReason}
                  onChange={(event) => setRecoveryReason(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="student-behavior__button student-behavior__button--secondary"
                disabled={submitting || !recoveryReason.trim()}
              >
                {t('admin.student360.behavior.applyRecovery')}
              </button>
            </form>
          </section>
        ) : null}

        {openIncidents.length > 0 ? (
          <section className="student-behavior__card">
            <header>
              <h2>{t('admin.student360.behavior.incidents')}</h2>
              <p>{t('admin.student360.behavior.incidentsDesc')}</p>
            </header>
            <div className="student-behavior__stack">
              {openIncidents.map((incident) => (
                <article
                  key={incident.id}
                  className="student-behavior__incident"
                >
                  <div>
                    <strong>{incident.description}</strong>
                    <small>{formatDateTime(incident.occurred_at)}</small>
                  </div>

                  {canResolve ? (
                    resolveTarget === incident.id ? (
                      <div className="student-behavior__inline-action">
                        <textarea
                          rows={2}
                          value={resolutionNote}
                          onChange={(event) =>
                            setResolutionNote(event.target.value)
                          }
                          placeholder={t(
                            'admin.student360.behavior.resolutionNote',
                          )}
                        />
                        <div>
                          <button
                            type="button"
                            className="student-behavior__button student-behavior__button--secondary"
                            onClick={() => handleResolve(incident)}
                            disabled={submitting || !resolutionNote.trim()}
                          >
                            {t('admin.student360.behavior.confirmResolve')}
                          </button>
                          <button
                            type="button"
                            className="student-behavior__button"
                            onClick={() => {
                              setResolveTarget(null);
                              setResolutionNote('');
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="student-behavior__button"
                        onClick={() => setResolveTarget(incident.id)}
                      >
                        {t('admin.student360.behavior.resolveIncident')}
                      </button>
                    )
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <section className="student-behavior__card">
        <header>
          <h2>{t('admin.student360.behavior.events')}</h2>
          <p>{t('admin.student360.behavior.eventsDesc')}</p>
        </header>

        {snapshot.events.length === 0 ? (
          <div className="student-behavior__empty">
            <strong>{t('admin.student360.behavior.noEvents')}</strong>
            <span>{t('admin.student360.behavior.noEventsDesc')}</span>
          </div>
        ) : (
          <div className="student-behavior__timeline">
            {snapshot.events.map((event) => (
              <article
                key={event.id}
                className={
                  'student-behavior__event ' +
                  (event.state === 'reversed'
                    ? 'student-behavior__event--reversed'
                    : '')
                }
              >
                <div className="student-behavior__event-delta">
                  {formatBehaviorDelta(event.applied_delta)}
                </div>

                <div className="student-behavior__event-body">
                  <div className="student-behavior__event-head">
                    <div>
                      <strong>{event.type.name}</strong>
                      <span>
                        {t(
                          'admin.student360.behavior.categories.' +
                            event.type.category,
                        )}
                      </span>
                    </div>
                    <div className="student-behavior__event-meta">
                      <span>{formatDateTime(event.occurred_at)}</span>
                      {event.state === 'reversed' ? (
                        <span className="student-behavior__reversed">
                          {t('admin.student360.behavior.reversed')}
                        </span>
                      ) : null}
                      {event.incident ? (
                        <span className="student-behavior__incident-chip">
                          {t('admin.student360.behavior.incident')}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {event.note ? <p>{event.note}</p> : null}
                  <small>
                    {event.actor?.name
                      ? t('admin.student360.behavior.recordedBy') +
                        ': ' +
                        event.actor.name
                      : t('admin.student360.behavior.systemRecord')}
                  </small>

                  {canReverse && event.state === 'active' ? (
                    reverseTarget === event.id ? (
                      <div className="student-behavior__inline-action">
                        <textarea
                          rows={2}
                          value={reverseReason}
                          onChange={(input) =>
                            setReverseReason(input.target.value)
                          }
                          placeholder={t(
                            'admin.student360.behavior.reverseReason',
                          )}
                        />
                        <div>
                          <button
                            type="button"
                            className="student-behavior__button student-behavior__button--danger"
                            disabled={submitting || !reverseReason.trim()}
                            onClick={() => handleReverse(event)}
                          >
                            {t('admin.student360.behavior.confirmReverse')}
                          </button>
                          <button
                            type="button"
                            className="student-behavior__button"
                            onClick={() => {
                              setReverseTarget(null);
                              setReverseReason('');
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="student-behavior__text-action"
                        onClick={() => setReverseTarget(event.id)}
                      >
                        {t('admin.student360.behavior.reverse')}
                      </button>
                    )
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="student-behavior__card">
        <header>
          <h2>{t('admin.student360.behavior.ledger')}</h2>
          <p>{t('admin.student360.behavior.ledgerDesc')}</p>
        </header>

        {snapshot.transactions.length === 0 ? (
          <div className="student-behavior__empty">
            <span>{t('admin.student360.behavior.noTransactions')}</span>
          </div>
        ) : (
          <div className="student-behavior__ledger">
            {snapshot.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="student-behavior__ledger-row"
              >
                <span className="student-behavior__ledger-delta">
                  {formatBehaviorDelta(transaction.delta)}
                </span>
                <span>
                  {t(
                    'admin.student360.behavior.transactionKinds.' +
                      transaction.kind,
                  )}
                </span>
                <span>{transaction.reason || '—'}</span>
                <span>{formatDateTime(transaction.created_at)}</span>
                <strong>{transaction.balance_after}/100</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
