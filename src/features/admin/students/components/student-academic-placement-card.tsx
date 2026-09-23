'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { InfoBanner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type {
  StudentDetailsData,
  StudentEnrollment,
  StudentLevelOption,
} from '@/types/student-360';
import { correctStudentAcademicPlacement } from '../api/student-academic-placement-api';
import { normalizeStudentDetailsResponse } from '../utils/normalize-student-details';
import {
  academicPlacementCycleCode,
  academicPlacementErrorMessageKey,
  academicPlacementWillUnassign,
  buildAcademicPlacementCycles,
  filterAcademicPlacementLevels,
  levelBelongsToAcademicPlacementCycle,
} from '../utils/student-academic-placement';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';

function cycleLabel(code: string, t: (key: string) => string): string {
  const key = `admin.student360.editPage.academicPlacement.cycles.${code}`;
  const translated = t(key);
  return translated === key ? code : translated;
}

export function StudentAcademicPlacementCard({
  studentId,
  enrollment,
  levels,
  optionsLoading,
  canManage,
  onUpdated,
}: {
  studentId: number | string;
  enrollment: StudentEnrollment | null;
  levels: StudentLevelOption[];
  optionsLoading: boolean;
  canManage: boolean;
  onUpdated?: (data: StudentDetailsData) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [finalEnrollment, setFinalEnrollment] = useState<StudentEnrollment | null>(null);
  const displayEnrollment = finalEnrollment ?? enrollment;
  const [cycleCode, setCycleCode] = useState(() => academicPlacementCycleCode(enrollment?.level));
  const [levelId, setLevelId] = useState(() =>
    enrollment?.level?.id != null ? String(enrollment.level.id) : '',
  );
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    setFinalEnrollment(null);
    setCycleCode(academicPlacementCycleCode(enrollment?.level));
    setLevelId(enrollment?.level?.id != null ? String(enrollment.level.id) : '');
    setErrorKey(null);
    setConfirmOpen(false);
  }, [enrollment?.id, enrollment?.level?.id, enrollment?.level?.cycle?.code]);

  const cycles = useMemo(() => {
    const values = buildAcademicPlacementCycles(levels);
    const current = academicPlacementCycleCode(displayEnrollment?.level);
    return current && !values.includes(current) ? [current, ...values] : values;
  }, [levels, displayEnrollment?.level]);

  const filteredLevels = useMemo(() => {
    const values = filterAcademicPlacementLevels(levels, cycleCode);
    const current = displayEnrollment?.level;
    if (
      current &&
      academicPlacementCycleCode(current) === cycleCode &&
      !values.some((level) => level.id === current.id)
    ) {
      return [current as StudentLevelOption, ...values];
    }
    return values;
  }, [levels, cycleCode, displayEnrollment?.level]);

  const currentLevelId =
    displayEnrollment?.level?.id != null ? String(displayEnrollment.level.id) : '';
  const changed = Boolean(levelId) && levelId !== currentLevelId;
  const willUnassign = academicPlacementWillUnassign(displayEnrollment, levelId);

  if (!displayEnrollment) {
    return (
      <div className="student-create-form__group">
        <div className="student-create-form__group-head">
          <span className="student-create-form__group-icon" aria-hidden="true">↗</span>
          <h3 className="student-create-form__group-title">
            {t('admin.student360.editPage.academicPlacement.title')}
          </h3>
        </div>
        <InfoBanner
          tone="amber"
          title={t('admin.student360.editPage.academicPlacement.errors.noActiveEnrollment')}
        />
      </div>
    );
  }

  async function applyPlacement() {
    const targetLevelId = Number(levelId);
    if (!Number.isFinite(targetLevelId) || targetLevelId <= 0) {
      setErrorKey('admin.student360.editPage.academicPlacement.errors.validation');
      return;
    }
    if (!changed || saving) return;

    setSaving(true);
    setErrorKey(null);
    const result = await correctStudentAcademicPlacement(studentId, {
      level_id: targetLevelId,
    });
    setSaving(false);
    setConfirmOpen(false);

    if (!result.success) {
      const key = academicPlacementErrorMessageKey(result.error.code);
      setErrorKey(key);
      toast.error(t(key));
      return;
    }

    const normalized = normalizeStudentDetailsResponse(result.data);
    if (!normalized?.current_enrollment) {
      const key = 'admin.student360.editPage.academicPlacement.errors.generic';
      setErrorKey(key);
      toast.error(t(key));
      return;
    }

    setFinalEnrollment(normalized.current_enrollment);
    setCycleCode(academicPlacementCycleCode(normalized.current_enrollment.level));
    setLevelId(
      normalized.current_enrollment.level?.id != null
        ? String(normalized.current_enrollment.level.id)
        : '',
    );
    toast.success(t('admin.student360.editPage.academicPlacement.success'));
    onUpdated?.(normalized);
  }

  function requestSave() {
    if (!changed || saving || !canManage) return;
    if (willUnassign) {
      setConfirmOpen(true);
      return;
    }
    void applyPlacement();
  }

  return (
    <div className="student-create-form__group">
      <div className="student-create-form__group-head">
        <span className="student-create-form__group-icon" aria-hidden="true">↗</span>
        <div>
          <h3 className="student-create-form__group-title">
            {t('admin.student360.editPage.academicPlacement.title')}
          </h3>
          <p className="tiny muted">
            {t('admin.student360.editPage.academicPlacement.description')}
          </p>
        </div>
      </div>

      <div className="student-create-form__grid">
        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.student360.editPage.academicPlacement.cycle')}
            </span>
            <select
              className="input"
              aria-label={t('admin.student360.editPage.academicPlacement.cycle')}
              value={cycleCode}
              disabled={optionsLoading || saving || !canManage}
              onChange={(event) => {
                const nextCycle = event.target.value;
                setCycleCode(nextCycle);
                setErrorKey(null);
                if (!levelBelongsToAcademicPlacementCycle(levelId, nextCycle, levels)) {
                  setLevelId('');
                }
              }}
            >
              <option value="">
                {t('admin.student360.editPage.academicPlacement.selectCycle')}
              </option>
              {cycles.map((code) => (
                <option key={code} value={code}>
                  {cycleLabel(code, t)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.student360.editPage.academicPlacement.level')}
            </span>
            <select
              className="input"
              aria-label={t('admin.student360.editPage.academicPlacement.level')}
              value={levelId}
              disabled={optionsLoading || saving || !canManage || !cycleCode}
              onChange={(event) => {
                setLevelId(event.target.value);
                setErrorKey(null);
              }}
            >
              <option value="">
                {t('admin.student360.editPage.academicPlacement.selectLevel')}
              </option>
              {filteredLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {studentLevelLabel(level)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="student-create-form__cell student-create-form__cell--full">
          <span className="student-create-field__label">
            {t('admin.student360.editPage.academicPlacement.currentClass')}
          </span>
          <p className="muted">
            {displayEnrollment.class
              ? studentClassLabel(displayEnrollment.class)
              : t('admin.student360.editPage.academicPlacement.unassigned')}
          </p>
        </div>
      </div>

      {!canManage ? (
        <InfoBanner
          title={t('admin.student360.editPage.academicPlacement.readOnlyTitle')}
          description={t('admin.student360.editPage.academicPlacement.readOnlyHint')}
        />
      ) : null}

      {willUnassign && changed ? (
        <InfoBanner
          tone="amber"
          title={t('admin.student360.editPage.academicPlacement.classWarningTitle')}
          description={t('admin.student360.editPage.academicPlacement.classWarning')}
        />
      ) : null}

      {errorKey ? <p className="form-error" role="alert">{t(errorKey)}</p> : null}

      {canManage ? (
        <div className="form-actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={saving || optionsLoading || !changed || !levelId}
            onClick={requestSave}
          >
            {saving
              ? t('common.saving')
              : t('admin.student360.editPage.academicPlacement.update')}
          </button>
        </div>
      ) : null}

      <ConfirmationDialog
        open={confirmOpen}
        title={t('admin.student360.editPage.academicPlacement.confirmTitle')}
        body={t('admin.student360.editPage.academicPlacement.confirmBody')}
        confirmLabel={t('admin.student360.editPage.academicPlacement.confirmAction')}
        loading={saving}
        onConfirm={applyPlacement}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
