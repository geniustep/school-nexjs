'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useAcademicContextOptions } from '@/features/academic-context/hooks/use-academic-context-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { HomeworkDetail } from '@/types/homework';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { Ref } from '@/types/api';
import { SecureMaterialsComposer } from '@/features/attachments/secure-materials/secure-materials-composer';
import { useSecureMaterials } from '@/features/attachments/secure-materials/use-secure-materials';
import { createIdempotencyKey, finalizeUploadSession } from '@/features/attachments/secure-materials/api';
import { getHomeworkTeacherOptions } from '@/features/admin/homework-form-options';

interface HomeworkFormProps {
  homework?: HomeworkDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}

function optionLabel(item: {
  name: string;
  display_label?: string | null;
  display_alias?: string | null;
  display_name?: string | null;
}) {
  return item.display_label || item.display_alias || item.display_name || item.name;
}

export function HomeworkForm({ homework, onSaved, onCancel }: HomeworkFormProps) {
  const t = useT();
  const toast = useToast();
  const { activeAcademicYearId } = useAdminSession();
  const classesState = useResource<SchoolClass[]>(homework ? endpoints.admin.classes : null);
  const subjectsState = useResource<Ref[]>(homework ? endpoints.admin.subjects : null);
  const teachersState = useResource<Teacher[]>(homework ? endpoints.admin.teachers : null, { page_size: 100 });
  const homeworkContext = useAcademicContextOptions({
    audience: 'admin',
    scope: 'assignment',
    enabled: !homework,
  });
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
  const materials = useSecureMaterials({ purpose: 'homework' });
  const finalizeKeyRef = useRef(createIdempotencyKey('admin-homework-finalize'));

  const effectiveClassId = homework ? classId : homeworkContext.selection.classId;
  const effectiveSubjectId = homework ? subjectId : homeworkContext.selection.subjectId;
  const assignmentQuery = useMemo(
    () => ({
      class_id: Number(effectiveClassId || 0),
      subject_id: Number(effectiveSubjectId || 0),
      ...(activeAcademicYearId != null ? { academic_year_id: activeAcademicYearId } : {}),
      limit: 100,
    }),
    [activeAcademicYearId, effectiveClassId, effectiveSubjectId],
  );
  const assignmentsState = useAdminResource<TeachingAssignment[]>(
    !homework && effectiveClassId && effectiveSubjectId
      ? endpoints.admin.teachingAssignments
      : null,
    assignmentQuery,
  );
  const assignedTeachers = useMemo(
    () => getHomeworkTeacherOptions(assignmentsState.data ?? []),
    [assignmentsState.data],
  );

  useEffect(() => {
    if (!homework) setTeacherId('');
  }, [homework, homeworkContext.selection.classId, homeworkContext.selection.subjectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !effectiveClassId || !effectiveSubjectId || !teacherId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      class_id: Number(effectiveClassId),
      subject_id: Number(effectiveSubjectId),
      teacher_id: Number(teacherId),
      deadline: deadline || undefined,
      require_submission: requireSubmission,
      visible_to_parent: visibleParent,
      visible_to_student: visibleStudent,
    };
    if (!homework && !materials.ready) {
      toast.error(materials.error || t('secureMaterials.waitForUpload'));
      return;
    }
    setSaving(true);
    let res;
    if (homework) {
      res = await api.post(endpoints.admin.homeworkUpdate(homework.id), payload);
    } else {
      try {
        const session = await materials.ensureSession();
        res = await finalizeUploadSession<HomeworkDetail>({
          path: `/admin/homeworks/upload-sessions/${session.publicId}/finalize`,
          session,
          idempotencyKey: finalizeKeyRef.current,
          body: payload,
        });
      } catch (cause) {
        setSaving(false);
        toast.error(cause instanceof Error ? cause.message : t('errors.serverError'));
        return;
      }
    }
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      const raw = res.data as { id: number; homework?: { id: number } };
      const saved = raw.homework ?? raw;
      onSaved(saved.id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  const contextBusy = homeworkContext.loading || homeworkContext.refetching;
  const contextOptions = homeworkContext.options;
  const cycles = contextOptions?.cycles ?? [];
  const levels = contextOptions?.levels ?? [];
  const classes = contextOptions?.classes ?? [];
  const subjects = contextOptions?.subjects ?? [];

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

        {!homework ? (
          <>
            {homeworkContext.error ? (
              <p className="tiny" role="alert">{homeworkContext.error.message}</p>
            ) : null}
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <label className="col" style={{ gap: 4, flex: '1 1 180px' }}>
                <span className="tiny muted">{t('academicContext.fields.cycle')}</span>
                <select
                  className="input"
                  value={homeworkContext.selection.cycleId}
                  disabled={contextBusy}
                  onChange={(e) => homeworkContext.setField('cycle', e.target.value)}
                  required
                >
                  <option value="">{t('academicContext.placeholders.cycle')}</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                  ))}
                </select>
              </label>

              <label className="col" style={{ gap: 4, flex: '1 1 180px' }}>
                <span className="tiny muted">{t('academicContext.fields.level')}</span>
                <select
                  className="input"
                  value={homeworkContext.selection.levelId}
                  disabled={contextBusy || !homeworkContext.selection.cycleId}
                  onChange={(e) => homeworkContext.setField('level', e.target.value)}
                  required
                >
                  <option value="">{t('academicContext.placeholders.level')}</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>{optionLabel(level)}</option>
                  ))}
                </select>
              </label>

              <label className="col" style={{ gap: 4, flex: '1 1 180px' }}>
                <span className="tiny muted">{t('academicContext.fields.class')}</span>
                <select
                  className="input"
                  value={homeworkContext.selection.classId}
                  disabled={contextBusy || !homeworkContext.selection.levelId}
                  onChange={(e) => homeworkContext.setField('class', e.target.value)}
                  required
                >
                  <option value="">{t('academicContext.placeholders.class')}</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>{optionLabel(schoolClass)}</option>
                  ))}
                </select>
              </label>

              <label className="col" style={{ gap: 4, flex: '1 1 180px' }}>
                <span className="tiny muted">{t('academicContext.fields.subject')}</span>
                <select
                  className="input"
                  value={homeworkContext.selection.subjectId}
                  disabled={contextBusy || !homeworkContext.selection.classId}
                  onChange={(e) => homeworkContext.setField('subject', e.target.value)}
                  required
                >
                  <option value="">{t('academicContext.placeholders.subject')}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{optionLabel(subject)}</option>
                  ))}
                </select>
              </label>

              <label className="col" style={{ gap: 4, flex: '1 1 180px' }}>
                <span className="tiny muted">{t('admin.selectTeacher')}</span>
                <select
                  className="input"
                  value={teacherId}
                  disabled={
                    !homeworkContext.selection.subjectId ||
                    assignmentsState.loading ||
                    assignmentsState.fetching
                  }
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                >
                  <option value="">{t('admin.selectTeacher')}</option>
                  {assignedTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : (
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
          </div>
        )}

        <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
        {!homework ? <SecureMaterialsComposer controller={materials} disabled={saving} /> : null}
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving || (!homework && !materials.ready)}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (!homework) void materials.cancel(); onCancel(); }}>
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
