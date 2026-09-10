'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import {
  getAmendmentReasonPresetOptions,
  resolveAmendmentReasonPresetLabel,
  type AmendmentReasonPresetKey,
} from './agreement-amendment-preview-model';
import { useAgreementAmendmentAutoPreview } from './use-agreement-amendment-auto-preview';

const COPY = {
  ar: {
    legend: 'سبب التعديل',
    hint: 'اختر السبب الأقرب. يمكنك كتابة سبب مخصص عند اختيار «أخرى».',
    otherLabel: 'اكتب السبب',
    otherPlaceholder: 'مثال: تسوية استثنائية بعد مراجعة الملف…',
  },
  fr: {
    legend: 'Motif de la modification',
    hint: 'Choisissez le motif le plus proche. « Autre » permet de saisir un motif personnalisé.',
    otherLabel: 'Précisez le motif',
    otherPlaceholder: 'Ex. régularisation exceptionnelle après révision du dossier…',
  },
  en: {
    legend: 'Reason for change',
    hint: 'Choose the closest reason. Select “Other” to enter a custom reason.',
    otherLabel: 'Enter the reason',
    otherPlaceholder: 'Example: exceptional adjustment after reviewing the record…',
  },
  es: {
    legend: 'Motivo del cambio',
    hint: 'Elija el motivo más cercano. Seleccione «Otro» para escribir un motivo personalizado.',
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
  const [preset, setPreset] = useState<AmendmentReasonPresetKey>('manager_decision');
  const [customReason, setCustomReason] = useState('');
  const { rootRef, scheduleAutoPreview } = useAgreementAmendmentAutoPreview<HTMLFieldSetElement>();

  useEffect(() => {
    if (preset === 'other') return;
    const nextReason = resolveAmendmentReasonPresetLabel(locale, preset);
    if (value !== nextReason) onChange(nextReason);
  }, [locale, onChange, preset, value]);

  function selectPreset(nextPreset: AmendmentReasonPresetKey) {
    setPreset(nextPreset);
    if (nextPreset === 'other') {
      onChange(customReason.trim());
    } else {
      onChange(resolveAmendmentReasonPresetLabel(locale, nextPreset));
    }
    scheduleAutoPreview();
  }

  return (
    <fieldset ref={rootRef} className="student-finance-amendment-reason-selector">
      <legend>{localizedCopy.legend}</legend>
      <p className="tiny muted student-finance-amendment-reason-selector__hint">
        {localizedCopy.hint}
      </p>
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
              scheduleAutoPreview();
            }}
            required
            disabled={disabled}
          />
        </label>
      ) : null}
    </fieldset>
  );
}
