import { parseIsoDate, toIsoDate } from './calendar-utils';

export const DATE_DISPLAY_MAX_LENGTH = 10;

export function extractDateDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 8);
}

export function constrainDateDigits(digits: string): string {
  const chars = digits.split('');
  const out: string[] = [];

  for (let i = 0; i < chars.length; i += 1) {
    const digitChar = chars[i];
    if (!/^\d$/.test(digitChar)) continue;
    const digit = Number(digitChar);
    const pos = out.length;

    if (pos >= 8) break;

    if (pos === 0) {
      if (digit > 3) continue;
      out.push(digitChar);
      continue;
    }
    if (pos === 1) {
      const dayTens = Number(out[0]);
      if (dayTens === 3 && digit > 1) continue;
      if (dayTens === 0 && digit === 0) continue;
      out.push(digitChar);
      continue;
    }
    if (pos === 2) {
      if (digit > 1) continue;
      out.push(digitChar);
      continue;
    }
    if (pos === 3) {
      const monthTens = Number(out[2]);
      if (monthTens === 1 && digit > 2) continue;
      if (monthTens === 0 && digit === 0) continue;
      out.push(digitChar);
      continue;
    }

    out.push(digitChar);
  }

  return out.join('');
}

export function formatDateDigits(digits: string): string {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) {
    return digits.length === 2 ? `${day}/` : day;
  }
  if (digits.length <= 4) {
    return digits.length === 4 ? `${day}/${month}/` : `${day}/${month}`;
  }
  return `${day}/${month}/${year}`;
}

export function applyDateMaskInput(raw: string): string {
  return formatDateDigits(constrainDateDigits(extractDateDigits(raw)));
}

export function caretToDigitIndex(caret: number, display: string): number {
  return display.slice(0, Math.max(0, caret)).replace(/\D/g, '').length;
}

export function digitIndexToCaret(digitIndex: number, formatted: string): number {
  if (digitIndex <= 0) return 0;

  let digits = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted[i] === '/') continue;
    digits += 1;
    if (digits >= digitIndex) return i + 1;
  }

  return formatted.length;
}

function resolveCaretAfterInput(previousDigitCount: number, nextDigitCount: number, formatted: string): number {
  if (previousDigitCount < 2 && nextDigitCount >= 2) return 3;
  if (previousDigitCount < 4 && nextDigitCount >= 4) return 6;
  return digitIndexToCaret(nextDigitCount, formatted);
}

export function applyDateDigitInput(
  display: string,
  selectionStart: number,
  selectionEnd: number,
  digit: string,
): { value: string; caret: number } | null {
  if (!/^\d$/.test(digit)) return null;

  const rangeStart = Math.min(selectionStart, selectionEnd);
  const rangeEnd = Math.max(selectionStart, selectionEnd);
  const startIdx = caretToDigitIndex(rangeStart, display);
  const endIdx = caretToDigitIndex(rangeEnd, display);

  let digits = extractDateDigits(display);
  digits = digits.slice(0, startIdx) + digits.slice(endIdx);
  const previousDigitCount = digits.length;

  if (startIdx === 0 && digits.length === 0 && Number(digit) >= 4) {
    const nextDigits = constrainDateDigits(`0${digit}`);
    const value = formatDateDigits(nextDigits);
    return { value, caret: 3 };
  }

  if (startIdx === 2 && digits.length === 2 && Number(digit) >= 2) {
    const nextDigits = constrainDateDigits(`${digits}0${digit}`);
    const value = formatDateDigits(nextDigits);
    return { value, caret: 6 };
  }

  const attempt =
    startIdx >= digits.length
      ? `${digits}${digit}`
      : `${digits.slice(0, startIdx)}${digit}${digits.slice(startIdx + 1)}`;
  const nextDigits = constrainDateDigits(attempt);

  if (nextDigits.length <= previousDigitCount && startIdx >= previousDigitCount) {
    return null;
  }

  const value = formatDateDigits(nextDigits);
  const caret = resolveCaretAfterInput(previousDigitCount, nextDigits.length, value);
  return { value, caret };
}

export function applyDateBackspaceInput(
  display: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; caret: number } {
  const rangeStart = Math.min(selectionStart, selectionEnd);
  const rangeEnd = Math.max(selectionStart, selectionEnd);

  if (rangeStart !== rangeEnd) {
    const startIdx = caretToDigitIndex(rangeStart, display);
    const endIdx = caretToDigitIndex(rangeEnd, display);
    const digits = extractDateDigits(display).slice(0, startIdx) + extractDateDigits(display).slice(endIdx);
    const value = formatDateDigits(digits);
    return { value, caret: digitIndexToCaret(startIdx, value) };
  }

  if (rangeStart > 0 && display[rangeStart - 1] === '/') {
    const digits = extractDateDigits(display);
    if (digits.length === 2 || digits.length === 4) {
      const partial = formatDateDigits(digits).slice(0, -1);
      return { value: partial, caret: partial.length };
    }
  }

  const deleteIdx = caretToDigitIndex(rangeStart, display) - 1;
  if (deleteIdx < 0) {
    return { value: display, caret: 0 };
  }

  const digits = extractDateDigits(display).slice(0, deleteIdx) + extractDateDigits(display).slice(deleteIdx + 1);
  const value = formatDateDigits(digits);
  return { value, caret: digitIndexToCaret(deleteIdx, value) };
}

export function displayDateToIso(display: string): string | null {
  const digits = extractDateDigits(display);
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const iso = toIsoDate(year, month, day);
  return parseIsoDate(iso) ? iso : null;
}

export function isoToMaskedDisplay(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return '';
  return formatDateDigits(
    `${String(parts.day).padStart(2, '0')}${String(parts.month).padStart(2, '0')}${parts.year}`,
  );
}

export function isDateMaskComplete(display: string): boolean {
  return extractDateDigits(display).length === 8;
}

export function isAllowedDateKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (
    event.key === 'Backspace' ||
    event.key === 'Delete' ||
    event.key === 'Tab' ||
    event.key === 'Enter' ||
    event.key === 'Escape' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight' ||
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    event.key === 'Home' ||
    event.key === 'End'
  ) {
    return true;
  }
  return /^\d$/.test(event.key);
}
