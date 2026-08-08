'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Bounded editor for an existing administrative communication.
 * Backend `allowed_actions` remains authoritative; this page never invents edit authority.
 */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Badge, InfoBanner, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import {
  fetchCommunicationContentDetail,
  updateAdminCommunicationContent,
} from '@/features/communication/api/admin-communication-api';
import {
  communicationContentTypeMessageKey,
  communicationStateMessageKey,
} from '@/features/communication/utils/communication-labels';
import { useT } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';

export default function AdminCommunicationEditPage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contentId = Number(params.id);

  const [content, setContent] = useState<CommunicationContent | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(contentId) || contentId <= 0) return;
    setLoading(true);
    const res = await fetchCommunicationContentDetail(contentId);
    if (!res.success) {
      setError(res.error);
      setContent(null);
      setLoading(false);
      return;
    }
    setContent(res.data);
    setSubject(res.data.subject ?? res.data.name ?? '');
    setBody(res.data.body ?? res.data.current_version?.body ?? '');
    setError(null);
    setLoading(false);
  }, [contentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!Number.isSafeInteger(contentId) || contentId <= 0) {
    return (
      <div className="admin-workspace">
        <InfoBanner title={t('errors.notFoundTitle')} description={t('errors.notFound')} tone="amber" />
      </div>
    );
  }

  if (loading) return <LoadingState label={t('communication.loading')} />;
  if (error) return <ApiErrorView error={error} onRetry={() => void load()} />;
  if (!content) return null;

  const canEdit = (content.allowed_actions ?? []).includes('edit');
  const typeLabel = t(communicationContentTypeMessageKey(content.content_type));
  const stateLabel = t(communicationStateMessageKey(content.state));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || saving) return;
    const nextSubject = subject.trim();
    const nextBody = body.trim();
    if (!nextSubject) {
      toast.error(t('communication.general.subjectRequired'));
      return;
    }
    if (!nextBody) {
      toast.error(t('communication.general.bodyRequired'));
      return;
    }

    setSaving(true);
    const res = await updateAdminCommunicationContent(contentId, {
      subject: nextSubject,
      body: nextBody,
      content_type: content.content_type,
    });
    setSaving(false);

    if (!res.success) {
      toast.error(res.error.message || t('errors.serverError'));
      return;
    }

    toast.success(t('common.save'));
    router.push('/admin/announcements');
  }

  return (
    <div className="admin-workspace">
      <PageHeader
        title={`${t('common.edit')} · ${typeLabel}`}
        subtitle={content.subject || content.name || `#${content.id}`}
        actions={
          <Link href="/admin/announcements" className="btn btn--ghost btn--sm">
            {t('common.back')}
          </Link>
        }
      />

      <div className="wrap-gap" aria-label={t('common.status')}>
        <Badge tone={content.content_type === 'announcement' ? 'amber' : 'blue'}>{typeLabel}</Badge>
        <Badge tone={content.state === 'changes_requested' ? 'red' : 'slate'}>{stateLabel}</Badge>
      </div>

      {!canEdit ? (
        <InfoBanner
          title={t('errors.forbiddenTitle')}
          description={t('errors.forbidden')}
          tone="amber"
        />
      ) : (
        <form className="card form-stack" onSubmit={(e) => void save(e)}>
          <label>
            {t('communication.general.subject')}
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label>
            {t('communication.body')}
            <textarea
              className="textarea"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={saving}
              required
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <Link href={`/admin/communication/${content.id}`} className="btn btn--ghost">
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
