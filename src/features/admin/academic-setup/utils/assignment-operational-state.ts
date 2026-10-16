import type { TeachingAssignment } from '@/types/academic-setup';

/** Browser-local date is for display only. Backend remains authoritative. */
function todayLocalISO(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
}

export function assignmentOperationalLabel(
  assignment: Pick<TeachingAssignment,
    'state' | 'active' | 'is_operationally_active' | 'effective_from' | 'effective_to'>,
  today = todayLocalISO(),
): string {
  if (assignment.state === 'ended' || assignment.state === 'cancelled' || assignment.state === 'archived') return 'إسناد تاريخي منتهٍ';
  if (assignment.state === 'suspended') return 'إسناد معلّق';
  if (!assignment.active) return 'إسناد غير نشط';
  if (assignment.is_operationally_active === true) return 'إسناد سارٍ';
  if (assignment.effective_to && assignment.effective_to < today) return 'انتهت صلاحية الإسناد';
  if (assignment.effective_from && assignment.effective_from > today) return 'إسناد لم يبدأ بعد';
  if (assignment.is_operationally_active === false) return 'غير متاح للجدولة';
  return 'السريان غير متحقق';
}
