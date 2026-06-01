'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useClassSubjects } from '@/features/teacher/use-class-subjects';
import type { ResourceDetail } from '@/types/resource';
import type { Ref } from '@/types/api';

interface TeacherResourceLinkFormProps {
  classId: number;
  onCancel: () => void;
  onCreated?: () => void;
}

export function TeacherResourceLinkForm({
  classId,
  onCancel,
  onCreated,
}: TeacherResourceLinkFormProps) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { subjects, loading: subjectsLoading, statusMessage, blocked } = useClassSubjects(classId);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [subjectId, setSubjectId] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    const res = await api.post<ResourceDetail>(endpoints.teacher.classResourceCreate(classId), {
      name: name.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
      resource_type: 'link',
      subject_id: subjectId ? Number(subjectId) : undefined,
    });
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('teacher.createResourceSuccess'));
      onCreated?.();
      router.push(`/teacher/resources/${res.data.id}`);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <h3 style={{ fontSize: 15, margin: 0 }}>{t('teacher.createResource')}</h3>
        <p className="tiny muted">{t('teacher.linkResourceOnly')}</p>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.resources')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.description')}</span>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.externalLink')}</span>
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            required
          />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.subject')}</span>
          <select
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjectsLoading || blocked}
          >
            <option value="">{t('common.dash')}</option>
            {subjects.map((s: Ref) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {statusMessage && (
            <span className="tiny muted" style={{ color: blocked ? 'var(--c-red)' : undefined }}>
              {statusMessage}
            </span>
          )}
        </label>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={saving || subjectsLoading || blocked}
          >
            {saving ? t('common.saving') : t('teacher.createResource')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Card>
  );
}
