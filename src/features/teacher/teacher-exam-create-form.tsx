'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useClassSubjects } from '@/features/teacher/use-class-subjects';
import type { ExamDetail } from '@/types/exam';
import type { Ref } from '@/types/api';

const EXAM_TYPES = ['quiz', 'midterm', 'final', 'oral', 'practical'] as const;

interface TeacherExamCreateFormProps {
  classId: number;
  onCancel: () => void;
  onCreated?: () => void;
}

export function TeacherExamCreateForm({ classId, onCancel, onCreated }: TeacherExamCreateFormProps) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { subjects, loading: subjectsLoading, statusMessage, blocked, empty } =
    useClassSubjects(classId);
  const subjectBlocked = blocked || empty;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState<(typeof EXAM_TYPES)[number]>('quiz');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [instructions, setInstructions] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subjectId || !examDate) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    const res = await api.post<ExamDetail>(endpoints.teacher.classExamCreate(classId), {
      name: name.trim(),
      subject_id: Number(subjectId),
      exam_type: examType,
      exam_date: examDate,
      start_time: startTime,
      end_time: endTime,
      instructions: instructions.trim() || undefined,
    });
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('teacher.createExamSuccess'));
      onCreated?.();
      router.push(`/teacher/exams/${res.data.id}`);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <h3 style={{ fontSize: 15, margin: 0 }}>{t('teacher.createExam')}</h3>
        <p className="tiny muted">{t('teacher.examDraftOnly')}</p>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.exams')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.subject')}</span>
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
            <span className="tiny muted" style={{ color: blocked ? 'var(--c-red)' : undefined }}>
              {statusMessage}
            </span>
          )}
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academic.examType')}</span>
          <select
            className="input"
            value={examType}
            onChange={(e) => setExamType(e.target.value as (typeof EXAM_TYPES)[number])}
          >
            {EXAM_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`teacher.examTypes.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 140 }}>
            <span className="tiny muted">{t('academic.examDate')}</span>
            <input
              className="input"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </label>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 100 }}>
            <span className="tiny muted">{t('academic.startTime')}</span>
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="col" style={{ gap: 4, flex: 1, minWidth: 100 }}>
            <span className="tiny muted">{t('academic.endTime')}</span>
            <input
              className="input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
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
        <div className="row" style={{ gap: 8 }}>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={saving || subjectsLoading || subjectBlocked}
          >
            {saving ? t('common.saving') : t('teacher.createExam')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Card>
  );
}
