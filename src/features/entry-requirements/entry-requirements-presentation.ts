import type { RequirementItem } from './entry-requirements-contract';

export type RequirementCatalogGroups = {
  books: RequirementItem[];
  notebooks: RequirementItem[];
  tools: RequirementItem[];
};

export type NotebookPresentation = {
  pages: string | null;
  size: NotebookSize | null;
  cover: string | null;
  purpose: string | null;
  coverTone: 'blue' | 'pink' | 'yellow' | 'green' | 'red' | 'dark' | 'light' | 'neutral';
};

export type NotebookSize = 'large' | 'small';

export type RequirementCoverAllocation = {
  color: string;
  quantity: number;
};

export type AggregatedRequirementCover = RequirementCoverAllocation & {
  kind: 'book' | 'notebook';
  notebookSize: NotebookSize | null;
  label: string;
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

const COVER_LABELS = ['الأغلفة', 'اغلفة', 'أغلفة', 'الغلاف', 'غلاف', 'covers', 'cover', 'couvertures', 'couverture'];
const NOTEBOOK_SIZE_LABELS = ['حجم الدفتر', 'قياس الدفتر', 'notebook size', 'format du cahier'];

function parseCoverAllocationPart(value: string, fallbackQuantity: number): RequirementCoverAllocation | null {
  const normalized = normalizeDigits(value).trim();
  const match = normalized.match(/^(.+?)\s*(?:[×x*]\s*(\d+))?$/i);
  const color = match?.[1]?.trim();
  if (!color) return null;
  const quantity = match?.[2] ? Number(match[2]) : fallbackQuantity;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return null;
  return { color, quantity };
}

export function requirementCoverAllocations(item: RequirementItem): RequirementCoverAllocation[] {
  if (!['textbook', 'book', 'notebook'].includes(item.item_type)) return [];
  const value = explicitLabelValue(item.notes, COVER_LABELS);
  if (!value) return [];
  return value
    .split(/[،,]+/)
    .map((part) => parseCoverAllocationPart(part, item.quantity))
    .filter((allocation): allocation is RequirementCoverAllocation => allocation !== null);
}

export function requirementCoverColor(item: RequirementItem): string | null {
  const allocations = requirementCoverAllocations(item);
  return allocations.length === 1 ? allocations[0].color : allocations.map((row) => row.color).join('، ') || null;
}

export function withRequirementCoverAllocations(
  notes: string | null | undefined,
  allocations: RequirementCoverAllocation[],
): string | null {
  const lines = (notes ?? '')
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !COVER_LABELS.some((label) => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escaped}\\s*[:：-]`, 'i').test(line);
    }));
  const normalized = allocations
    .map((allocation) => ({ color: allocation.color.trim(), quantity: allocation.quantity }))
    .filter((allocation) => allocation.color && Number.isSafeInteger(allocation.quantity) && allocation.quantity > 0);
  if (normalized.length) {
    lines.push(`أغلفة: ${normalized.map((allocation) => `${allocation.color} ×${allocation.quantity}`).join('، ')}`);
  }
  return lines.length ? lines.join('\n') : null;
}

export function withRequirementCoverColor(notes: string | null | undefined, color: string | null): string | null {
  return withRequirementCoverAllocations(notes, color ? [{ color, quantity: 1 }] : []);
}

export function notebookSize(item: RequirementItem): NotebookSize | null {
  if (item.item_type !== 'notebook') return null;
  const explicit = explicitLabelValue(item.notes, NOTEBOOK_SIZE_LABELS);
  const source = explicit || [item.title, item.name, item.notes].filter(Boolean).join(' · ');
  if (/(?:كبير(?:ة)?|حجم\s*كبير|grand(?:e)?(?:\s+format)?|large)/i.test(source)) return 'large';
  if (/(?:صغير(?:ة)?|حجم\s*صغير|petit(?:e)?(?:\s+format)?|small)/i.test(source)) return 'small';
  return null;
}

export function notebookSizeLabel(size: NotebookSize | null): string {
  return size === 'large' ? 'كبير' : size === 'small' ? 'صغير' : 'غير محدد';
}

export function withNotebookSize(notes: string | null | undefined, size: NotebookSize | null): string | null {
  const lines = (notes ?? '')
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !NOTEBOOK_SIZE_LABELS.some((label) => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escaped}\\s*[:：-]`, 'i').test(line);
    }));
  if (size) lines.push(`حجم الدفتر: ${notebookSizeLabel(size)}`);
  return lines.length ? lines.join('\n') : null;
}

export function aggregateRequirementCovers(items: RequirementItem[]): AggregatedRequirementCover[] {
  const totals = new Map<string, AggregatedRequirementCover>();
  for (const item of items) {
    const kind = item.item_type === 'notebook' ? 'notebook' : 'book';
    const size = kind === 'notebook' ? notebookSize(item) : null;
    const label = kind === 'book' ? 'غلاف كتاب' : `غلاف دفتر ${notebookSizeLabel(size)}`;
    for (const allocation of requirementCoverAllocations(item)) {
      const key = `${kind}:${size ?? 'unspecified'}:${allocation.color.trim().toLocaleLowerCase('ar')}`;
      const current = totals.get(key);
      totals.set(key, {
        kind,
        notebookSize: size,
        label,
        color: current?.color ?? allocation.color.trim(),
        quantity: (current?.quantity ?? 0) + allocation.quantity,
      });
    }
  }
  const rank = (cover: AggregatedRequirementCover) => (
    cover.kind === 'book' ? 0 : cover.notebookSize === 'large' ? 1 : cover.notebookSize === 'small' ? 2 : 3
  );
  return [...totals.values()].sort((left, right) => (
    rank(left) - rank(right) || left.color.localeCompare(right.color, 'ar')
  ));
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
    size: notebookSize(item),
    cover,
    purpose,
    coverTone: notebookCoverTone(cover),
  };
}
