import { describe, expect, it } from 'vitest';
import { assignmentOperationalLabel } from './assignment-operational-state';

const base = { state: 'active', active: true, is_operationally_active: true };
describe('assignmentOperationalLabel', () => {
  it('operational', () => {
    expect(assignmentOperationalLabel(base, '2026-10-16')).toBe('إسناد سارٍ');
  });
  it('expired ICT', () => {
    expect(assignmentOperationalLabel({ ...base, is_operationally_active: false,
      effective_from: '2026-09-14', effective_to: '2026-09-17' }, '2026-10-16')).toBe('انتهت صلاحية الإسناد');
  });
  it('future assignment', () => {
    expect(assignmentOperationalLabel({ ...base, is_operationally_active: false,
      effective_from: '2026-11-01' }, '2026-10-16')).toBe('إسناد لم يبدأ بعد');
  });
  it('historical assignment', () => {
    expect(assignmentOperationalLabel({ ...base, state: 'ended', active: false }, '2026-10-16')).toBe('إسناد تاريخي منتهٍ');
  });
  it('unknown operational status', () => {
    expect(assignmentOperationalLabel({ state: 'active', active: true }, '2026-10-16')).toBe('السريان غير متحقق');
  });
});
