/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { AcademicContextFilters } from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { Ref } from '@/types/api';
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
  const { activeAcademicYearId } = useAdminSession();
  const classesState = useAdminResource<Ref[]>(
    activeAcademicYearId != null ? endpoints.admin.classes : null,
    activeAcademicYearId != null ? { academic_year_id: activeAcademicYearId } : undefined,
  );
  const [selection, setSelection] = useState<AcademicContextSelection>(
    EMPTY_ACADEMIC_CONTEXT_SELECTION,
  );
  const [schemeId, setSchemeId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const academicYearId = activeAcademicYearId != null ? String(activeAcademicYearId) : '';
    setSelection((current) => {
      if (current.academicYearId === academicYearId) return current;
      return {
        ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
        academicYearId,
      };
    });
    setSchemeId('');
    setTeacherId('');
  }, [activeAcademicYearId]);

  const schemes =
    (classesState.meta?.assessment_schemes as Array<
      Ref & { subject_id?: number; class_id?: number }
    > | undefined) ?? [];

  const filteredSchemes = useMemo(
    () =>
      schemes.filter((scheme) => {
        if (
          selection.subjectId &&
          scheme.subject_id &&
          String(scheme.subject_id) !== selection.subjectId
        ) {
          return false;
        }
        if (
          selection.classId &&
          scheme.class_id &&
          String(scheme.class_id) !== selection.classId
        ) {
          return false;
        }
        return true;
      }),
    [schemes, selection.classId, selection.subjectId],
  );

  async function handleCreate() {
    if (
      activeAcademicYearId == null ||
      !selection.termId ||
      !selection.classId ||
      !selection.subjectId ||
      !schemeId
    ) {
      toast.error(t('admin.gradebooks.create.missingFields'));
      return;
    }
    setSubmitting(true);
    const res = await createAdminGradebook({
      academic_year_id: activeAcademicYearId,
      term_id: Number(selection.termId),
      class_id: Number(selection.classId),
      subject_id: Number(selection.subjectId),
      scheme_id: Number(schemeId),
      teacher_id: teacherId ? Number(teacherId) : undefined,
      teaching_offering_id: selection.offeringId
        ? Number(selection.offeringId)
        : undefined,
    });
    setSubmitting(false);
    if (!res.success || !res.data?.id) {
      const code = !res.success ? res.error.code : '';
      toast.error(
        !res.success && code && t(`academicContext.errors.${code}`) !== `academicContext.errors.${code}`
          ? t(`academicContext.errors.${code}`)
          : res.success
            ? t('admin.gradebooks.create.failed')
            : res.error.message,
      );
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
      onConfirm={() => void handleCreate()}
      onClose={onClose}
      body={
        <div className="grid grid--form">
          <AcademicContextFilters
            scope="gradebook"
            layout="compact"
            selection={selection}
            onSelectionChange={(next) =>
              setSelection({
                ...next,
                academicYearId:
                  activeAcademicYearId != null ? String(activeAcademicYearId) : '',
              })
            }
            showAcademicYear={false}
            showTerm
            showCycle
            showLevel
            showTrack
            showClass
            classBeforeSubject
            showSubject
            showTeachingLanguage
            showOffering
            showReference={false}
            requiredFields={['term', 'class', 'subject']}
          />
          <label className="field">
            <span>{t('admin.gradebooks.scheme')}</span>
            <select
              className="input"
              value={schemeId}
              onChange={(event) => setSchemeId(event.target.value)}
            >
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
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              dir="ltr"
            />
          </label>
        </div>
      }
    />
  );
}
