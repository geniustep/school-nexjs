'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { updateAdminCommunicationContent } from '@/features/communication/api/admin-communication-api';
import { stripHtmlPreview } from '@/features/communication/utils/communication-labels';
import { useT } from '@/features/i18n/locale-context';
import type { CommunicationContent } from '@/types/communication';

export function GeneralCommunicationInlineEditor({
  item,
  onSaved,
}: {
  item: CommunicationContent;
  onSaved: (updated: CommunicationContent) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [subject, setSubject] = useState(item.subject ?? item.name ?? '');
  const [body, setBody] = useState(stripHtmlPreview(item.body ?? item.current_version?.body ?? '', 12000));
  const [saving, setSaving] = useState(false);
  const [allowExternalMediaShare, setAllowExternalMediaShare] = useState(item.allow_external_media_share === true);
  const canShareExternally = item.content_type === 'announcement' && item.audience_summary?.type === 'school';

  useEffect(() => {
    setSubject(item.subject ?? item.name ?? '');
    setBody(stripHtmlPreview(item.body ?? item.current_version?.body ?? '', 12000));
    setAllowExternalMediaShare(item.allow_external_media_share === true);
  }, [item.id, item.subject, item.name, item.body, item.current_version?.body, item.allow_external_media_share]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
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
    const res = await updateAdminCommunicationContent(item.id, {
      subject: nextSubject,
      body: nextBody,
      content_type: item.content_type,
      ...(canShareExternally ? { allow_external_media_share: allowExternalMediaShare } : {}),
    });
    setSaving(false);

    if (!res.success) {
      toast.error(res.error.message || t('errors.serverError'));
      return;
    }

    onSaved(res.data);
    toast.success(t('common.save'));
  }

  return (
    <Card className="communication-detail__content-card">
      <div id="communication-edit" className="communication-detail__section-head">
        <h2 className="communication-review__section-title">{t('common.edit')}</h2>
      </div>
      <form className="form-stack" onSubmit={(e) => void save(e)}>
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
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={saving}
            required
          />
        </label>
        {item.content_type === 'announcement' ? (
          <label className="general-comm__option">
            <input
              type="checkbox"
              checked={canShareExternally && allowExternalMediaShare}
              onChange={(event) => setAllowExternalMediaShare(event.target.checked)}
              disabled={saving || !canShareExternally}
              aria-label={t('communication.general.externalMediaShareLabel')}
            />
            <span>
              <strong>{t('communication.general.externalMediaShareLabel')}</strong>
              <span className="tiny muted" style={{ display: 'block' }}>
                {t('communication.general.externalMediaShareDescription')}
              </span>
            </span>
          </label>
        ) : null}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Card>
  );
}
