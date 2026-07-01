'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { todayIsoDate } from '@/features/admin/students/utils/student-profile';
import { useAnchoredPopoverPosition } from '@/hooks/use-anchored-popover-position';
import {
  buildMonthGrid,
  formatMonthLabel,
  isIsoInRange,
  localeWeekStartsOn,
  parseIsoDate,
  shiftIsoDate,
  startOfMonthIso,
  weekdayHeaders,
} from '@/lib/dates/calendar-utils';
import {
  applyDateMaskInput,
  applyDateBackspaceInput,
  applyDateDigitInput,
  DATE_DISPLAY_MAX_LENGTH,
  displayDateToIso,
  extractDateDigits,
  isAllowedDateKey,
  isoToMaskedDisplay,
} from '@/lib/dates/date-input-mask';
import { cn } from '@/lib/utils/cn';

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function DatePickerInput({
  value,
  onChange,
  disabled,
  min,
  max,
  presets = true,
  id: idProp,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  presets?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const fallbackId = useId();
  const inputId = idProp ?? fallbackId;
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const panelPosition = useAnchoredPopoverPosition(open, controlRef, panelRef);

  const today = useMemo(() => todayIsoDate(), []);
  const parsedValue = useMemo(() => parseIsoDate(value), [value]);
  const weekStartsOn = useMemo(() => localeWeekStartsOn(locale), [locale]);
  const weekdays = useMemo(() => weekdayHeaders(locale), [locale]);

  const initialView = parsedValue ?? parseIsoDate(today) ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: 1 };
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (pendingCaretRef.current == null || !inputRef.current) return;
    const caret = pendingCaretRef.current;
    pendingCaretRef.current = null;
    inputRef.current.setSelectionRange(caret, caret);
  }, [draft]);

  const updateDraft = useCallback((nextValue: string, caret?: number) => {
    setDraft(nextValue);
    setInvalid(false);
    if (caret != null) pendingCaretRef.current = caret;
  }, []);

  useEffect(() => {
    if (focused) return;
    setDraft(value ? isoToMaskedDisplay(value) : '');
    setInvalid(false);
  }, [focused, value]);

  useEffect(() => {
    if (!parsedValue) return;
    setViewYear(parsedValue.year);
    setViewMonth(parsedValue.month);
  }, [parsedValue?.year, parsedValue?.month, parsedValue]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const monthLabel = formatMonthLabel(viewYear, viewMonth, locale);
  const grid = buildMonthGrid({
    viewYear,
    viewMonth,
    selectedIso: value,
    todayIso: today,
    weekStartsOn,
    min,
    max,
  });

  function commitDraft(raw: string) {
    if (!extractDateDigits(raw)) {
      setInvalid(false);
      onChange('');
      setDraft('');
      return;
    }

    const parsed = displayDateToIso(raw);
    if (parsed === null) {
      setInvalid(true);
      setDraft(value ? isoToMaskedDisplay(value) : applyDateMaskInput(raw));
      return;
    }
    if (!isIsoInRange(parsed, min, max)) {
      setInvalid(true);
      setDraft(value ? isoToMaskedDisplay(value) : applyDateMaskInput(raw));
      return;
    }
    setInvalid(false);
    onChange(parsed);
    setDraft(isoToMaskedDisplay(parsed));
  }

  function selectDate(iso: string) {
    if (!isIsoInRange(iso, min, max)) return;
    onChange(iso);
    setDraft(isoToMaskedDisplay(iso));
    setInvalid(false);
    close();
    inputRef.current?.focus();
  }

  function goToPreviousMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
      return;
    }
    setViewMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
      return;
    }
    setViewMonth((m) => m + 1);
  }

  const presetItems = useMemo(() => {
    const base = value || today;
    const items = [
      { key: 'today', label: t('common.datePicker.today'), iso: today },
      { key: 'yesterday', label: t('common.datePicker.yesterday'), iso: shiftIsoDate(today, -1) },
      { key: 'startOfMonth', label: t('common.datePicker.startOfMonth'), iso: startOfMonthIso(base) },
    ];
    return items.filter((item): item is typeof item & { iso: string } => Boolean(item.iso && isIsoInRange(item.iso, min, max)));
  }, [max, min, t, today, value]);

  const emptyLabel = placeholder ?? t('common.datePicker.placeholder');

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        className={cn(
          'date-picker__panel',
          panelPosition?.placement === 'top' && 'date-picker__panel--above',
        )}
        role="dialog"
        aria-labelledby={inputId}
        style={
          panelPosition
            ? {
                top: panelPosition.top,
                left: panelPosition.left,
                width: panelPosition.width,
              }
            : { top: -9999, left: -9999, visibility: 'hidden' }
        }
      >
        {presets && presetItems.length > 0 ? (
          <div className="date-picker__presets">
            {presetItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={cn('date-picker__preset', value === item.iso && 'date-picker__preset--active')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectDate(item.iso)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="date-picker__header">
          <button type="button" className="date-picker__nav" onClick={goToPreviousMonth} aria-label={t('common.previous')}>
            ‹
          </button>
          <span className="date-picker__month">{monthLabel}</span>
          <button type="button" className="date-picker__nav" onClick={goToNextMonth} aria-label={t('common.next')}>
            ›
          </button>
        </div>

        <div className="date-picker__weekdays" aria-hidden="true">
          {weekdays.map((label) => (
            <span key={label} className="date-picker__weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="date-picker__grid">
          {grid.map((cell, index) =>
            cell.type === 'empty' ? (
              <span key={`empty-${index}`} className="date-picker__cell date-picker__cell--empty" />
            ) : (
              <button
                key={cell.iso}
                type="button"
                className={cn(
                  'date-picker__cell',
                  cell.isSelected && 'date-picker__cell--selected',
                  cell.isToday && 'date-picker__cell--today',
                  cell.isDisabled && 'date-picker__cell--disabled',
                )}
                disabled={cell.isDisabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectDate(cell.iso)}
                aria-label={formatDate(cell.iso)}
                aria-pressed={cell.isSelected}
              >
                {cell.day}
              </button>
            ),
          )}
        </div>

        <div className="date-picker__footer">
          <button
            type="button"
            className="date-picker__footer-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              setDraft('');
              setInvalid(false);
              close();
            }}
          >
            {t('common.clear')}
          </button>
          <button
            type="button"
            className="date-picker__footer-btn date-picker__footer-btn--primary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectDate(today)}
            disabled={!isIsoInRange(today, min, max)}
          >
            {t('common.datePicker.today')}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn('date-picker', className)}>
      <div ref={controlRef} className="date-picker__control">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={cn('input date-picker__input', invalid && 'date-picker__input--invalid')}
          value={draft}
          onChange={(event) => {
            updateDraft(applyDateMaskInput(event.target.value));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitDraft(draft);
          }}
          onKeyDown={(event) => {
            const input = inputRef.current;
            if (!input) return;

            if (/^\d$/.test(event.key)) {
              event.preventDefault();
              const result = applyDateDigitInput(
                draft,
                input.selectionStart ?? 0,
                input.selectionEnd ?? 0,
                event.key,
              );
              if (result) updateDraft(result.value, result.caret);
              return;
            }

            if (event.key === 'Backspace') {
              event.preventDefault();
              const result = applyDateBackspaceInput(draft, input.selectionStart ?? 0, input.selectionEnd ?? 0);
              updateDraft(result.value, result.caret);
              return;
            }

            if (!isAllowedDateKey(event)) {
              event.preventDefault();
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              commitDraft(draft);
              inputRef.current?.blur();
            }
            if (event.key === 'ArrowDown' && !open) {
              event.preventDefault();
              setOpen(true);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData('text');
            const masked = applyDateMaskInput(pasted);
            updateDraft(masked, masked.length);
          }}
          placeholder={emptyLabel}
          disabled={disabled}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={DATE_DISPLAY_MAX_LENGTH}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${inputId}-error` : undefined}
        />

        <button
          type="button"
          className="date-picker__toggle"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          disabled={disabled}
          aria-label={t('common.datePicker.openCalendar')}
          aria-haspopup="dialog"
          aria-expanded={open}
          tabIndex={-1}
        >
          <CalendarIcon />
        </button>
      </div>

      {invalid ? (
        <span id={`${inputId}-error`} className="date-picker__error tiny">
          {t('common.datePicker.invalidDate')}
        </span>
      ) : null}

      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
}
