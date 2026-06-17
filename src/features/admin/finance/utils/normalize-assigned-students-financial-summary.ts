import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  AssignedStudentFinancialSummary,
  AssignedStudentsFinancialSummaryResponse,
  StudentFinancialOverviewNextInstallment,
} from '@/types/student-financial-overview';
import { normalizeNextInstallment } from '@/features/admin/student-finance/utils/normalize-student-financial-overview';

function readMoney(value: unknown): number {
  return normalizeMoneyValue(value) ?? 0;
}

function normalizeStudent(raw: unknown): AssignedStudentFinancialSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const studentId =
    typeof obj.student_id === 'number'
      ? obj.student_id
      : typeof obj.id === 'number'
        ? obj.id
        : null;
  if (studentId == null) return null;

  const levelRaw = obj.level;
  const classRaw = obj.class;
  let level: AssignedStudentFinancialSummary['level'] = null;
  let classInfo: AssignedStudentFinancialSummary['class'] = null;
  if (levelRaw && typeof levelRaw === 'object' && typeof (levelRaw as { id?: unknown }).id === 'number') {
    const l = levelRaw as { id: number; name?: string };
    level = { id: l.id, name: typeof l.name === 'string' ? l.name : String(l.id) };
  }
  if (classRaw && typeof classRaw === 'object' && typeof (classRaw as { id?: unknown }).id === 'number') {
    const c = classRaw as { id: number; name?: string };
    classInfo = { id: c.id, name: typeof c.name === 'string' ? c.name : String(c.id) };
  }

  return {
    student_id: studentId,
    student_name:
      typeof obj.student_name === 'string'
        ? obj.student_name
        : typeof obj.name === 'string'
          ? obj.name
          : `#${studentId}`,
    registration_number:
      typeof obj.registration_number === 'string' ? obj.registration_number : null,
    level,
    class: classInfo,
    assigned_date: typeof obj.assigned_date === 'string' ? obj.assigned_date : null,
    total_fees: readMoney(obj.total_fees ?? obj.annual_total),
    due_to_date: readMoney(obj.due_to_date),
    paid: readMoney(obj.paid),
    remaining: readMoney(obj.remaining),
    overdue: readMoney(obj.overdue),
    next_installment: normalizeNextInstallment(obj.next_installment),
  };
}

export function normalizeAssignedStudentsFinancialSummary(
  data: unknown,
): AssignedStudentsFinancialSummaryResponse | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const studentsRaw = Array.isArray(raw.students) ? raw.students : Array.isArray(raw.items) ? raw.items : [];
  const students = studentsRaw
    .map(normalizeStudent)
    .filter((s): s is AssignedStudentFinancialSummary => s != null);

  const paginationRaw = raw.pagination;
  let pagination = { page: 1, page_size: students.length, total: students.length };
  if (paginationRaw && typeof paginationRaw === 'object') {
    const p = paginationRaw as Record<string, unknown>;
    pagination = {
      page: typeof p.page === 'number' ? p.page : 1,
      page_size: typeof p.page_size === 'number' ? p.page_size : students.length,
      total: typeof p.total === 'number' ? p.total : students.length,
    };
  }

  return { students, pagination };
}
