'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useStudentOptions } from '../hooks/use-student-options';
import { buildEnrollmentCycleOptions, filterLevelsByCycleId } from '../utils/student-enrollment-cycle';
import { buildStudentQuickCreatePayload, validateStudentQuickCreateInput } from '../utils/student-quick-create';

export function StudentQuickCreateDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const optionsState = useStudentOptions();
  const levelOptionsState = useLevelOptions(open, { include_enabled: 'true' });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameLatin, setFirstNameLatin] = useState('');
  const [lastNameLatin, setLastNameLatin] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const levelsForYear = useMemo(
    () => (optionsState.options?.levels ?? []).filter(
      (level) =>
        (level.school_id == null || level.school_id === activeSchoolId) &&
        (level.academic_year_id == null || level.academic_year_id === activeAcademicYearId),
    ),
    [activeAcademicYearId, activeSchoolId, optionsState.options?.levels],
  );
  const referenceLevels = levelOptionsState.options?.reference_levels ?? [];
  const cycles = levelOptionsState.options?.cycles ?? [];
  const cycleOptions = useMemo(
    () => buildEnrollmentCycleOptions(levelsForYear, referenceLevels, cycles),
    [cycles, levelsForYear, referenceLevels],
  );
  const levels = useMemo(
    () => filterLevelsByCycleId(levelsForYear, cycleId, referenceLevels, cycles),
    [cycleId, cycles, levelsForYear, referenceLevels],
  );
  const optionsLoading = optionsState.loading || levelOptionsState.loading;
  const optionsFailed = Boolean(optionsState.error || levelOptionsState.error);

  useEffect(() => {
    if (!open) return;
    setFirstName(''); setLastName(''); setFirstNameLatin(''); setLastNameLatin('');
    setCycleId(''); setLevelId(''); setError('');
  }, [open]);

  function validationMessage(code: 'name_ar' | 'name_latin' | 'cycle' | 'level' | 'context'): string {
    if (code === 'name_ar') return t('admin.studentsList.quickCreate.nameArRequired');
    if (code === 'name_latin') return t('admin.studentsList.quickCreate.nameLatinRequired');
    if (code === 'cycle') return t('admin.studentsList.quickCreate.cycleRequired');
    if (code === 'level') return t('admin.studentsList.quickCreate.levelRequired');
    return t('admin.studentsList.quickCreate.contextRequired');
  }

  async function handleCreate() {
    if (optionsLoading || optionsFailed) return;
    const validation = validateStudentQuickCreateInput({
      firstName, lastName, firstNameLatin, lastNameLatin, cycleId, levelId,
      schoolId: activeSchoolId, academicYearId: activeAcademicYearId,
    });
    if (!validation.valid) {
      const message = validationMessage(validation.error);
      setError(message); toast.error(message); return;
    }
    setError(''); setSubmitting(true);
    const res = await api.post<{ id: number }>(endpoints.admin.students, buildStudentQuickCreatePayload(validation));
    setSubmitting(false);
    if (!res.success || !res.data) {
      const message = res.success ? t('admin.studentsList.quickCreate.failed') : res.error.message;
      setError(message); toast.error(message); return;
    }
    toast.success(t('admin.studentsList.quickCreate.created'));
    onCreated(); onClose();
  }

  if (!open) return null;
  const clearError = () => setError('');
  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.studentsList.quickCreate.title')}
      body={<div className="form-stack">
        <p className="muted">{t('admin.studentsList.quickCreate.description')}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {optionsFailed ? <p className="form-error" role="alert">{t('admin.studentsList.quickCreate.optionsLoadFailed')}</p> : null}
        <div className="grid grid--form">
          <label className="field"><span>{t('admin.studentsList.quickCreate.firstNameAr')}</span><input className="input" value={firstName} onChange={(event) => { setFirstName(event.target.value); clearError(); }} autoFocus autoComplete="given-name" disabled={submitting} /></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.lastNameAr')}</span><input className="input" value={lastName} onChange={(event) => { setLastName(event.target.value); clearError(); }} autoComplete="family-name" disabled={submitting} /></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.firstNameLatin')}</span><input className="input" dir="ltr" value={firstNameLatin} onChange={(event) => { setFirstNameLatin(event.target.value); clearError(); }} autoComplete="given-name" disabled={submitting} /></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.lastNameLatin')}</span><input className="input" dir="ltr" value={lastNameLatin} onChange={(event) => { setLastNameLatin(event.target.value); clearError(); }} autoComplete="family-name" disabled={submitting} /></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.cycle')}</span><select className="input" value={cycleId} onChange={(event) => { setCycleId(event.target.value); setLevelId(''); clearError(); }} disabled={submitting || optionsLoading || optionsFailed}><option value="">{optionsLoading ? t('admin.studentsList.quickCreate.optionsLoading') : t('admin.studentsList.quickCreate.selectCycle')}</option>{cycleOptions.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.level')}</span><select className="input" value={levelId} onChange={(event) => { setLevelId(event.target.value); clearError(); }} disabled={submitting || optionsLoading || optionsFailed || !cycleId}><option value="">{cycleId ? t('admin.studentsList.quickCreate.selectLevel') : t('admin.studentsList.quickCreate.selectCycleFirst')}</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.display_name ?? level.display_alias ?? level.name}</option>)}</select></label>
        </div>
      </div>}
      size="form"
      closeOnBackdrop={!submitting}
      loading={submitting}
      confirmLabel={t('admin.studentsList.quickCreate.submit')}
      cancelLabel={t('common.cancel')}
      onConfirm={handleCreate}
      onClose={onClose}
    />
  );
}
