'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeworkDetail } from '@/types/homework';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { Ref } from '@/types/api';

interface HomeworkFormProps {
  homework?: HomeworkDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}

export function HomeworkForm({ homework, onSaved, onCancel }: HomeworkFormProps) {
  const t = useT();
  const toast = useToast();
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useResource<Ref[]>(endpoints.admin.subjects);
  const teachersState = useResource<Teacher[]>(endpoints.admin.teachers, { page_size: 100 });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(homework?.name ?? '');
  const [description, setDescription] = useState(homework?.description ?? '');
  const [classId, setClassId] = useState(String(homework?.class?.id ?? ''));
  const [subjectId, setSubjectId] = useState(String(homework?.subject?.id ?? ''));
  const [teacherId, setTeacherId] = useState(String(homework?.teacher?.id ?? ''));
  const [deadline, setDeadline] = useState(homework?.deadline?.slice(0, 16) ?? '');
  const [requireSubmission, setRequireSubmission] = useState(homework?.require_submission ?? true);
  const [visibleParent, setVisibleParent] = useState(homework?.visible_to_parent ?? true);
  const [visibleStudent, setVisibleStudent] = useState(homework?.visible_to_student ?? true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !classId || !subjectId || !teacherId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      class_id: Number(classId),
      subject_id: Number(subjectId),
      teacher_id: Number(teacherId),
      deadline: deadline || undefined,
      require_submission: requireSubmission,
      visible_to_parent: visibleParent,
      visible_to_student: visibleStudent,
    };
    setSaving(true);
    const res = homework
      ? await api.post(endpoints.admin.homeworkUpdate(homework.id), payload)
      : await api.post(endpoints.admin.homeworks, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      const saved = res.data as { id: number };
      onSaved(saved.id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.homework')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.description')}</span>
          <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
            <option value="">{t('admin.selectClass')}</option>
            {(classesState.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            <option value="">{t('admin.selectSubject')}</option>
            {(subjectsState.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
            <option value="">{t('admin.selectTeacher')}</option>
            {(teachersState.data ?? []).map((te) => (
              <option key={te.id} value={te.id}>{te.name}</option>
            ))}
          </select>
          <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={requireSubmission} onChange={(e) => setRequireSubmission(e.target.checked)} />
            <span className="tiny">{t('academic.requiresSubmission')}</span>
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={visibleParent} onChange={(e) => setVisibleParent(e.target.checked)} />
            <span className="tiny">{t('admin.visibleParent')}</span>
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={visibleStudent} onChange={(e) => setVisibleStudent(e.target.checked)} />
            <span className="tiny">{t('admin.visibleStudent')}</span>
          </label>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Card>
  );
}

interface ResourceFormProps {
  resource?: import('@/types/resource').ResourceDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}

export function ResourceForm({ resource, onSaved, onCancel }: ResourceFormProps) {
  const t = useT();
  const toast = useToast();
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useResource<Ref[]>(endpoints.admin.subjects);
  const teachersState = useResource<Teacher[]>(endpoints.admin.teachers, { page_size: 100 });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(resource?.name ?? '');
  const [description, setDescription] = useState(resource?.description ?? '');
  const [classId, setClassId] = useState(String(resource?.class?.id ?? ''));
  const [subjectId, setSubjectId] = useState(String(resource?.subject?.id ?? ''));
  const [teacherId, setTeacherId] = useState(String(resource?.teacher?.id ?? ''));
  const [resourceType, setResourceType] = useState(resource?.resource_type ?? 'pdf');
  const [url, setUrl] = useState(resource?.url ?? '');
  const [visibleParent, setVisibleParent] = useState(true);
  const [visibleStudent, setVisibleStudent] = useState(true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !classId || !teacherId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      class_id: Number(classId),
      subject_id: subjectId ? Number(subjectId) : undefined,
      teacher_id: Number(teacherId),
      resource_type: resourceType,
      url: url.trim() || undefined,
      visible_to_parent: visibleParent,
      visible_to_student: visibleStudent,
    };
    setSaving(true);
    const res = resource
      ? await api.post(endpoints.admin.resourceUpdate(resource.id), payload)
      : await api.post(endpoints.admin.resources, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as { id: number }).id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.resources')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('academic.description')} />
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
            <option value="">{t('admin.selectClass')}</option>
            {(classesState.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">{t('admin.selectSubject')}</option>
            {(subjectsState.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
            <option value="">{t('admin.selectTeacher')}</option>
            {(teachersState.data ?? []).map((te) => (
              <option key={te.id} value={te.id}>{te.name}</option>
            ))}
          </select>
          <input className="input" value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder={t('academic.type')} />
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('academic.externalLink')} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Card>
  );
}
