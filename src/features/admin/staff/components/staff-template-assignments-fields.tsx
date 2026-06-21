'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StaffTemplateAssignments } from '@/types/staff-templates';

export function StaffTemplateAssignmentsFields({
  required,
  assignments,
  subjects,
  classes,
  academicYears,
  optionsLoading,
  optionsUnavailable,
  onChange,
}: {
  required: string[];
  assignments: StaffTemplateAssignments;
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  academicYears: { id: number; name: string }[];
  optionsLoading: boolean;
  optionsUnavailable: boolean;
  onChange: (next: StaffTemplateAssignments) => void;
}) {
  const t = useT();

  if (!required.length) return null;

  if (optionsUnavailable) {
    return (
      <InfoBanner
        tone="amber"
        icon="⚠"
        title={t('admin.staffCenter.smartCreate.assignmentsUnavailableTitle')}
        description={t('admin.staffCenter.smartCreate.assignmentsUnavailableDesc')}
      />
    );
  }

  return (
    <section className="staff-smart-create__section-card staff-smart-create__assignments">
      <h3 className="staff-smart-create__section-title">
        {t('admin.staffCenter.smartCreate.requiredAssignments')}
      </h3>
      <div className="staff-smart-create__field-grid" aria-busy={optionsLoading}>
        {required.includes('subject_id') ? (
          <label className="staff-smart-create__field">
            <span className="tiny muted">{t('admin.staffCenter.smartCreate.subject')}</span>
            <select
              className="input"
              value={assignments.subject_id ?? ''}
              disabled={optionsLoading}
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
          </label>
        ) : null}

        {required.includes('class_ids') ? (
          <label className="staff-smart-create__field staff-smart-create__field--wide">
            <span className="tiny muted">{t('admin.staffCenter.smartCreate.classes')}</span>
            <select
              className="input"
              multiple
              size={Math.min(6, Math.max(3, classes.length))}
              disabled={optionsLoading}
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
            <span className="tiny muted">{t('admin.staffCenter.smartCreate.academicYear')}</span>
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
