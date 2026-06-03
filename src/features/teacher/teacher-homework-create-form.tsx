'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useClassSubjects } from '@/features/teacher/use-class-subjects';
import type { HomeworkDetail } from '@/types/homework';
import type { Ref } from '@/types/api';

interface TeacherHomeworkCreateFormProps {
  classId: number;
  onCancel: () => void;
  onCreated?: () => void;
}

export function TeacherHomeworkCreateForm({
  classId,
  onCancel,
  onCreated,
}: TeacherHomeworkCreateFormProps) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { subjects, loading: subjectsLoading, statusMessage, blocked, empty } =
    useClassSubjects(classId);
  const subjectBlocked = blocked || empty;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requireSubmission, setRequireSubmission] = useState(true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subjectId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    const res = await api.post<HomeworkDetail>(endpoints.teacher.classHomeworkCreate(classId), {
      name: name.trim(),
      description: description.trim() || undefined,
      subject_id: Number(subjectId),
      require_submission: requireSubmission,
      deadline: deadline || undefined,
    });
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('teacher.createHomeworkSuccess'));
      onCreated?.();
      router.push(`/teacher/homeworks/${res.data.id}`);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <form className="t-form" onSubmit={submit}>
      <div className="t-form__grid">
        <label className="t-form__field t-form__field--wide">
          <span className="t-form__label">{t('academic.homework')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="t-form__field t-form__field--wide">
          <span className="t-form__label">{t('academic.description')}</span>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="t-form__field">
          <span className="t-form__label">{t('academic.subject')}</span>
          <select
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            disabled={subjectsLoading || subjectBlocked}
          >
            <option value="">{t('admin.selectSubject')}</option>
            {subjects.map((s: Ref) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {statusMessage && (
            <span className="t-form__hint" style={{ color: blocked ? 'var(--c-red)' : undefined }}>
              {statusMessage}
            </span>
          )}
        </label>
        <label className="t-form__field">
          <span className="t-form__label">{t('academic.deadline')}</span>
          <input
            className="input"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <label className="t-form__check">
          <input
            type="checkbox"
            checked={requireSubmission}
            onChange={(e) => setRequireSubmission(e.target.checked)}
          />
          {t('academic.requiresSubmission')}
        </label>
      </div>
      <div className="t-form__actions">
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={saving || subjectsLoading || subjectBlocked}
        >
          {saving ? t('common.saving') : t('teacher.createHomework')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
