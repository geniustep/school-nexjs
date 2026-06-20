'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionState } from '@/types/admission';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import { ACTIVE_KANBAN_STATES, ALL_KANBAN_STATES, CLOSED_KANBAN_STATES } from '../utils/admission-labels';

export function AdmissionStateSelect({
  admissionId,
  value,
  onChanged,
  includeClosedStates = false,
  className,
  disabled,
}: {
  admissionId: number;
  value: string;
  onChanged?: () => void;
  includeClosedStates?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const { changeState, isPending } = useAdmissionStateChange(onChanged);
  const [current, setCurrent] = useState(value);
  const saving = isPending(admissionId);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  const options = useMemo(() => {
    if (includeClosedStates) return ALL_KANBAN_STATES;
    const closed = CLOSED_KANBAN_STATES.includes(value as AdmissionState)
      ? [value as AdmissionState]
      : [];
    return [...ACTIVE_KANBAN_STATES, ...closed.filter((s) => !ACTIVE_KANBAN_STATES.includes(s))];
  }, [includeClosedStates, value]);

  async function handleChange(next: string) {
    if (next === current || saving || disabled) return;
    const previous = current;
    setCurrent(next);
    const ok = await changeState(admissionId, next);
    if (!ok) setCurrent(previous);
  }

  return (
    <select
      className={cn('input admission-state-select', className)}
      value={current}
      disabled={disabled || saving}
      aria-label={t('admin.admissions.stateChange.label')}
      onChange={(e) => void handleChange(e.target.value)}
    >
      {options.map((state) => (
        <option key={state} value={state}>
          {t(`admin.admissions.states.${state}`)}
        </option>
      ))}
    </select>
  );
}
