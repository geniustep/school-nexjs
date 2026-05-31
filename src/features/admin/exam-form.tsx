'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamDetail } from '@/types/exam';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';

const EXAM_TYPES = ['quiz', 'midterm', 'final', 'oral', 'practical'] as const;

interface ExamFormProps {
  exam?: ExamDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}

export function ExamForm({ exam, onSaved, onCancel }: ExamFormProps) {
  const t = useT();
  const toast = useToast();
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useResource<Ref[]>(endpoints.admin.subjects);
  const teachersState = useResource<Teacher[]>(endpoints.admin.teachers, { page_size: 100 });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(exam?.name ?? '');
  const [classId, setClassId] = useState(String(exam?.class?.id ?? ''));
  const [subjectId, setSubjectId] = useState(String(exam?.subject?.id ?? ''));
  const [teacherId, setTeacherId] = useState(String(exam?.teacher?.id ?? ''));
  const [examType, setExamType] = useState(exam?.exam_type ?? 'quiz');
  const [examDate, setExamDate] = useState(exam?.exam_date ?? '');
  const [startTime, setStartTime] = useState(exam?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(exam?.end_time ?? '10:00');
  const [room, setRoom] = useState(exam?.room ?? '');
  const [coefficient, setCoefficient] = useState(String(exam?.coefficient ?? 1));
  const [instructions, setInstructions] = useState(exam?.instructions ?? '');
  const [visibleParent, setVisibleParent] = useState(exam?.visible_to_parent ?? true);
  const [visibleStudent, setVisibleStudent] = useState(exam?.visible_to_student ?? true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !classId || !subjectId || !examDate) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      class_id: Number(classId),
      subject_id: Number(subjectId),
      exam_type: examType,
      exam_date: examDate,
      start_time: startTime,
      end_time: endTime,
      room: room.trim() || undefined,
      coefficient: Number(coefficient) || 1,
      instructions: instructions.trim() || undefined,
      teacher_id: teacherId ? Number(teacherId) : undefined,
      visible_to_parent: visibleParent,
      visible_to_student: visibleStudent,
    };
    setSaving(true);
    const res = exam
      ? await api.post(endpoints.admin.examUpdate(exam.id), payload)
      : await api.post(endpoints.admin.exams, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      const saved = res.data as ExamDetail;
      onSaved(saved.id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  const classes = classesState.data ?? [];
  const subjects = subjectsState.data ?? [];

  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.exam')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 140 }}>
            <span className="tiny muted">{t('nav.classes')}</span>
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
              <option value="">{t('admin.selectClass')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 140 }}>
            <span className="tiny muted">{t('academic.subject')}</span>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
            >
              <option value="">{t('admin.selectSubject')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 140 }}>
            <span className="tiny muted">{t('academic.teacher')}</span>
            <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">{t('admin.selectTeacher')}</option>
              {(teachersState.data ?? []).map((te) => (
                <option key={te.id} value={te.id}>{te.name}</option>
              ))}
            </select>
          </label>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 120 }}>
            <span className="tiny muted">{t('academic.type')}</span>
            <select className="input" value={examType} onChange={(e) => setExamType(e.target.value)}>
              {EXAM_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 120 }}>
            <span className="tiny muted">{t('academic.date')}</span>
            <input
              className="input"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </label>
          <label className="col" style={{ gap: 4, minWidth: 100 }}>
            <span className="tiny muted">{t('academic.time')}</span>
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="col" style={{ gap: 4, minWidth: 100 }}>
            <span className="tiny muted">–</span>
            <input
              className="input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 100 }}>
            <span className="tiny muted">{t('academic.room')}</span>
            <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
          </label>
          <label className="col" style={{ gap: 4, minWidth: 80 }}>
            <span className="tiny muted">{t('academic.coefficient')}</span>
            <input
              className="input"
              type="number"
              min={0}
              step="0.5"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
            />
          </label>
        </div>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.instructions')}</span>
          <textarea
            className="textarea"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
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
