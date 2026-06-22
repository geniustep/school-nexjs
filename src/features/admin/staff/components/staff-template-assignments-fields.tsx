'use client';

import { useMemo, useState } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  normalizeStaffTemplateAssignments,
  resolveStaffAssignmentCycleLabel,
  type StaffAssignmentClassOption,
  type StaffAssignmentCycleOption,
  type StaffAssignmentLevelOption,
  type StaffAssignmentSubjectOption,
} from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffAssignmentPickerState, StaffTemplateAssignments } from '@/types/staff-templates';

type MultiSelectOption = { id: number; name: string; label?: string };

function resolveMultiSelectLabel(item: MultiSelectOption): string {
  return item.label?.trim() || item.name;
}

function StaffMultiSelectCheckboxPicker({
  options,
  catalog,
  selectedIds,
  disabled,
  onChange,
  emptyLabel,
  searchPlaceholder,
  selectedAriaLabel,
  removeLabel,
  noMatchLabel,
}: {
  options: MultiSelectOption[];
  catalog: MultiSelectOption[];
  selectedIds: number[];
  disabled: boolean;
  onChange: (updater: (current: number[]) => number[]) => void;
  emptyLabel: string;
  searchPlaceholder: string;
  selectedAriaLabel: string;
  removeLabel: (name: string) => string;
  noMatchLabel: string;
}) {
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((item) => {
      const label = resolveMultiSelectLabel(item).toLowerCase();
      return label.includes(query) || item.name.toLowerCase().includes(query);
    });
  }, [options, search]);

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) => catalog.find((item) => item.id === id))
        .filter((item): item is MultiSelectOption => item != null),
    [catalog, selectedIds],
  );

  if (!options.length && !selectedIds.length) {
    return <p className="tiny muted">{emptyLabel}</p>;
  }

  return (
    <div className="staff-smart-create__class-picker">
      {options.length > 8 ? (
        <input
          type="search"
          className="input staff-smart-create__class-search"
          placeholder={searchPlaceholder}
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {selectedItems.length ? (
        <div className="staff-smart-create__selected-classes" aria-label={selectedAriaLabel}>
          {selectedItems.map((item) => (
            <span key={item.id} className="staff-smart-create__selected-class-chip">
              {resolveMultiSelectLabel(item)}
              <button
                type="button"
                className="staff-smart-create__selected-class-remove"
                disabled={disabled}
                aria-label={removeLabel(resolveMultiSelectLabel(item))}
                onClick={() => onChange((current) => current.filter((id) => id !== item.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <ul className="staff-smart-create__class-options" role="group">
        {filteredOptions.map((item) => {
          const checked = selectedSet.has(item.id);
          return (
            <li key={item.id}>
              <label className="staff-smart-create__class-option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() =>
                    onChange((current) =>
                      checked
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id].filter(
                            (id, index, array) => array.indexOf(id) === index,
                          ),
                    )
                  }
                />
                <span>{resolveMultiSelectLabel(item)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {!filteredOptions.length ? <p className="tiny muted">{noMatchLabel}</p> : null}
    </div>
  );
}

export function StaffTemplateAssignmentsFields({
  required,
  assignments,
  picker,
  cycles,
  levels,
  subjects,
  subjectCatalog,
  classes,
  classCatalog,
  academicYears,
  optionsLoading,
  optionsUnavailable,
  onPickerChange,
  onChange,
  onSubjectIdsChange,
  onClassIdsChange,
}: {
  required: string[];
  assignments: StaffTemplateAssignments;
  picker: StaffAssignmentPickerState;
  cycles: StaffAssignmentCycleOption[];
  levels: StaffAssignmentLevelOption[];
  subjects: StaffAssignmentSubjectOption[];
  subjectCatalog: StaffAssignmentSubjectOption[];
  classes: StaffAssignmentClassOption[];
  classCatalog: StaffAssignmentClassOption[];
  academicYears: { id: number; name: string }[];
  optionsLoading: boolean;
  optionsUnavailable: boolean;
  onPickerChange: (next: StaffAssignmentPickerState) => void;
  onChange: (next: StaffTemplateAssignments) => void;
  onSubjectIdsChange: (updater: (current: number[]) => number[]) => void;
  onClassIdsChange: (updater: (current: number[]) => number[]) => void;
}) {
  const t = useT();
  const normalizedAssignments = normalizeStaffTemplateAssignments(assignments);
  const selectedSubjectIds = normalizedAssignments.subject_ids ?? [];
  const selectedClassIds = normalizedAssignments.class_ids ?? [];
  const needsSubjects = required.includes('subject_id') || required.includes('subject_ids');

  if (!required.length) return null;

  const showCycle = cycles.length > 0;
  const showLevel = levels.length > 0;
  const cycleBlocksLevel = showCycle && !picker.cycleCode;
  const levelBlocksSubject = showLevel && picker.levelId == null;
  const yearBlocksClasses = required.includes('academic_year_id') && normalizedAssignments.academic_year_id == null;

  function emit(next: StaffTemplateAssignments) {
    onChange(normalizeStaffTemplateAssignments(next));
  }

  function handleCycleChange(cycleCode: string | null) {
    onPickerChange({ cycleCode, levelId: null });
    emit({
      ...normalizedAssignments,
      subject_id: null,
      subject_ids: [],
      class_ids: [],
      academic_year_id: null,
    });
  }

  function handleLevelChange(levelId: number | null) {
    onPickerChange({ ...picker, levelId });
  }

  function handleAcademicYearChange(academicYearId: number | null) {
    emit({
      ...normalizedAssignments,
      academic_year_id: academicYearId,
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

        {needsSubjects ? (
          <div className="staff-smart-create__field staff-smart-create__field--wide">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.subjects')}
            </span>
            <StaffMultiSelectCheckboxPicker
              options={subjects.map((subject) => ({
                id: subject.id,
                name: subject.name,
                label: subject.label,
              }))}
              catalog={subjectCatalog.map((subject) => ({
                id: subject.id,
                name: subject.name,
                label: subject.label,
              }))}
              selectedIds={selectedSubjectIds}
              disabled={optionsLoading || levelBlocksSubject}
              onChange={onSubjectIdsChange}
              emptyLabel={t('admin.staffCenter.smartCreate.noSubjectsForSelection')}
              searchPlaceholder={t('admin.staffCenter.smartCreate.searchSubjects')}
              selectedAriaLabel={t('admin.staffCenter.smartCreate.selectedSubjects')}
              removeLabel={(name) => t('admin.staffCenter.smartCreate.removeSubject', { name })}
              noMatchLabel={t('admin.staffCenter.smartCreate.noSubjectsMatchSearch')}
            />
            {levelBlocksSubject ? (
              <span className="tiny muted">{t('admin.staffCenter.smartCreate.selectLevelFirst')}</span>
            ) : null}
          </div>
        ) : null}

        {required.includes('academic_year_id') ? (
          <label className="staff-smart-create__field">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.academicYear')}
            </span>
            <select
              className="input"
              value={normalizedAssignments.academic_year_id ?? ''}
              disabled={optionsLoading || levelBlocksSubject}
              onChange={(event) =>
                handleAcademicYearChange(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            {levelBlocksSubject ? (
              <span className="tiny muted">{t('admin.staffCenter.smartCreate.selectLevelFirst')}</span>
            ) : null}
          </label>
        ) : null}

        {required.includes('class_ids') ? (
          <div className="staff-smart-create__field staff-smart-create__field--wide">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.classes')}
            </span>
            <StaffMultiSelectCheckboxPicker
              options={classes}
              catalog={classCatalog}
              selectedIds={selectedClassIds}
              disabled={optionsLoading || levelBlocksSubject || yearBlocksClasses}
              onChange={onClassIdsChange}
              emptyLabel={t('admin.staffCenter.smartCreate.noClassesForSelection')}
              searchPlaceholder={t('admin.staffCenter.smartCreate.searchClasses')}
              selectedAriaLabel={t('admin.staffCenter.smartCreate.selectedClasses')}
              removeLabel={(name) => t('admin.staffCenter.smartCreate.removeClass', { name })}
              noMatchLabel={t('admin.staffCenter.smartCreate.noClassesMatchSearch')}
            />
            {yearBlocksClasses ? (
              <span className="tiny muted">{t('admin.staffCenter.smartCreate.selectYearFirst')}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
