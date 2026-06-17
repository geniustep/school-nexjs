'use client';

import { parseDecimalInput } from '@/features/admin/finance/parse-decimal-input';

export function FinanceAmountInput({
  value,
  onChange,
  disabled,
  className = 'input input--sm finance-amount-input',
  id,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode="decimal"
      dir="ltr"
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(parseDecimalInput(e.target.value))}
    />
  );
}
