'use client';

import { useT } from '@/features/i18n/locale-context';
import type { SiblingLine } from '@/types/sibling-line';
import { emptySiblingLine } from '../utils/sibling-lines';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
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

  return (
    <div className="col" style={{ gap: 12 }}>
      <Field label={t('admin.siblings.hasSiblings')}>
        <label className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={hasSiblings}
            onChange={(e) => onChange({ hasSiblings: e.target.checked })}
          />
          <span className="tiny">{t('admin.siblings.hasSiblingsHint')}</span>
        </label>
      </Field>
      <Field label={t('admin.siblings.rawText')}>
        <textarea
          className="input"
          rows={3}
          value={siblingsRawText}
          onChange={(e) => onChange({ siblingsRawText: e.target.value })}
        />
      </Field>
      <Field label={t('admin.siblings.legacyLevels')}>
        <textarea
          className="input"
          rows={2}
          value={siblingsLevels}
          onChange={(e) => onChange({ siblingsLevels: e.target.value })}
        />
      </Field>
      {hasSiblings ? (
        <div className="col" style={{ gap: 8 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="tiny muted">{t('admin.siblings.linesEditor')}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addLine}>
              {t('admin.siblings.addLine')}
            </button>
          </div>
          {siblingLines.map((line, index) => (
            <div key={index} className="card sibling-line-editor">
              <div className="admissions-create-grid">
                <Field label={t('admin.siblings.table.relationship')}>
                  <select
                    className="input"
                    value={line.relationship ?? ''}
                    onChange={(e) => updateLine(index, { relationship: e.target.value || null })}
                  >
                    <option value="">{t('common.dash')}</option>
                    <option value="brother">{t('admin.siblings.relationship.brother')}</option>
                    <option value="sister">{t('admin.siblings.relationship.sister')}</option>
                  </select>
                </Field>
                <Field label={t('admin.siblings.table.ageAtAdmission')}>
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
                </Field>
                <Field label={t('admin.siblings.table.level')}>
                  <input
                    className="input"
                    value={line.level_text ?? ''}
                    onChange={(e) => updateLine(index, { level_text: e.target.value || null })}
                  />
                </Field>
                <Field label={t('admin.siblings.table.currentStudent')}>
                  <label className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={line.is_current_student === true}
                      onChange={(e) => updateLine(index, { is_current_student: e.target.checked })}
                    />
                    <span className="tiny">{t('admin.siblings.currentStudentHint')}</span>
                  </label>
                </Field>
                <div className="field admissions-create-grid__wide">
                  <Field label={t('admin.siblings.table.notes')}>
                    <input
                      className="input"
                      value={line.notes ?? ''}
                      onChange={(e) => updateLine(index, { notes: e.target.value || null })}
                    />
                  </Field>
                </div>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeLine(index)}>
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
