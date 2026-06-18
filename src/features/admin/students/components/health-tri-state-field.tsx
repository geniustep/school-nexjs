'use client';

import { useT } from '@/features/i18n/locale-context';
import type { HealthTriState } from '../utils/student-health-profile';

export function HealthTriStateField({
  question,
  value,
  description,
  descriptionLabel,
  descriptionError,
  onChange,
  onDescriptionChange,
}: {
  question: string;
  value: HealthTriState;
  description: string;
  descriptionLabel: string;
  descriptionError?: string;
  onChange: (next: HealthTriState) => void;
  onDescriptionChange: (next: string) => void;
}) {
  const t = useT();

  return (
    <fieldset className="health-tri-state-field">
      <legend className="health-tri-state-field__question">{question}</legend>
      <div className="health-tri-state-field__choices" role="radiogroup" aria-label={question}>
        <label className="health-tri-state-field__choice">
          <input
            type="radio"
            name={question}
            checked={value === true}
            onChange={() => onChange(true)}
          />
          <span>{t('common.yes')}</span>
        </label>
        <label className="health-tri-state-field__choice">
          <input
            type="radio"
            name={question}
            checked={value === false}
            onChange={() => onChange(false)}
          />
          <span>{t('common.no')}</span>
        </label>
        <label className="health-tri-state-field__choice">
          <input
            type="radio"
            name={question}
            checked={value === null}
            onChange={() => onChange(null)}
          />
          <span>{t('admin.student360.health.unspecified')}</span>
        </label>
      </div>

      {value === true ? (
        <label className="form-field health-tri-state-field__description">
          <span>{descriptionLabel}</span>
          <textarea
            className="textarea"
            rows={2}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            dir="auto"
            required
          />
          {descriptionError ? (
            <span className="field-error" role="alert">
              {descriptionError}
            </span>
          ) : (
            <span className="health-tri-state-field__hint">{t('admin.student360.health.descriptionRequiredWhenYes')}</span>
          )}
        </label>
      ) : null}
    </fieldset>
  );
}
