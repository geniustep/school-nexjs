/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import { createAdminGradebook } from '../api/gradebooks-api';

export function GradebookCreateDialog({
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
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useAdminResource<Ref[]>(endpoints.admin.subjects);
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const academicYears =
    (classesState.meta?.academic_years as Ref[] | undefined) ??
    (subjectsState.meta?.academic_years as Ref[] | undefined) ??
    [];
  const terms =
    (classesState.meta?.terms as Ref[] | undefined) ??
    (subjectsState.meta?.terms as Ref[] | undefined) ??
    [];
  const schemes =
    (subjectsState.meta?.assessment_schemes as Array<Ref & { subject_id?: number; class_id?: number }> | undefined) ??
    [];

  const filteredSchemes = schemes.filter((scheme) => {
    if (subjectId && scheme.subject_id && String(scheme.subject_id) !== subjectId) return false;
    if (classId && scheme.class_id && String(scheme.class_id) !== classId) return false;
    return true;
  });

  async function handleCreate() {
    if (!academicYearId || !termId || !classId || !subjectId || !schemeId) {
      toast.error(t('admin.gradebooks.create.missingFields'));
      return;
    }
    setSubmitting(true);
    const res = await createAdminGradebook({
      academic_year_id: Number(academicYearId),
      term_id: Number(termId),
      class_id: Number(classId),
      subject_id: Number(subjectId),
      scheme_id: Number(schemeId),
      teacher_id: teacherId ? Number(teacherId) : undefined,
    });
    setSubmitting(false);
    if (!res.success || !res.data?.id) {
      toast.error(res.success ? t('admin.gradebooks.create.failed') : res.error.message);
      return;
    }
    toast.success(t('admin.gradebooks.create.success'));
    onCreated(res.data.id);
    onClose();
  }

  if (!open) return null;

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.gradebooks.create.title')}
      size="form"
      closeOnBackdrop={!submitting}
      loading={submitting}
      confirmLabel={t('admin.gradebooks.create.submit')}
      body={
        <div className="grid grid--form">
          <label className="field">
            <span>{t('admin.gradebooks.academicYear')}</span>
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
            <span>{t('admin.gradebooks.term')}</span>
            <select className="input" value={termId} onChange={(event) => setTermId(event.target.value)}>
              <option value="">{t('common.dash')}</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('nav.classes')}</span>
            <select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">{t('common.dash')}</option>
              {(classesState.data ?? []).map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('academic.subject')}</span>
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
            <span>{t('admin.gradebooks.scheme')}</span>
            <select className="input" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}>
              <option value="">{t('common.dash')}</option>
              {filteredSchemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('admin.gradebooks.teacherOptional')}</span>
            <input
              className="input"
              type="number"
              min={1}
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              placeholder={t('admin.gradebooks.teacherOptionalHint')}
            />
          </label>
        </div>
      }
      onConfirm={handleCreate}
      onClose={onClose}
    />
  );
}
