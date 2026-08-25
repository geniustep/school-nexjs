'use client';

import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { SiblingLine } from '@/types/sibling-line';
import type { Student } from '@/types/student';
import { emptySiblingLine } from '../utils/sibling-lines';
import { SiblingStudentSearch } from './sibling-student-search';

function SiblingField({
  label,
  error,
  hint,
  children,
  wide,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`student-create-form__cell${wide ? ' student-create-form__cell--full' : ''}`}
    >
      <label className="student-create-field">
        <span className="student-create-field__label">{label}</span>
        {children}
        {hint ? <span className="student-create-field__hint">{hint}</span> : null}
        {error ? <span className="student-create-field__error">{error}</span> : null}
      </label>
    </div>
  );
}

export function SiblingsFormFields({
  hasSiblings,
  siblingsRawText,
  siblingsLevels,
  siblingLines,
  onChange,
}: {
  hasSiblings: boolean;
  siblingsRawText: string;
  siblingsLevels: string;
  siblingLines: SiblingLine[];
  onChange: (patch: {
    hasSiblings?: boolean;
    siblingsRawText?: string;
    siblingsLevels?: string;
    siblingLines?: SiblingLine[];
  }) => void;
}) {
  const t = useT();

  function updateLine(index: number, patch: Partial<SiblingLine>) {
    const next = siblingLines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange({ siblingLines: next });
  }

  function addLine() {
    onChange({ siblingLines: [...siblingLines, emptySiblingLine(siblingLines.length + 1)] });
  }

  function removeLine(index: number) {
    onChange({ siblingLines: siblingLines.filter((_, i) => i !== index) });
  }

  function handleHasSiblingsChange(checked: boolean) {
    if (!checked) {
      onChange({
        hasSiblings: false,
        siblingsRawText: '',
        siblingsLevels: '',
        siblingLines: [],
      });
      return;
    }
    onChange({
      hasSiblings: true,
      siblingLines,
    });
  }

  function addLinkedSibling(student: Student) {
    if (siblingLines.some((line) => line.linked_student_id === student.id)) return;
    onChange({
      siblingLines: [
        ...siblingLines,
        {
          ...emptySiblingLine(siblingLines.length + 1),
          name: getStudentDisplayName(student),
          is_current_student: true,
          linked_student_id: student.id,
        },
      ],
    });
  }

  function lineError(line: SiblingLine): string | undefined {
    if (line.is_current_student === true && (line.linked_student_id == null || line.linked_student_id <= 0)) {
      return t('admin.siblings.linkedStudentRequired');
    }
    return undefined;
  }

  return (
    <div className="siblings-form">
      <label className="student-create-form__checkbox siblings-form__toggle">
        <input
          type="checkbox"
          checked={hasSiblings}
          onChange={(e) => handleHasSiblingsChange(e.target.checked)}
        />
        <span className="student-create-form__checkbox-text">
          <span>{t('admin.siblings.hasSiblings')}</span>
          <span className="student-create-field__hint">{t('admin.siblings.hasSiblingsHint')}</span>
        </span>
      </label>

      {hasSiblings ? (
        <div className="siblings-form__details">
          <div className="siblings-form__toolbar">
            <p className="siblings-form__lead">{t('admin.siblings.linesEditorLead')}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addLine}>
              {t('admin.siblings.addLine')}
            </button>
          </div>

          <div className="siblings-form__search-existing">
            <span className="student-create-field__label">
              {t('admin.siblings.selectLinkedStudent')}
            </span>
            <SiblingStudentSearch
              value={null}
              onChange={(_studentId, student) => {
                if (student) addLinkedSibling(student);
              }}
            />
          </div>

          {siblingLines.length === 0 ? (
            <p className="student-create-form__notice" role="status">
              {t('admin.siblings.emptyLinesHint')}
            </p>
          ) : null}

          <div className="siblings-form__cards">
            {siblingLines.map((line, index) => {
              const linkedError = lineError(line);
              return (
                <article key={line.sequence ?? index} className="sibling-line-card">
                  <header className="sibling-line-card__header">
                    <h4 className="sibling-line-card__title">
                      {t('admin.siblings.cardTitle', { number: index + 1 })}
                    </h4>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm sibling-line-card__remove"
                      onClick={() => removeLine(index)}
                    >
                      {t('common.delete')}
                    </button>
                  </header>

                  <div className="sibling-line-card__grid">
                    <SiblingField label={t('admin.siblings.table.name')}>
                      <input
                        className="input"
                        value={line.name ?? ''}
                        onChange={(e) => updateLine(index, { name: e.target.value || null })}
                        dir="auto"
                        autoComplete="off"
                      />
                    </SiblingField>

                    <SiblingField label={t('admin.siblings.table.relationship')}>
                      <select
                        className="input"
                        value={line.relationship ?? ''}
                        onChange={(e) => updateLine(index, { relationship: e.target.value || null })}
                      >
                        <option value="">{t('common.dash')}</option>
                        <option value="brother">{t('admin.siblings.relationship.brother')}</option>
                        <option value="sister">{t('admin.siblings.relationship.sister')}</option>
                      </select>
                    </SiblingField>

                    <SiblingField label={t('admin.siblings.table.birthDate')}>
                      <input
                        className="input"
                        type="date"
                        value={line.birth_date ?? ''}
                        onChange={(e) => updateLine(index, { birth_date: e.target.value || null })}
                      />
                    </SiblingField>

                    <SiblingField label={t('admin.siblings.table.ageAtAdmission')}>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={25}
                        value={line.age_years_at_admission ?? ''}
                        onChange={(e) =>
                          updateLine(index, {
                            age_years_at_admission: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        dir="ltr"
                      />
                    </SiblingField>

                    <SiblingField label={t('admin.siblings.table.level')}>
                      <input
                        className="input"
                        value={line.level_text ?? ''}
                        onChange={(e) => updateLine(index, { level_text: e.target.value || null })}
                        dir="auto"
                      />
                    </SiblingField>

                    <SiblingField label={t('admin.siblings.table.currentStudent')}>
                      <label className="student-create-form__checkbox">
                        <input
                          type="checkbox"
                          checked={line.is_current_student === true}
                          onChange={(e) =>
                            updateLine(index, {
                              is_current_student: e.target.checked,
                              linked_student_id: e.target.checked ? line.linked_student_id : null,
                            })
                          }
                        />
                        <span className="student-create-field__hint">
                          {t('admin.siblings.currentStudentHint')}
                        </span>
                      </label>
                    </SiblingField>

                    {line.is_current_student === true ? (
                      <SiblingField
                        label={t('admin.siblings.selectLinkedStudent')}
                        error={linkedError}
                        wide
                      >
                        <SiblingStudentSearch
                          value={line.linked_student_id}
                          onChange={(studentId) =>
                            updateLine(index, { linked_student_id: studentId })
                          }
                        />
                      </SiblingField>
                    ) : null}

                    <SiblingField label={t('admin.siblings.table.notes')} wide>
                      <input
                        className="input"
                        value={line.notes ?? ''}
                        onChange={(e) => updateLine(index, { notes: e.target.value || null })}
                        dir="auto"
                      />
                    </SiblingField>
                  </div>
                </article>
              );
            })}
          </div>

          <details className="siblings-form__legacy">
            <summary className="siblings-form__legacy-summary">{t('admin.siblings.legacyFieldsToggle')}</summary>
            <div className="siblings-form__legacy-body">
              <SiblingField label={t('admin.siblings.rawText')} wide>
                <textarea
                  className="input"
                  rows={3}
                  value={siblingsRawText}
                  onChange={(e) => onChange({ siblingsRawText: e.target.value })}
                />
              </SiblingField>
              <SiblingField label={t('admin.siblings.legacyLevels')} wide>
                <textarea
                  className="input"
                  rows={2}
                  value={siblingsLevels}
                  onChange={(e) => onChange({ siblingsLevels: e.target.value })}
                />
              </SiblingField>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
