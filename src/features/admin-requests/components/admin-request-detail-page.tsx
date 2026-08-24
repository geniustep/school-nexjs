'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
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
import {
  adminRequestApiBase,
  adminRequestUiBase,
  requestTitle,
} from '../types';
import { AdminRequestFilePicker } from './admin-request-file-picker';

function AttachmentList({ attachments }: { attachments?: AdminRequestAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <ul className="col" style={{ gap: 8, paddingInlineStart: 18 }}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a href={`/api/odoo/attachments/${attachment.id}/download`} className="btn btn--ghost btn--sm">
            {attachment.name}
          </a>
          <span className="tiny muted">
            {' · '}{attachment.mimetype ?? 'ملف'}
            {attachment.size ? ` · ${attachment.size.toLocaleString('ar-MA')} بايت` : ''}
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

export function AdminRequestDetailPage({ role, requestId }: { role: AdminRequestRole; requestId: string }) {
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
      setError('اكتب سبب طلب تعديل الرد.');
      return;
    }
    if (
      reviewMode.action === 'approve' &&
      item.direction === 'staff_to_requester' &&
      reviewOutcome === 'resolved' &&
      !reviewResolution.trim()
    ) {
      setError('اكتب ملخص المعالجة قبل إنهاء الطلب.');
      return;
    }

    setBusy(true);
    const response = reviewMode.action === 'changes'
      ? await postAdminRequestReplyChanges(requestId, {
          reply_id: item.id,
          reason: reviewReason,
        })
      : await postAdminApproveReply(requestId, {
          reply_id: item.id,
          ...(item.direction === 'staff_to_requester' ? { outcome: reviewOutcome } : {}),
          ...(item.direction === 'staff_to_requester' && reviewOutcome === 'resolved'
            ? { resolution_summary: reviewResolution }
            : {}),
        });
    setBusy(false);

    if (!response.success) {
      setError(adminRequestErrorLabel(response.error));
      return;
    }
    setSuccess(reviewMode.action === 'changes' ? 'أُعيد الرد إلى صاحبه للتعديل.' : 'تم اعتماد الرد.');
    resetReview();
    state.reload();
  }

  async function act(action: string) {
    setError(null);
    setSuccess(null);
    if (role === 'admin' && action === 'refer' && !Number(assigneeId)) {
      setError('اختر الموظف المسؤول قبل إحالة الطلب.');
      return;
    }
    if (action === 'resolve' && !note.trim()) {
      setError('اكتب ملخص المعالجة قبل إنهاء الطلب.');
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
      setError(adminRequestErrorLabel(response.error));
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
        setError('الحد الأقصى خمسة ملفات.');
        setBusy(false);
        return;
      }
      const session = await createAdminRequestUploadSession(role === 'staff' ? requestId : undefined);
      if (!session.success) {
        setError(adminRequestErrorLabel(session.error));
        setBusy(false);
        return;
      }
      uploadSessionId = session.data.public_id;
      for (const file of files) {
        const uploaded = await uploadAdminRequestFile(session.data, file);
        if (!uploaded.success) {
          setError(adminRequestErrorLabel(uploaded.error));
          setBusy(false);
          return;
        }
      }
    }

    const payload = {
      body: reply,
      ...(uploadSessionId ? { upload_session_id: uploadSessionId } : {}),
    };
    const response = role === 'staff'
      ? await postStaffReply(requestId, payload)
      : await postRequesterAction(role, requestId, 'reply', payload);
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error));
      return;
    }
    setReply('');
    setFiles([]);
    setReplyOpen(false);
    setSuccess(role === 'staff' ? 'أُرسل الرد إلى الإدارة للمراجعة.' : 'أُرسلت الرسالة إلى الإدارة للمراجعة.');
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
          { label: 'النوع', value: adminRequestTypeLabel(requestTypeName) },
          { label: 'تاريخ الإنشاء', value: createdAt ? new Date(createdAt).toLocaleString('ar-MA') : '—' },
          { label: 'الوصف', value: request.description ?? '—' },
          ...(request.assigned?.name
            ? [{ label: 'المسؤول الحالي', value: request.assigned.name }]
            : []),
          ...(request.assigned_at
            ? [{ label: 'تاريخ الإحالة', value: new Date(request.assigned_at).toLocaleString('ar-MA') }]
            : []),
        ];

        return (
          <>
            <PageHeader
              title={requestTitle(request)}
              subtitle={request.reference ?? `طلب #${request.id}`}
              actions={<Link href={uiBase} className="btn btn--ghost">العودة إلى القائمة</Link>}
            />
            <Card>
              <div className="between">
                <Badge tone="blue">{adminRequestStateLabel(request.state)}</Badge>
                {request.requester_role && <span className="tiny muted">{adminRequestRoleLabel(request.requester_role)}</span>}
              </div>
              <DefinitionList items={details} />
              <AttachmentList attachments={request.attachments} />
            </Card>

            {resolutionSummary && (
              <section className="section">
                <SectionHead title="ملخص المعالجة" />
                <Card>
                  {request.assigned?.name && (
                    <p className="tiny muted">تمت المعالجة بواسطة: {request.assigned.name}</p>
                  )}
                  <p style={{ whiteSpace: 'pre-wrap' }}>{resolutionSummary}</p>
                  {request.resolved_at && (
                    <p className="tiny muted">
                      تاريخ المعالجة: {new Date(request.resolved_at).toLocaleString('ar-MA')}
                    </p>
                  )}
                </Card>
              </section>
            )}

            {!!request.replies?.length && (
              <section className="section">
                <SectionHead title="الرسائل" />
                <div className="col" style={{ gap: 12 }}>
                  {request.replies.map((item) => {
                    const canAdminApprove = role === 'admin' && item.review_state === 'pending_review' && actions.includes('approve_reply');
                    const canAdminRequestChanges = role === 'admin' && item.review_state === 'pending_review' && actions.includes('request_reply_changes');
                    const activeReview = reviewMode?.replyId === item.id;
                    return (
                      <Card key={item.id}>
                        <div className="between" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <strong>{adminRequestRoleLabel(item.author_role)}</strong>
                          <span className="tiny muted">{adminRequestReviewStateLabel(item.review_state)}</span>
                        </div>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{item.body}</p>
                        {item.review_state === 'changes_requested' && item.review_reason && (
                          <p className="tiny muted">سبب طلب التعديل: {item.review_reason}</p>
                        )}
                        {item.created_at && <p className="tiny muted">{new Date(item.created_at).toLocaleString('ar-MA')}</p>}
                        <AttachmentList attachments={item.attachments} />

                        {(canAdminApprove || canAdminRequestChanges) && !activeReview && (
                          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                            {canAdminApprove && (
                              <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => openReview(item, 'approve')}>
                                اعتماد الرد
                              </button>
                            )}
                            {canAdminRequestChanges && (
                              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => openReview(item, 'changes')}>
                                طلب تعديل
                              </button>
                            )}
                          </div>
                        )}

                        {activeReview && reviewMode?.action === 'approve' && (
                          <div className="col" style={{ gap: 10, marginTop: 12 }}>
                            {item.direction === 'staff_to_requester' && (
                              <>
                                <label className="field">
                                  <span>نتيجة اعتماد الرد</span>
                                  <select
                                    className="input"
                                    value={reviewOutcome}
                                    onChange={(event) => setReviewOutcome(event.target.value as AdminRequestReviewOutcome)}
                                    disabled={busy}
                                  >
                                    <option value="waiting_requester">إرسال الرد وانتظار صاحب الطلب</option>
                                    <option value="resolved">اعتماد الرد وإنهاء المعالجة</option>
                                  </select>
                                </label>
                                {reviewOutcome === 'resolved' && (
                                  <label className="field">
                                    <span>ملخص المعالجة</span>
                                    <textarea
                                      className="input"
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
                                {busy ? 'جارٍ الاعتماد…' : 'تأكيد الاعتماد'}
                              </button>
                              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={resetReview}>إلغاء</button>
                            </div>
                          </div>
                        )}

                        {activeReview && reviewMode?.action === 'changes' && (
                          <div className="col" style={{ gap: 10, marginTop: 12 }}>
                            <label className="field">
                              <span>سبب طلب التعديل</span>
                              <textarea
                                className="input"
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
                                {busy ? 'جارٍ الإرسال…' : 'إرسال طلب التعديل'}
                              </button>
                              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={resetReview}>إلغاء</button>
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
                  <span className="tiny muted">الإدارة تنتظر معلومات إضافية منك.</span>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setReplyOpen(true)}
                  disabled={busy}
                >
                  {canStaffReply ? 'إرسال رد للإدارة' : waitingRequester ? 'الرد على الإدارة' : 'إضافة رسالة'}
                </button>
              </div>
            )}

            {canReply && replyOpen && (
              <section className="section">
                <SectionHead title={canStaffReply ? 'إرسال الرد إلى الإدارة' : waitingRequester ? 'الرد على الإدارة' : 'إضافة رسالة'} />
                <Card>
                  <form className="col" style={{ gap: 12 }} onSubmit={sendReply}>
                    <textarea
                      className="input"
                      aria-label="نص الرسالة"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={4000}
                      rows={5}
                      required
                      disabled={busy}
                      placeholder={canStaffReply ? 'اكتب الرد الذي سترسله إلى الإدارة للمراجعة…' : waitingRequester ? 'اكتب المعلومات التي طلبتها الإدارة…' : 'اكتب رسالتك الإضافية…'}
                    />
                    <AdminRequestFilePicker id="request-reply-files" files={files} onChange={setFiles} disabled={busy} />
                    <span className="tiny muted">حتى 5 ملفات، بحد أقصى 10 MiB للملف.</span>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn--primary" disabled={busy}>
                        {busy ? 'جارٍ الإرسال…' : canStaffReply ? 'إرسال الرد إلى الإدارة' : 'إرسال الرسالة'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={busy}
                        onClick={() => {
                          setReplyOpen(false);
                          setReply('');
                          setFiles([]);
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </Card>
              </section>
            )}

            {visibleActions.length > 0 && (
              <section className="section">
                <SectionHead title="الإجراءات المتاحة" />
                <Card>
                  {isOperator && (
                    <div className="col" style={{ gap: 12 }}>
                      <div className="field">
                        <label htmlFor="request-note">ملاحظة الإجراء / ملخص المعالجة</label>
                        <textarea
                          id="request-note"
                          className="input"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          maxLength={4000}
                          rows={3}
                          disabled={busy}
                          placeholder="أضف ملاحظة، وعند إنهاء المعالجة اكتب ملخص النتيجة…"
                        />
                        <span className="tiny muted">ملخص المعالجة مطلوب عند اختيار «إنهاء المعالجة».</span>
                      </div>
                      {request.allowed_actions?.includes('refer') && (
                        <div className="field">
                          <label htmlFor="request-assignee">الموظف المسؤول</label>
                          <select
                            id="request-assignee"
                            className="input"
                            value={assigneeId}
                            onChange={(event) => setAssigneeId(event.target.value)}
                            disabled={busy || staffOptions.loading || Boolean(staffOptions.error)}
                          >
                            <option value="">
                              {staffOptions.loading
                                ? 'جارٍ تحميل الموظفين…'
                                : staffOptions.error
                                  ? 'تعذر تحميل قائمة الموظفين'
                                  : staffRows.length
                                    ? 'اختر الموظف المسؤول'
                                    : 'لا يوجد موظفون متاحون'}
                            </option>
                            {staffRows.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name}{staff.detail ? ` — ${staff.detail}` : ''}
                              </option>
                            ))}
                          </select>
                          {staffOptions.error && <span className="tiny form-error">تعذر تحميل قائمة الموظفين. أعد المحاولة بعد تحديث الصفحة.</span>}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: isOperator ? 12 : 0 }}>
                    {visibleActions.map((action) => (
                      <button key={action} type="button" className="btn btn--ghost" disabled={busy} onClick={() => act(action)}>
                        {adminRequestActionLabel(action)}
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
