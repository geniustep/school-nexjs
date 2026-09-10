'use client';

import { useMemo, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import {
  getAmendmentReasonPresetOptions,
  resolveAmendmentReasonPresetLabel,
  type AmendmentReasonPresetKey,
} from './agreement-amendment-preview-model';

const COPY = {
  ar: {
    legend: 'سبب التعديل',
    otherLabel: 'اكتب السبب',
    otherPlaceholder: 'مثال: تسوية استثنائية بعد مراجعة الملف…',
  },
  fr: {
    legend: 'Motif de la modification',
    otherLabel: 'Précisez le motif',
    otherPlaceholder: 'Ex. régularisation exceptionnelle après révision du dossier…',
  },
  en: {
    legend: 'Reason for change',
    otherLabel: 'Enter the reason',
    otherPlaceholder: 'Example: exceptional adjustment after reviewing the record…',
  },
  es: {
    legend: 'Motivo del cambio',
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
  const [preset, setPreset] = useState<AmendmentReasonPresetKey | null>(null);
  const [customReason, setCustomReason] = useState('');

  function selectPreset(nextPreset: AmendmentReasonPresetKey) {
    setPreset(nextPreset);
    if (nextPreset === 'other') {
      onChange(customReason.trim());
      return;
    }
    onChange(resolveAmendmentReasonPresetLabel(locale, nextPreset));
  }

  return (
    <fieldset className="student-finance-amendment-reason-selector">
      <legend>{localizedCopy.legend}</legend>
      <div className="student-finance-amendment-reason-selector__options">
        {options.map((option) => (
          <label
            key={option.key}
            className="student-finance-amendment-reason-selector__option"
          >
            <input
              type="radio"
              name="agreementAmendmentReasonPreset"
              value={option.key}
              checked={preset === option.key}
              onChange={() => selectPreset(option.key)}
              disabled={disabled}
              required
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {preset === 'other' ? (
        <label className="student-finance-amendment-reason-selector__custom">
          <span className="tiny muted">{localizedCopy.otherLabel}</span>
          <textarea
            className="input"
            rows={2}
            value={customReason}
            placeholder={localizedCopy.otherPlaceholder}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCustomReason(nextValue);
              onChange(nextValue.trim());
            }}
            required
            disabled={disabled}
          />
        </label>
      ) : null}

      <input type="hidden" value={value} readOnly />
    </fieldset>
  );
}
