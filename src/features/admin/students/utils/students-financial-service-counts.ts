import type { ListParams } from '@/types/api';
import type { StudentsListFilterValues } from './students-list-url';

/** One service row from GET /admin/students/financial-service-counts. */
export type StudentsFinancialServiceCountItem = {
  service_id: number;
  name: string;
  code: string | null;
  active: boolean;
  sequence: number;
  student_count: number;
};

export type StudentsFinancialServiceCountsData = {
  items: StudentsFinancialServiceCountItem[];
};

export type StudentsFinancialServiceCountsMeta = {
  total_services?: number;
  total_students?: number;
  applied_filters?: Record<string, unknown>;
};

/**
 * Maps list URL filters to counts-endpoint params.
 * Only supported fields — no search, service_id, or account filters.
 * List uses `status`; counts API uses `state`.
 */
export function buildStudentsFinancialServiceCountsParams(
  filters: Pick<StudentsListFilterValues, 'statusFilter' | 'levelId' | 'classId'>,
): ListParams {
  return {
    state: filters.statusFilter || undefined,
    level_id: filters.levelId || undefined,
    class_id: filters.classId || undefined,
  };
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Tolerant normalize of one counts item. */
export function normalizeFinancialServiceCountItem(
  raw: unknown,
): StudentsFinancialServiceCountItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const serviceId = readFiniteNumber(o.service_id);
  if (serviceId == null) return null;
  const name = readString(o.name) ?? '';
  const count = readFiniteNumber(o.student_count) ?? 0;
  const sequence = readFiniteNumber(o.sequence) ?? Number.MAX_SAFE_INTEGER;
  return {
    service_id: serviceId,
    name,
    code: readString(o.code),
    active: o.active !== false,
    sequence,
    student_count: Math.max(0, Math.trunc(count)),
  };
}

export function normalizeFinancialServiceCountsData(
  raw: unknown,
): StudentsFinancialServiceCountsData {
  if (!raw || typeof raw !== 'object') return { items: [] };
  const o = raw as Record<string, unknown>;
  const list = Array.isArray(o.items) ? o.items : [];
  /** Preserve Backend order — no name/code/count filtering in Next.js. */
  const items = list
    .map(normalizeFinancialServiceCountItem)
    .filter((item): item is StudentsFinancialServiceCountItem => item != null);
  return { items };
}

export function readTotalStudentsFromMeta(meta: unknown): number {
  if (!meta || typeof meta !== 'object') return 0;
  const total = readFiniteNumber((meta as Record<string, unknown>).total_students);
  return total != null && total >= 0 ? Math.trunc(total) : 0;
}

/** Compact grid shows this many service cards before expand (canonical set is ~10). */
export const STUDENTS_SERVICE_COUNTS_INITIAL_VISIBLE = 10;

export function sliceVisibleServiceCounts(
  items: StudentsFinancialServiceCountItem[],
  expanded: boolean,
  initialVisible = STUDENTS_SERVICE_COUNTS_INITIAL_VISIBLE,
): StudentsFinancialServiceCountItem[] {
  if (expanded || items.length <= initialVisible) return items;
  return items.slice(0, initialVisible);
}
