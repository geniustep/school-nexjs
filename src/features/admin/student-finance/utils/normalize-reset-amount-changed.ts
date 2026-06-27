function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export interface ResetAmountChangedLine {
  label: string;
  oldAmount: number | null;
  newAmount: number | null;
}

export interface ResetAmountChangedPresentation {
  oldAmount: number | null;
  newAmount: number | null;
  changedLines: ResetAmountChangedLine[];
  monthlyRecurringPreserved: boolean | null;
}

export function normalizeResetAmountChangedPresentation(
  raw: unknown,
): ResetAmountChangedPresentation | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const warning = readString(rec.warning);
  if (warning !== 'amount_changed' && warning != null && warning !== '') {
    return null;
  }

  const oldAmount = readFiniteNumber(rec.old_amount);
  const newAmount = readFiniteNumber(rec.new_amount);
  const changedLinesRaw = rec.changed_lines ?? rec.amount_changed_lines ?? rec.lines_changed;
  const changedLines: ResetAmountChangedLine[] = [];

  if (Array.isArray(changedLinesRaw)) {
    for (const entry of changedLinesRaw) {
      const line = asRecord(entry);
      if (!line) continue;
      const label =
        readString(line.label) ??
        readString(line.name) ??
        readString(line.fee_type_name) ??
        readString(line.service_name);
      if (!label) continue;
      changedLines.push({
        label,
        oldAmount: readFiniteNumber(line.old_amount) ?? readFiniteNumber(line.amount_before),
        newAmount: readFiniteNumber(line.new_amount) ?? readFiniteNumber(line.amount_after),
      });
    }
  }

  const monthlyRecurringPreserved =
    typeof rec.monthly_recurring_preserved === 'boolean'
      ? rec.monthly_recurring_preserved
      : typeof rec.recurring_monthly_preserved === 'boolean'
        ? rec.recurring_monthly_preserved
        : null;

  if (
    oldAmount == null &&
    newAmount == null &&
    changedLines.length === 0 &&
    monthlyRecurringPreserved == null
  ) {
    return warning === 'amount_changed' ? { oldAmount: null, newAmount: null, changedLines: [], monthlyRecurringPreserved: null } : null;
  }

  return { oldAmount, newAmount, changedLines, monthlyRecurringPreserved };
}

export function buildResetAmountChangedMessages(
  presentation: ResetAmountChangedPresentation,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  const base = 'admin.student360.financeWorkspace.agreementContext.reset.amountChangedDetails';
  const messages: string[] = [];

  if (presentation.oldAmount != null || presentation.newAmount != null) {
    messages.push(
      t(`${base}.summary`, {
        oldAmount: presentation.oldAmount ?? t('common.dash'),
        newAmount: presentation.newAmount ?? t('common.dash'),
      }),
    );
  }

  for (const line of presentation.changedLines) {
    messages.push(
      t(`${base}.lineChanged`, {
        label: line.label,
        oldAmount: line.oldAmount ?? t('common.dash'),
        newAmount: line.newAmount ?? t('common.dash'),
      }),
    );
  }

  if (presentation.monthlyRecurringPreserved === true) {
    messages.push(t(`${base}.monthlyRecurringPreservedYes`));
  } else if (presentation.monthlyRecurringPreserved === false) {
    messages.push(t(`${base}.monthlyRecurringPreservedNo`));
  }

  return messages.filter(Boolean);
}
