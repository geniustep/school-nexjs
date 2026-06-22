'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  resolveStaffAssignmentCycleLabel,
  type StaffAssignmentClassOption,
  type StaffAssignmentCycleOption,
  type StaffAssignmentLevelOption,
  type StaffAssignmentSubjectOption,
} from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffAssignmentPickerState, StaffTemplateAssignments } from '@/types/staff-templates';

export function StaffTemplateAssignmentsFields({
  required,
  assignments,
  picker,
  cycles,
  levels,
  subjects,
  classes,
  academicYears,
  optionsLoading,
  optionsUnavailable,
  onPickerChange,
  onChange,
}: {
  required: string[];
  assignments: StaffTemplateAssignments;
  picker: StaffAssignmentPickerState;
  cycles: StaffAssignmentCycleOption[];
  levels: StaffAssignmentLevelOption[];
  subjects: StaffAssignmentSubjectOption[];
  classes: StaffAssignmentClassOption[];
  academicYears: { id: number; name: string }[];
  optionsLoading: boolean;
  optionsUnavailable: boolean;
  onPickerChange: (next: StaffAssignmentPickerState) => void;
  onChange: (next: StaffTemplateAssignments) => void;
}) {
  const t = useT();

  if (!required.length) return null;

  const showCycle = cycles.length > 0;
  const showLevel = levels.length > 0;
  const cycleBlocksLevel = showCycle && !picker.cycleCode;
  const levelBlocksSubject = showLevel && picker.levelId == null;

  function handleCycleChange(cycleCode: string | null) {
    onPickerChange({ cycleCode, levelId: null });
    onChange({
      ...assignments,
      subject_id: null,
      class_ids: [],
    });
  }

  function handleLevelChange(levelId: number | null) {
    onPickerChange({ ...picker, levelId });
    onChange({
      ...assignments,
      subject_id: null,
      class_ids: [],
    });
  }

  return (
    <section className="staff-smart-create__section-card staff-smart-create__assignments">
      <div className="staff-smart-create__section-heading">
        <h3 className="staff-smart-create__section-title">
          {t('admin.staffCenter.smartCreate.requiredAssignments')}
        </h3>
        <p className="staff-smart-create__section-desc">
          {t('admin.staffCenter.smartCreate.requiredAssignmentsHint')}
        </p>
      </div>

      {optionsUnavailable ? (
        <InfoBanner
          tone="amber"
          icon="⚠"
          title={t('admin.staffCenter.smartCreate.assignmentsUnavailableTitle')}
          description={t('admin.staffCenter.smartCreate.assignmentsUnavailableDesc')}
        />
      ) : null}

      <div className="staff-smart-create__field-grid" aria-busy={optionsLoading}>
        {showCycle ? (
          <label className="staff-smart-create__field">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.studyCycle')}
            </span>
            <select
              className="input"
              value={picker.cycleCode ?? ''}
              disabled={optionsLoading}
              onChange={(event) =>
                handleCycleChange(event.target.value ? event.target.value : null)
              }
            >
              <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.code} value={cycle.code}>
                  {resolveStaffAssignmentCycleLabel(cycle, t)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showLevel ? (
          <label className="staff-smart-create__field">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.studyLevel')}
            </span>
            <select
              className="input"
              value={picker.levelId ?? ''}
              disabled={optionsLoading || cycleBlocksLevel}
              onChange={(event) =>
                handleLevelChange(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
            {cycleBlocksLevel ? (
              <span className="tiny muted">{t('admin.staffCenter.smartCreate.selectCycleFirst')}</span>
            ) : null}
          </label>
        ) : null}

        {required.includes('subject_id') ? (
          <label className="staff-smart-create__field">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.subject')}
            </span>
            <select
              className="input"
              value={assignments.subject_id ?? ''}
              disabled={optionsLoading || levelBlocksSubject}
              onChange={(event) =>
                onChange({
                  ...assignments,
                  subject_id: event.target.value ? Number(event.target.value) : null,
                })
              }
            >
              <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {levelBlocksSubject ? (
              <span className="tiny muted">{t('admin.staffCenter.smartCreate.selectLevelFirst')}</span>
            ) : null}
          </label>
        ) : null}

        {required.includes('class_ids') ? (
          <label className="staff-smart-create__field staff-smart-create__field--wide">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.classes')}
            </span>
            <select
              className="input"
              multiple
              size={Math.min(6, Math.max(3, classes.length || 3))}
              disabled={optionsLoading || levelBlocksSubject}
              value={(assignments.class_ids ?? []).map(String)}
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions).map((option) =>
                  Number(option.value),
                );
                onChange({ ...assignments, class_ids: selected });
              }}
            >
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
            <span className="tiny muted">{t('admin.staffCenter.smartCreate.multiSelectHint')}</span>
          </label>
        ) : null}

        {required.includes('academic_year_id') ? (
          <label className="staff-smart-create__field">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.academicYear')}
            </span>
            <select
              className="input"
              value={assignments.academic_year_id ?? ''}
              disabled={optionsLoading}
              onChange={(event) =>
                onChange({
                  ...assignments,
                  academic_year_id: event.target.value ? Number(event.target.value) : null,
                })
              }
            >
              <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </section>
  );
}
