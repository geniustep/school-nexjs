/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import { createAdminDiagnosticAssessment } from '../api/diagnostic-assessment-api';

export function DiagnosticCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { options: academicYears } = useAcademicYearOptions();
  const classesState = useAdminResource<SchoolClass[]>(open ? endpoints.admin.classes : null);
  const subjectsState = useAdminResource<Ref[]>(open ? endpoints.admin.subjects : null);
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!academicYearId && academicYears.length === 1) {
      setAcademicYearId(String(academicYears[0].id));
    }
  }, [open, academicYears, academicYearId]);

  async function handleCreate() {
    if (!academicYearId || !classId || !subjectId) {
      toast.error(t('admin.diagnosticAssessment.create.missingFields'));
      return;
    }
    setSubmitting(true);
    const res = await createAdminDiagnosticAssessment({
      academic_year_id: Number(academicYearId),
      class_id: Number(classId),
      subject_id: Number(subjectId),
      name: name.trim() || undefined,
      assessment_date: assessmentDate || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success || !res.data?.id) {
      toast.error(res.success ? t('admin.diagnosticAssessment.create.failed') : res.error.message);
      return;
    }
    toast.success(t('admin.diagnosticAssessment.create.success'));
    onCreated(res.data.id);
    onClose();
  }

  if (!open) return null;

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.diagnosticAssessment.create.title')}
      size="form"
      closeOnBackdrop={!submitting}
      loading={submitting}
      confirmLabel={t('admin.diagnosticAssessment.create.submit')}
      onConfirm={handleCreate}
      onClose={onClose}
      body={
        <div className="grid grid--form">
          <label className="field">
            <span>{t('admin.diagnosticAssessment.academicYear')}</span>
            <select
              className="input"
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              <option value="">{t('common.dash')}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('nav.classes')}</span>
            <select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">{t('common.dash')}</option>
              {(classesState.data ?? []).map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('nav.subjects')}</span>
            <select
              className="input"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">{t('common.dash')}</option>
              {(subjectsState.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('admin.diagnosticAssessment.create.name')}</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('admin.diagnosticAssessment.create.namePlaceholder')}
            />
          </label>
          <label className="field">
            <span>{t('admin.diagnosticAssessment.assessmentDate')}</span>
            <input
              className="input"
              type="date"
              value={assessmentDate}
              onChange={(event) => setAssessmentDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('admin.diagnosticAssessment.create.notes')}</span>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <p className="form-help">{t('admin.diagnosticAssessment.create.rosterHint')}</p>
        </div>
      }
    />
  );
}
