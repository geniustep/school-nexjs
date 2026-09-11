'use client';

import { useMemo } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import {
  getAmendmentReasonPresetOptions,
  resolveAmendmentReasonPresetLabel,
  type AmendmentReasonPresetKey,
} from './agreement-amendment-preview-model';

const COPY = {
  ar: {
    label: 'سبب التعديل',
    otherLabel: 'اكتب السبب',
    otherPlaceholder: 'مثال: تسوية استثنائية بعد مراجعة الملف…',
  },
  fr: {
    label: 'Motif de la modification',
    otherLabel: 'Précisez le motif',
    otherPlaceholder: 'Ex. régularisation exceptionnelle après révision du dossier…',
  },
  en: {
    label: 'Reason for change',
    otherLabel: 'Enter the reason',
    otherPlaceholder: 'Example: exceptional adjustment after reviewing the record…',
  },
  es: {
    label: 'Motivo del cambio',
    otherLabel: 'Escriba el motivo',
    otherPlaceholder: 'Ej.: ajuste excepcional tras revisar el expediente…',
  },
} as const;

export function AgreementAmendmentReasonSelector({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (reason: string) => void;
}) {
  const { locale } = useLocale();
  const localizedCopy = COPY[locale] ?? COPY.en;
  const options = useMemo(() => getAmendmentReasonPresetOptions(locale), [locale]);

  const preset = useMemo<AmendmentReasonPresetKey>(() => {
    const matched = options.find(
      (option) => option.key !== 'other' && option.label === value.trim(),
    );
    if (matched) return matched.key;
    return value.trim() ? 'other' : 'manager_decision';
  }, [options, value]);

  function selectPreset(nextPreset: AmendmentReasonPresetKey) {
    if (nextPreset === 'other') {
      onChange('');
      return;
    }
    onChange(resolveAmendmentReasonPresetLabel(locale, nextPreset));
  }

  return (
    <div className="student-finance-amendment-reason-selector">
      <label className="student-finance-amendment-reason-selector__control">
        <span>{localizedCopy.label}</span>
        <select
          className="input"
          value={preset}
          onChange={(event) => selectPreset(event.target.value as AmendmentReasonPresetKey)}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {preset === 'other' ? (
        <label className="student-finance-amendment-reason-selector__custom">
          <span className="tiny muted">{localizedCopy.otherLabel}</span>
          <textarea
            className="input"
            rows={2}
            value={value}
            placeholder={localizedCopy.otherPlaceholder}
            onChange={(event) => onChange(event.target.value)}
            required
            disabled={disabled}
          />
        </label>
      ) : null}
    </div>
  );
}
