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
import type { NormalizedAcademicPlacementFinancePreview } from '@/types/student-finance-change-plan';
import {
  correctStudentAcademicPlacement,
  previewStudentAcademicPlacementFinanceTransition,
} from '../api/student-academic-placement-api';
import { normalizeStudentDetailsResponse } from '../utils/normalize-student-details';
import {
  academicPlacementCycleCode,
  academicPlacementErrorMessageKey,
  academicPlacementWillUnassign,
  buildAcademicPlacementCycles,
  filterAcademicPlacementLevels,
  levelBelongsToAcademicPlacementCycle,
} from '../utils/student-academic-placement';
import {
  academicPlacementFinanceTransitionErrorMessageKey,
  normalizeAcademicPlacementFinancePreview,
  shouldOfferAcademicPlacementCarryForward,
} from '../utils/student-academic-placement-finance-preview';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import { StudentAcademicPlacementFinanceTransitionDialog } from './student-academic-placement-finance-transition-dialog';

function cycleLabel(code: string, t: (key: string) => string): string {
  const key = `admin.student360.editPage.academicPlacement.cycles.${code}`;
  const translated = t(key);
  return translated === key ? code : translated;
}

function enrollmentAcademicYearId(enrollment: StudentEnrollment | null): number | null {
  const year = enrollment?.academic_year;
  if (!year || typeof year === 'string') return null;
  return typeof year.id === 'number' && Number.isFinite(year.id) ? year.id : null;
}

