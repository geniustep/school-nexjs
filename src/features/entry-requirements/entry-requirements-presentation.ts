import type { RequirementItem } from './entry-requirements-contract';

export type RequirementCatalogGroups = {
  books: RequirementItem[];
  notebooks: RequirementItem[];
  tools: RequirementItem[];
};

export type NotebookPresentation = {
  pages: string | null;
  cover: string | null;
  purpose: string | null;
  coverTone: 'blue' | 'pink' | 'yellow' | 'green' | 'red' | 'dark' | 'light' | 'neutral';
};

function ordered(items: RequirementItem[]): RequirementItem[] {
  return [...items].sort((left, right) => {
    const bySequence = (left.sequence ?? 0) - (right.sequence ?? 0);
    return bySequence || left.id - right.id;
  });
}

export function groupRequirementItems(items: RequirementItem[]): RequirementCatalogGroups {
  const rows = ordered(items);
  return {
    books: rows.filter((item) => item.item_type === 'textbook' || item.item_type === 'book'),
    notebooks: rows.filter((item) => item.item_type === 'notebook'),
    tools: rows.filter((item) => !['textbook', 'book', 'notebook'].includes(item.item_type)),
  };
}

function normalizeDigits(value: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicIndic.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    const easternIndex = easternArabicIndic.indexOf(digit);
    return easternIndex >= 0 ? String(easternIndex) : digit;
  });
}

function explicitLabelValue(notes: string | null | undefined, labels: string[]): string | null {
  if (!notes) return null;
  const lines = notes
    .split(/[\n\r;]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = line.match(new RegExp(`^${escaped}\\s*[:：-]\\s*(.+)$`, 'i'));
      if (match?.[1]?.trim()) return match[1].trim();
    }
  }
  return null;
}

const COVER_LABELS = ['الغلاف', 'غلاف', 'cover', 'couverture'];

export function requirementCoverColor(item: RequirementItem): string | null {
  if (!['textbook', 'book', 'notebook'].includes(item.item_type)) return null;
  return explicitLabelValue(item.notes, COVER_LABELS);
}

export function withRequirementCoverColor(notes: string | null | undefined, color: string | null): string | null {
  const lines = (notes ?? '')
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !COVER_LABELS.some((label) => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escaped}\\s*[:：-]`, 'i').test(line);
    }));
  const normalized = color?.trim();
  if (normalized) lines.push(`غلاف: ${normalized}`);
  return lines.length ? lines.join('\n') : null;
}

export function aggregateRequirementCovers(items: RequirementItem[]): Array<{ color: string; quantity: number }> {
  const totals = new Map<string, { color: string; quantity: number }>();
  for (const item of items) {
    const color = requirementCoverColor(item);
    if (!color || !Number.isFinite(item.quantity) || item.quantity <= 0) continue;
    const key = color.trim().toLocaleLowerCase('ar');
    const current = totals.get(key);
    totals.set(key, {
      color: current?.color ?? color.trim(),
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }
  return [...totals.values()].sort((left, right) => left.color.localeCompare(right.color, 'ar'));
}

export function notebookPageCount(item: RequirementItem): string | null {
  const source = normalizeDigits([item.title, item.name, item.notes].filter(Boolean).join(' · '));
  const match = source.match(/\b(\d{1,4})\s*(?:صفحة|صفحات|pages?|p\.?)/i);
  return match?.[1] ?? null;
}

export function notebookCoverTone(cover: string | null): NotebookPresentation['coverTone'] {
  if (!cover) return 'neutral';
  const value = cover.trim().toLowerCase();
  if (/(أزرق|ازرق|blue|bleu)/i.test(value)) return 'blue';
  if (/(وردي|زهري|pink|rose)/i.test(value)) return 'pink';
  if (/(أصفر|اصفر|yellow|jaune)/i.test(value)) return 'yellow';
  if (/(أخضر|اخضر|green|vert)/i.test(value)) return 'green';
  if (/(أحمر|احمر|red|rouge)/i.test(value)) return 'red';
  if (/(أسود|اسود|black|noir)/i.test(value)) return 'dark';
  if (/(أبيض|ابيض|white|blanc)/i.test(value)) return 'light';
  return 'neutral';
}

export function notebookPresentation(item: RequirementItem): NotebookPresentation {
  const cover = requirementCoverColor(item);
  const purpose = explicitLabelValue(item.notes, ['الغرض', 'purpose', 'usage']);
  return {
    pages: notebookPageCount(item),
    cover,
    purpose,
    coverTone: notebookCoverTone(cover),
  };
}
