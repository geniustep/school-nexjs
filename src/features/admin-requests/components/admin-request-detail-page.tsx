'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { localeToBcp47, type Locale } from '@/lib/i18n/config';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, DefinitionList, PageHeader, SectionHead } from '@/components/ui/primitives';
import {
  createAdminRequestUploadSession,
  postAdminAction,
  postAdminApproveReply,
  postAdminRequestReplyChanges,
  postRequesterAction,
  postStaffReply,
  uploadAdminRequestFile,
  type AdminRequestReviewOutcome,
} from '../api';
import { adminRequestMessage } from '../i18n';
import {
  adminRequestActionLabel,
  adminRequestErrorLabel,
  adminRequestReviewStateLabel,
  adminRequestRoleLabel,
  adminRequestStateLabel,
  adminRequestTypeLabel,
  staffOptionRows,
} from '../presenters';
import type {
  AdminRequest,
  AdminRequestAttachment,
  AdminRequestReply,
  AdminRequestRole,
} from '../types';
import { adminRequestApiBase, adminRequestUiBase, requestTitle } from '../types';
import { AdminRequestAppointmentPanel } from './admin-request-appointment-panel';
import { AdminRequestFilePicker } from './admin-request-file-picker';

function AttachmentList({
  attachments,
  locale,
}: {
  attachments?: AdminRequestAttachment[];
  locale: Locale;
}) {
  if (!attachments?.length) return null;
  const numberLocale = localeToBcp47(locale);
  return (
    <ul className="col" style={{ gap: 8, paddingInlineStart: 18 }}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a href={`/api/odoo/attachments/${attachment.id}/download`} className="btn btn--ghost btn--sm" dir="auto">
            {attachment.name}
          </a>
          <span className="tiny muted">
            {' · '}{attachment.mimetype ?? adminRequestMessage(locale, 'common.file')}
            {attachment.size
              ? ` · ${adminRequestMessage(locale, 'common.bytes', { count: attachment.size.toLocaleString(numberLocale) })}`
              : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function isFamilyRole(role: AdminRequestRole): role is 'parent' | 'student' {
  return role === 'parent' || role === 'student';
}

type ReviewMode = { replyId: number; action: 'approve' | 'changes' } | null;

const APPOINTMENT_ACTIONS = new Set([
  'confirm_appointment',
  'request_appointment_change',
  'propose_appointment',
]);

export function AdminRequestDetailPage({ role, requestId }: { role: AdminRequestRole; requestId: string }) {
  const { locale } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const apiBase = adminRequestApiBase(role);
  const uiBase = adminRequestUiBase(role);
  const state = useResource<AdminRequest>(`${apiBase}/${requestId}`, undefined, { keepPreviousData: false });
  const staffOptions = useResource<unknown>(role === 'admin' ? endpoints.admin.staffOptions : null, undefined, {
    keepPreviousData: false,
  });
  const [reply, setReply] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState<AdminRequestReviewOutcome>('waiting_requester');
  const [reviewResolution, setReviewResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const staffRows = staffOptions.data ? staffOptionRows(staffOptions.data) : [];

  function resetReview() {
    setReviewMode(null);
    setReviewReason('');
    setReviewOutcome('waiting_requester');
    setReviewResolution('');
  }

  function openReview(item: AdminRequestReply, action: 'approve' | 'changes') {
    setError(null);
    setSuccess(null);
    setReviewMode({ replyId: item.id, action });
    setReviewReason('');
    setReviewOutcome('waiting_requester');
    setReviewResolution('');
  }

  async function submitReview(item: AdminRequestReply) {
    if (!reviewMode || reviewMode.replyId !== item.id || role !== 'admin') return;
    setError(null);
    setSuccess(null);
    if (reviewMode.action === 'changes' && !reviewReason.trim()) {
      setError(adminRequestMessage(locale, 'error.reviewReasonRequired'));
      return;
    }
    if (
      reviewMode.action === 'approve' &&
      item.direction === 'staff_to_requester' &&
      reviewOutcome === 'resolved' &&
      !reviewResolution.trim()
    ) {
      setError(adminRequestMessage(locale, 'error.resolutionRequired'));
      return;
    }

    setBusy(true);
    const response = reviewMode.action === 'changes'
      ? await postAdminRequestReplyChanges(requestId, { reply_id: item.id, reason: reviewReason })
      : await postAdminApproveReply(requestId, {
          reply_id: item.id,
          ...(item.direction === 'staff_to_requester' ? { outcome: reviewOutcome } : {}),
          ...(item.direction === 'staff_to_requester' && reviewOutcome === 'resolved'
            ? { resolution_summary: reviewResolution }
            : {}),
        });
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      return;
    }
    setSuccess(adminRequestMessage(locale, reviewMode.action === 'changes' ? 'detail.reviewReturned' : 'detail.reviewApproved'));
    resetReview();
    state.reload();
  }

  async function act(action: string) {
    setError(null);
    setSuccess(null);
    if (role === 'admin' && action === 'refer' && !Number(assigneeId)) {
      setError(adminRequestMessage(locale, 'detail.assigneeRequired'));
      return;
    }
    if (action === 'resolve' && !note.trim()) {
      setError(adminRequestMessage(locale, 'error.resolutionRequired'));
      return;
    }
    setBusy(true);
    const response = role === 'admin'
      ? await postAdminAction(
          requestId,
          action,
          action === 'resolve'
            ? { resolution_summary: note }
            : action === 'refer'
              ? { assigned_user_id: Number(assigneeId) }
              : note.trim() ? { reason: note } : undefined,
        )
      : await postRequesterAction(role as 'parent' | 'student', requestId, action as 'submit' | 'cancel');
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      return;
    }
    setNote('');
    state.reload();
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!isFamilyRole(role) && role !== 'staff') || !reply.trim()) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    let uploadSessionId: string | undefined;
    if (files.length) {
      if (files.length > 5) {
        setError(adminRequestMessage(locale, 'composer.errorMaxFiles'));
        setBusy(false);
        return;
      }
      const session = await createAdminRequestUploadSession(role === 'staff' ? requestId : undefined);
      if (!session.success) {
        setError(adminRequestErrorLabel(session.error, locale));
        setBusy(false);
        return;
      }
      uploadSessionId = session.data.public_id;
      for (const file of files) {
        const uploaded = await uploadAdminRequestFile(session.data, file);
        if (!uploaded.success) {
          setError(adminRequestErrorLabel(uploaded.error, locale));
          setBusy(false);
          return;
        }
      }
    }

    const payload = { body: reply, ...(uploadSessionId ? { upload_session_id: uploadSessionId } : {}) };
    const response = role === 'staff'
      ? await postStaffReply(requestId, payload)
      : await postRequesterAction(role, requestId, 'reply', payload);
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      return;
    }
    setReply('');
    setFiles([]);
    setReplyOpen(false);
    setSuccess(adminRequestMessage(locale, role === 'staff' ? 'detail.replyStaffSuccess' : 'detail.replyFamilySuccess'));
    state.reload();
  }

  return (
    <ResourceView state={state}>
      {(request) => {
        const requestTypeName = typeof request.type === 'string' ? request.type : request.type?.name;
        const actions = request.allowed_actions ?? [];
        const canRequesterReply = isFamilyRole(role) && (actions.includes('reply') || actions.includes('requester_reply'));
        const canStaffReply = role === 'staff' && actions.includes('staff_reply');
        const canReply = canRequesterReply || canStaffReply;
        const visibleActions = actions.filter(
          (action) =>
            !APPOINTMENT_ACTIONS.has(action) &&
            action !== 'reply' &&
            action !== 'requester_reply' &&
            action !== 'staff_reply' &&
            action !== 'approve_reply' &&
            action !== 'request_reply_changes' &&
            action !== 'start_review' &&
            action !== 'start_processing',
        );
        const createdAt = request.created_at ?? request.create_date;
        const waitingRequester = request.state === 'waiting_requester' || request.state === 'wait_requester';
        const isOperator = role === 'admin';
        const resolutionSummary = request.resolution_summary?.trim();
        const details = [
          { label: adminRequestMessage(locale, 'detail.type'), value: adminRequestTypeLabel(requestTypeName, locale) },
          {
            label: adminRequestMessage(locale, 'detail.createdAt'),
            value: createdAt ? new Date(createdAt).toLocaleString(dateLocale) : '—',
          },
          { label: adminRequestMessage(locale, 'detail.description'), value: request.description ?? '—' },
          ...(request.assigned?.name
            ? [{ label: adminRequestMessage(locale, 'detail.currentAssignee'), value: request.assigned.name }]
            : []),
          ...(request.assigned_at
            ? [{ label: adminRequestMessage(locale, 'detail.referredAt'), value: new Date(request.assigned_at).toLocaleString(dateLocale) }]
            : []),
        ];

        return (
          <>
            <PageHeader
              title={requestTitle(request)}
              subtitle={request.reference ?? adminRequestMessage(locale, 'detail.requestNumber', { id: request.id })}
              actions={(
                <Link href={uiBase} className="btn btn--ghost">
                  {adminRequestMessage(locale, 'detail.back')}
                </Link>
              )}
            />
            <Card>
              <div className="between">
                <Badge tone="blue">{adminRequestStateLabel(request.state, locale)}</Badge>
                {request.requester_role && (
                  <span className="tiny muted">{adminRequestRoleLabel(request.requester_role, locale)}</span>
                )}
              </div>
              <DefinitionList items={details} />
              <AttachmentList attachments={request.attachments} locale={locale} />
            </Card>

            <AdminRequestAppointmentPanel
              request={request}
              role={role}
              requestId={requestId}
              reload={state.reload}
            />

            {resolutionSummary && (
              <section className="section">
                <SectionHead title={adminRequestMessage(locale, 'detail.resolutionTitle')} />
                <Card>
                  {request.assigned?.name && (
                    <p className="tiny muted" dir="auto">
                      {adminRequestMessage(locale, 'detail.resolvedBy', { name: request.assigned.name })}
                    </p>
                  )}
                  <p style={{ whiteSpace: 'pre-wrap' }} dir="auto">{resolutionSummary}</p>
                  {request.resolved_at && (
                    <p className="tiny muted">
                      {adminRequestMessage(locale, 'detail.resolvedAt', {
                        date: new Date(request.resolved_at).toLocaleString(dateLocale),
                      })}
                    </p>
                  )}
                </Card>
              </section>
            )}

            {!!request.replies?.length && (
              <section className="section">
                <SectionHead title={adminRequestMessage(locale, 'detail.messages')} />
                <div className="col" style={{ gap: 12 }}>
                  {request.replies.map((item) => {
                    const canAdminApprove = role === 'admin' && item.review_state === 'pending_review' && actions.includes('approve_reply');
                    const canAdminRequestChanges = role === 'admin' && item.review_state === 'pending_review' && actions.includes('request_reply_changes');
                    const activeReview = reviewMode?.replyId === item.id;
                    return (
                      <Card key={item.id}>
                        <div className="between" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <strong>{adminRequestRoleLabel(item.author_role, locale)}</strong>
                          <span className="tiny muted">{adminRequestReviewStateLabel(item.review_state, locale)}</span>
                        </div>
                        <p style={{ whiteSpace: 'pre-wrap' }} dir="auto">{item.body}</p>
                        {item.review_state === 'changes_requested' && item.review_reason && (
                          <p className="tiny muted" dir="auto">
                            {adminRequestMessage(locale, 'detail.reviewChangeReason', { reason: item.review_reason })}
                          </p>
                        )}
                        {item.created_at && (
                          <p className="tiny muted">{new Date(item.created_at).toLocaleString(dateLocale)}</p>
                        )}
                        <AttachmentList attachments={item.attachments} locale={locale} />

                        {(canAdminApprove || canAdminRequestChanges) && !activeReview && (
                          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                            {canAdminApprove && (
                              <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => openReview(item, 'approve')}>
                                {adminRequestMessage(locale, 'detail.approveReply')}
                              </button>
                            )}
                            {canAdminRequestChanges && (
                              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => openReview(item, 'changes')}>
                                {adminRequestMessage(locale, 'detail.requestChanges')}
                              </button>
                            )}
                          </div>
                        )}

                        {activeReview && reviewMode?.action === 'approve' && (
                          <div className="col" style={{ gap: 10, marginTop: 12 }}>
                            {item.direction === 'staff_to_requester' && (
                              <>
                                <label className="field">
                                  <span>{adminRequestMessage(locale, 'detail.reviewOutcome')}</span>
                                  <select
                                    className="input"
                                    value={reviewOutcome}
                                    onChange={(event) => setReviewOutcome(event.target.value as AdminRequestReviewOutcome)}
                                    disabled={busy}
                                  >
                                    <option value="waiting_requester">{adminRequestMessage(locale, 'detail.outcomeWaiting')}</option>
                                    <option value="resolved">{adminRequestMessage(locale, 'detail.outcomeResolved')}</option>
                                  </select>
                                </label>
                                {reviewOutcome === 'resolved' && (
                                  <label className="field">
                                    <span>{adminRequestMessage(locale, 'detail.resolutionSummary')}</span>
                                    <textarea
                                      className="input"
                                      dir="auto"
                                      value={reviewResolution}
                                      onChange={(event) => setReviewResolution(event.target.value)}
                                      rows={3}
                                      maxLength={4000}
                                      required
                                      disabled={busy}
                                    />
                                  </label>
                                )}
                              </>
                            )}
                            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                              <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => submitReview(item)}>
                                {adminRequestMessage(locale, busy ? 'detail.approving' : 'detail.confirmApproval')}
                              </button>
                              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={resetReview}>
                                {adminRequestMessage(locale, 'common.cancel')}
                              </button>
                            </div>
                          </div>
                        )}

                        {activeReview && reviewMode?.action === 'changes' && (
                          <div className="col" style={{ gap: 10, marginTop: 12 }}>
                            <label className="field">
                              <span>{adminRequestMessage(locale, 'detail.reasonForChanges')}</span>
                              <textarea
                                className="input"
                                dir="auto"
                                value={reviewReason}
                                onChange={(event) => setReviewReason(event.target.value)}
                                rows={3}
                                maxLength={4000}
                                required
                                disabled={busy}
                              />
                            </label>
                            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                              <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => submitReview(item)}>
                                {adminRequestMessage(locale, busy ? 'common.sending' : 'detail.sendChangeRequest')}
                              </button>
                              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={resetReview}>
                                {adminRequestMessage(locale, 'common.cancel')}
                              </button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {error && <div className="form-error" role="alert">{error}</div>}
            {success && <p className="tiny muted" role="status">{success}</p>}

            {canReply && !replyOpen && (
              <div className="row" style={{ gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                {canRequesterReply && waitingRequester && (
                  <span className="tiny muted">{adminRequestMessage(locale, 'detail.waitingHint')}</span>
                )}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReplyOpen(true)} disabled={busy}>
                  {adminRequestMessage(
                    locale,
                    canStaffReply ? 'detail.sendReplyAdmin' : waitingRequester ? 'detail.replyAdmin' : 'detail.addMessage',
                  )}
                </button>
              </div>
            )}

            {canReply && replyOpen && (
              <section className="section">
                <SectionHead
                  title={adminRequestMessage(
                    locale,
                    canStaffReply ? 'detail.sendReplyAdmin' : waitingRequester ? 'detail.replyAdmin' : 'detail.addMessage',
                  )}
                />
                <Card>
                  <form className="col" style={{ gap: 12 }} onSubmit={sendReply}>
                    <textarea
                      className="input"
                      dir="auto"
                      aria-label={adminRequestMessage(locale, 'detail.messageAria')}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={4000}
                      rows={5}
                      required
                      disabled={busy}
                      placeholder={adminRequestMessage(
                        locale,
                        canStaffReply
                          ? 'detail.placeholderStaff'
                          : waitingRequester
                            ? 'detail.placeholderWaiting'
                            : 'detail.placeholderAdditional',
                      )}
                    />
                    <AdminRequestFilePicker id="request-reply-files" files={files} onChange={setFiles} disabled={busy} />
                    <span className="tiny muted">{adminRequestMessage(locale, 'composer.attachmentsHint')}</span>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn--primary" disabled={busy}>
                        {adminRequestMessage(
                          locale,
                          busy ? 'common.sending' : canStaffReply ? 'detail.sendReplyAdmin' : 'detail.addMessage',
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={busy}
                        onClick={() => { setReplyOpen(false); setReply(''); setFiles([]); }}
                      >
                        {adminRequestMessage(locale, 'common.cancel')}
                      </button>
                    </div>
                  </form>
                </Card>
              </section>
            )}

            {visibleActions.length > 0 && (
              <section className="section">
                <SectionHead title={adminRequestMessage(locale, 'detail.actionsAvailable')} />
                <Card>
                  {isOperator && (
                    <div className="col" style={{ gap: 12 }}>
                      <div className="field">
                        <label htmlFor="request-note">{adminRequestMessage(locale, 'detail.actionNote')}</label>
                        <textarea
                          id="request-note"
                          className="input"
                          dir="auto"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          maxLength={4000}
                          rows={3}
                          disabled={busy}
                          placeholder={adminRequestMessage(locale, 'detail.actionNotePlaceholder')}
                        />
                        <span className="tiny muted">{adminRequestMessage(locale, 'detail.resolutionRequiredHint')}</span>
                      </div>
                      {request.allowed_actions?.includes('refer') && (
                        <div className="field">
                          <label htmlFor="request-assignee">{adminRequestMessage(locale, 'detail.assignee')}</label>
                          <select
                            id="request-assignee"
                            className="input"
                            value={assigneeId}
                            onChange={(event) => setAssigneeId(event.target.value)}
                            disabled={busy || staffOptions.loading || Boolean(staffOptions.error)}
                          >
                            <option value="">
                              {staffOptions.loading
                                ? adminRequestMessage(locale, 'detail.loadingStaff')
                                : staffOptions.error
                                  ? adminRequestMessage(locale, 'detail.staffLoadFailed')
                                  : staffRows.length
                                    ? adminRequestMessage(locale, 'detail.selectAssignee')
                                    : adminRequestMessage(locale, 'detail.noStaff')}
                            </option>
                            {staffRows.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name}{staff.detail ? ` — ${staff.detail}` : ''}
                              </option>
                            ))}
                          </select>
                          {staffOptions.error && (
                            <span className="tiny form-error">{adminRequestMessage(locale, 'detail.staffLoadError')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: isOperator ? 12 : 0 }}>
                    {visibleActions.map((action) => (
                      <button key={action} type="button" className="btn btn--ghost" disabled={busy} onClick={() => act(action)}>
                        {adminRequestActionLabel(action, locale)}
                      </button>
                    ))}
                  </div>
                </Card>
              </section>
            )}
          </>
        );
      }}
    </ResourceView>
  );
}