export function StudentAcademicPlacementCard({
  studentId,
  enrollment,
  levels,
  optionsLoading,
  canManage,
  canManageFinanceTransition,
  onUpdated,
}: {
  studentId: number | string;
  enrollment: StudentEnrollment | null;
  levels: StudentLevelOption[];
  optionsLoading: boolean;
  canManage: boolean;
  canManageFinanceTransition: boolean;
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
  const [financePreviewLoading, setFinancePreviewLoading] = useState(false);
  const [financeApplyLoading, setFinanceApplyLoading] = useState(false);
  const [financePreview, setFinancePreview] =
    useState<NormalizedAcademicPlacementFinancePreview | null>(null);
  const [financeReviewOpen, setFinanceReviewOpen] = useState(false);
  const [financeStaleRefreshed, setFinanceStaleRefreshed] = useState(false);
  const [financeErrorKey, setFinanceErrorKey] = useState<string | null>(null);

  useEffect(() => {
    setFinalEnrollment(null);
    setCycleCode(academicPlacementCycleCode(enrollment?.level));
    setLevelId(enrollment?.level?.id != null ? String(enrollment.level.id) : '');
    setErrorKey(null);
    setConfirmOpen(false);
    setFinancePreview(null);
    setFinanceReviewOpen(false);
    setFinanceStaleRefreshed(false);
    setFinanceErrorKey(null);
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
  const busy = saving || financePreviewLoading || financeApplyLoading;
  const targetLevel = levels.find((level) => String(level.id) === levelId) ?? null;

  function clearFinanceReview() {
    setFinancePreview(null);
    setFinanceReviewOpen(false);
    setFinanceStaleRefreshed(false);
    setFinanceErrorKey(null);
  }

  function applySuccessfulStudent(raw: unknown) {
    const normalized = normalizeStudentDetailsResponse(raw);
    if (!normalized?.current_enrollment) {
      const key = 'admin.student360.editPage.academicPlacement.errors.generic';
      setErrorKey(key);
      toast.error(t(key));
      return false;
    }

    setFinalEnrollment(normalized.current_enrollment);
    setCycleCode(academicPlacementCycleCode(normalized.current_enrollment.level));
    setLevelId(
      normalized.current_enrollment.level?.id != null
        ? String(normalized.current_enrollment.level.id)
        : '',
    );
    setConfirmOpen(false);
    clearFinanceReview();
    toast.success(t('admin.student360.editPage.academicPlacement.success'));
    onUpdated?.(normalized);
    return true;
  }

  async function requestFinancePreview(
    targetLevelId: number,
    options: { staleRefresh?: boolean } = {},
  ) {
    setFinancePreviewLoading(true);
    setFinanceErrorKey(null);
    const academicYearId = enrollmentAcademicYearId(displayEnrollment);
    const payload = {
      mode: 'carry_forward_plan_change' as const,
      level_id: targetLevelId,
      ...(academicYearId != null ? { academic_year_id: academicYearId } : {}),
    };
    const result = await previewStudentAcademicPlacementFinanceTransition(studentId, payload);
    setFinancePreviewLoading(false);

    if (!result.success) {
      const key = academicPlacementFinanceTransitionErrorMessageKey(result.error.code);
      setFinanceErrorKey(key);
      setErrorKey(key);
      toast.error(t(key));
      return false;
    }

    const normalized = normalizeAcademicPlacementFinancePreview(result.data);
    if (!normalized.previewToken) {
      const key = 'admin.student360.editPage.academicPlacement.financeTransition.errors.generic';
      setFinanceErrorKey(key);
      setErrorKey(key);
      toast.error(t(key));
      return false;
    }

    setErrorKey(null);
    setFinancePreview(normalized);
    setFinanceStaleRefreshed(Boolean(options.staleRefresh));
    setFinanceReviewOpen(true);
    return true;
  }

  async function applyPlacement() {
    const targetLevelId = Number(levelId);
    if (!Number.isFinite(targetLevelId) || targetLevelId <= 0) {
      setErrorKey('admin.student360.editPage.academicPlacement.errors.validation');
      return;
    }
    if (!changed || busy) return;

    setSaving(true);
    setErrorKey(null);
    const result = await correctStudentAcademicPlacement(studentId, {
      level_id: targetLevelId,
    });
    setSaving(false);
    setConfirmOpen(false);

    if (!result.success) {
      if (shouldOfferAcademicPlacementCarryForward(result.error.code, result.error.details)) {
        if (!canManageFinanceTransition) {
          const key =
            'admin.student360.editPage.academicPlacement.financeTransition.errors.permissionDenied';
          setErrorKey(key);
          toast.error(t(key));
          return;
        }
        await requestFinancePreview(targetLevelId);
        return;
      }

      const key = academicPlacementErrorMessageKey(result.error.code, result.error.details);
      setErrorKey(key);
      toast.error(t(key));
      return;
    }

    applySuccessfulStudent(result.data);
  }

  async function applyFinanceTransition() {
    const targetLevelId = Number(levelId);
    const token = financePreview?.previewToken;
    if (
      !Number.isFinite(targetLevelId) ||
      targetLevelId <= 0 ||
      !token ||
      financeApplyLoading ||
      !canManageFinanceTransition
    ) {
      return;
    }

    setFinanceApplyLoading(true);
    setFinanceErrorKey(null);
    const result = await correctStudentAcademicPlacement(studentId, {
      level_id: targetLevelId,
      confirm_finance_transition: true,
      preview_token: token,
    });
    setFinanceApplyLoading(false);

    if (!result.success) {
      if (result.error.code === 'finance_transition_preview_stale') {
        const key =
          'admin.student360.editPage.academicPlacement.financeTransition.errors.stale';
        setFinanceErrorKey(key);
        toast.error(t(key));
        await requestFinancePreview(targetLevelId, { staleRefresh: true });
        return;
      }
      const key = academicPlacementFinanceTransitionErrorMessageKey(result.error.code);
      setFinanceErrorKey(key);
      toast.error(t(key));
      return;
    }

    applySuccessfulStudent(result.data);
  }

  function requestSave() {
    if (!changed || busy || !canManage) return;
    if (willUnassign) {
      setConfirmOpen(true);
      return;
    }
    void applyPlacement();
  }

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
              disabled={optionsLoading || busy || !canManage}
              onChange={(event) => {
                const nextCycle = event.target.value;
                setCycleCode(nextCycle);
                setErrorKey(null);
                clearFinanceReview();
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
              disabled={optionsLoading || busy || !canManage || !cycleCode}
              onChange={(event) => {
                setLevelId(event.target.value);
                setErrorKey(null);
                clearFinanceReview();
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

      {financePreviewLoading ? (
        <InfoBanner
          title={t('admin.student360.editPage.academicPlacement.financeTransition.previewingTitle')}
          description={t('admin.student360.editPage.academicPlacement.financeTransition.previewingDescription')}
        />
      ) : null}

      {errorKey ? <p className="form-error" role="alert">{t(errorKey)}</p> : null}

      {canManage ? (
        <div className="form-actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy || optionsLoading || !changed || !levelId}
            onClick={requestSave}
          >
            {busy
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

      <StudentAcademicPlacementFinanceTransitionDialog
        open={financeReviewOpen}
        preview={financePreview}
        currentLevelLabel={studentLevelLabel(displayEnrollment.level)}
        targetLevelLabel={studentLevelLabel(targetLevel)}
        willUnassign={willUnassign}
        canConfirm={canManageFinanceTransition}
        applying={financeApplyLoading || financePreviewLoading}
        staleRefreshed={financeStaleRefreshed}
        errorKey={financeErrorKey}
        onConfirm={applyFinanceTransition}
        onClose={clearFinanceReview}
      />
    </div>
  );
}
