'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentQuickRegistrationCreateResponse, StudentQuickRegistrationLanguage } from '@/types/student-quick-registration';
import type { RelationshipType } from '@/types/student-360';
import { useStudentOptions } from '../hooks/use-student-options';
import { buildEnrollmentCycleOptions, filterLevelsByCycleId } from '../utils/student-enrollment-cycle';
import { relationshipTypeLabel, RELATIONSHIP_TYPE_CODES } from '../utils/relationship-types';
import { studentQuickCreateCopy } from '../utils/student-quick-create-copy';
import {
  buildStudentQuickCreatePayload,
  validateStudentQuickCreateInput,
  type StudentQuickCreateGuardianDraft,
} from '../utils/student-quick-create';

type SubmitMode = 'save' | 'addAnother';
type GuardianRow = StudentQuickCreateGuardianDraft & { key: number };

function newGuardian(key: number): GuardianRow {
  return { key, name: '', phone: '', relationshipType: 'father' };
}

export function StudentQuickCreateDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const copy = useMemo(() => studentQuickCreateCopy(locale), [locale]);
  const toast = useToast();
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const optionsState = useStudentOptions();
  const levelOptionsState = useLevelOptions(open, { include_enabled: 'true' });
  const [language, setLanguage] = useState<StudentQuickRegistrationLanguage>('ar');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [guardianIsFinancialResponsible, setGuardianIsFinancialResponsible] = useState(true);
  const [createGuardian, setCreateGuardian] = useState(false);
  const [guardians, setGuardians] = useState<GuardianRow[]>([newGuardian(1)]);
  const [nextGuardianKey, setNextGuardianKey] = useState(2);
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
    setLanguage('ar');
    setFirstName('');
    setLastName('');
    setCycleId('');
    setLevelId('');
    setGuardianIsFinancialResponsible(true);
    setCreateGuardian(false);
    setGuardians([newGuardian(1)]);
    setNextGuardianKey(2);
    setError('');
    setSubmitting(false);
  }, [open]);

  function validationMessage(code: 'name' | 'cycle' | 'level' | 'context' | 'guardian'): string {
    if (code === 'name') {
      return language === 'ar'
        ? t('admin.studentsList.quickCreate.nameArRequired')
        : t('admin.studentsList.quickCreate.nameLatinRequired');
    }
    if (code === 'cycle') return t('admin.studentsList.quickCreate.cycleRequired');
    if (code === 'level') return t('admin.studentsList.quickCreate.levelRequired');
    if (code === 'guardian') return copy.guardianRequired;
    return t('admin.studentsList.quickCreate.contextRequired');
  }

  function resetGuardianIntent() {
    setGuardianIsFinancialResponsible(true);
    setCreateGuardian(false);
    setGuardians([newGuardian(1)]);
    setNextGuardianKey(2);
  }

  function resetForAnotherStudent() {
    setFirstName('');
    setLastName('');
    resetGuardianIntent();
    setError('');
  }

  async function handleCreate(mode: SubmitMode) {
    if (submitting || optionsLoading || optionsFailed) return;
    const validation = validateStudentQuickCreateInput({
      language,
      firstName,
      lastName,
      cycleId,
      levelId,
      schoolId: activeSchoolId,
      academicYearId: activeAcademicYearId,
      guardianIsFinancialResponsible,
      createGuardian,
      guardians,
    });
    if (!validation.valid) {
      const message = validationMessage(validation.error);
      setError(message);
      toast.error(message);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await api.post<StudentQuickRegistrationCreateResponse>(
        endpoints.admin.students,
        buildStudentQuickCreatePayload(validation),
      );
      if (!res.success || !res.data || !Number.isFinite(res.data.id) || res.data.id <= 0) {
        const message = res.success ? t('admin.studentsList.quickCreate.failed') : res.error.message;
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(copy.createdInBackground);
      onCreated();

      if (mode === 'addAnother') {
        resetForAnotherStudent();
        return;
      }

      const studentId = res.data.id;
      onClose();
      router.push(`/admin/students/${studentId}`);
    } finally {
      setSubmitting(false);
    }
  }

  function switchLanguage(next: StudentQuickRegistrationLanguage) {
    if (next === language || submitting) return;
    setLanguage(next);
    setFirstName('');
    setLastName('');
    setError('');
  }

  function patchGuardian(index: number, patch: Partial<StudentQuickCreateGuardianDraft>) {
    setGuardians((current) => current.map((guardian, currentIndex) => (
      currentIndex === index ? { ...guardian, ...patch } : guardian
    )));
    setError('');
  }

  function addGuardian() {
    setGuardians((current) => [...current, newGuardian(nextGuardianKey)]);
    setNextGuardianKey((key) => key + 1);
  }

  function removeGuardian(index: number) {
    setGuardians((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current);
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

        <fieldset className="field" disabled={submitting}>
          <legend>{copy.languageLabel}</legend>
          <div className="row" role="group" aria-label={copy.languageLabel}>
            <button type="button" className={language === 'ar' ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'} aria-pressed={language === 'ar'} onClick={() => switchLanguage('ar')}>{copy.arabic}</button>
            <button type="button" className={language === 'fr' ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'} aria-pressed={language === 'fr'} onClick={() => switchLanguage('fr')}>{copy.french}</button>
          </div>
        </fieldset>

        <div className="grid grid--form">
          <label className="field"><span>{copy.firstName}</span><input className="input" dir={language === 'fr' ? 'ltr' : 'auto'} value={firstName} onChange={(event) => { setFirstName(event.target.value); clearError(); }} autoFocus autoComplete="given-name" disabled={submitting} /></label>
          <label className="field"><span>{copy.lastName}</span><input className="input" dir={language === 'fr' ? 'ltr' : 'auto'} value={lastName} onChange={(event) => { setLastName(event.target.value); clearError(); }} autoComplete="family-name" disabled={submitting} /></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.cycle')}</span><select className="input" value={cycleId} onChange={(event) => { setCycleId(event.target.value); setLevelId(''); clearError(); }} disabled={submitting || optionsLoading || optionsFailed}><option value="">{optionsLoading ? t('admin.studentsList.quickCreate.optionsLoading') : t('admin.studentsList.quickCreate.selectCycle')}</option>{cycleOptions.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></label>
          <label className="field"><span>{t('admin.studentsList.quickCreate.level')}</span><select className="input" value={levelId} onChange={(event) => { setLevelId(event.target.value); clearError(); }} disabled={submitting || optionsLoading || optionsFailed || !cycleId}><option value="">{cycleId ? t('admin.studentsList.quickCreate.selectLevel') : t('admin.studentsList.quickCreate.selectCycleFirst')}</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.display_name ?? level.display_alias ?? level.name}</option>)}</select></label>
        </div>

        <label className="field row">
          <input
            type="checkbox"
            checked={guardianIsFinancialResponsible}
            disabled={submitting}
            onChange={(event) => {
              const checked = event.target.checked;
              setGuardianIsFinancialResponsible(checked);
              if (!checked) {
                setCreateGuardian(false);
                setGuardians([newGuardian(1)]);
                setNextGuardianKey(2);
              }
              clearError();
            }}
          />
          <span>{copy.financialResponsible}</span>
        </label>

        {guardianIsFinancialResponsible ? <>
          <label className="field row">
            <input
              type="checkbox"
              checked={createGuardian}
              disabled={submitting}
              onChange={(event) => {
                const checked = event.target.checked;
                setCreateGuardian(checked);
                if (!checked) {
                  setGuardians([newGuardian(1)]);
                  setNextGuardianKey(2);
                }
                clearError();
              }}
            />
            <span>{copy.createGuardian}</span>
          </label>

          {createGuardian ? <div className="form-stack">
            {guardians.map((guardian, index) => <fieldset className="card card--pad" key={guardian.key} disabled={submitting}>
              <div className="grid grid--form">
                <label className="field"><span>{copy.guardianFullName}</span><input className="input" dir="auto" value={guardian.name} onChange={(event) => patchGuardian(index, { name: event.target.value })} autoComplete="name" /></label>
                <label className="field"><span>{copy.guardianPhone}</span><input className="input" dir="ltr" inputMode="tel" value={guardian.phone} onChange={(event) => patchGuardian(index, { phone: event.target.value })} autoComplete="tel" /></label>
                <label className="field"><span>{copy.guardianRelationship}</span><select className="input" value={guardian.relationshipType} onChange={(event) => patchGuardian(index, { relationshipType: event.target.value as RelationshipType })}>{RELATIONSHIP_TYPE_CODES.map((code) => <option key={code} value={code}>{relationshipTypeLabel(t, code)}</option>)}</select></label>
              </div>
              {guardians.length > 1 ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeGuardian(index)}>{copy.removeGuardian}</button> : null}
            </fieldset>)}
            <button type="button" className="btn btn--ghost btn--sm" disabled={submitting} onClick={addGuardian}>+ {copy.addGuardian}</button>
          </div> : null}
        </> : null}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--ghost btn--sm" disabled={submitting || optionsLoading || optionsFailed} onClick={() => void handleCreate('addAnother')}>{copy.saveAndAddAnother}</button>
        </div>
      </div>}
      size="form"
      closeOnBackdrop={!submitting}
      loading={submitting}
      confirmLabel={copy.save}
      cancelLabel={t('common.cancel')}
      onConfirm={() => handleCreate('save')}
      onClose={onClose}
    />
  );
}
