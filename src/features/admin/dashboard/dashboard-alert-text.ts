import type { Locale } from '@/lib/i18n/config';
import { normalizeLocalizedText } from '@/lib/i18n/normalize-localized-text';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';

function readNullableHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readAlertSeverity(value: unknown): AdminActionItem['tone'] {
  if (value === 'critical' || value === 'warning') return 'amber';
  return 'default';
}

function severityIcon(severity: unknown): string {
  if (severity === 'critical') return '🚨';
  if (severity === 'warning') return '⚠️';
  return 'ℹ️';
}

function fallbackLabelFromCode(code: string): string {
  return code.replace(/[_-]+/g, ' ').trim();
}

/** Extract display fields from legacy or executive dashboard alert payloads. */
export function parseDashboardAlertItem(
  raw: unknown,
  locale: Locale | string,
  index: number,
): AdminActionItem | null {
  if (typeof raw === 'string') {
    const label = normalizeLocalizedText(raw, locale);
    if (!label) return null;
    return {
      id: `alert-${index}`,
      label,
      icon: '⚠️',
      tone: 'amber',
    };
  }

  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const code =
    typeof record.code === 'string' && record.code.trim()
      ? record.code.trim()
      : `alert-${index}`;

  const label =
    normalizeLocalizedText(record.message, locale) ??
    normalizeLocalizedText(record.label, locale) ??
    normalizeLocalizedText(record.title, locale) ??
    (typeof record.message_key === 'string' && record.message_key.trim()
      ? fallbackLabelFromCode(record.message_key.trim())
      : null) ??
    fallbackLabelFromCode(code);

  if (!label) return null;

  return {
    id: code,
    label,
    href: readNullableHref(record.href),
    icon: severityIcon(record.severity),
    tone: readAlertSeverity(record.severity),
  };
}
