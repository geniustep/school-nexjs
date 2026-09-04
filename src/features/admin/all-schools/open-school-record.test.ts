import { describe, expect, it, vi } from 'vitest';
import { switchSchoolThenOpen } from './open-school-record';

describe('switchSchoolThenOpen', () => {
  it('opens directly when the record is already in the active school', async () => {
    const switchSchool = vi.fn(async () => true);
    const navigate = vi.fn();

    await expect(
      switchSchoolThenOpen({ schoolId: 7, activeSchoolId: 7, switchSchool, navigate }),
    ).resolves.toBe('opened');
    expect(switchSchool).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('switches school before opening a cross-school record', async () => {
    const order: string[] = [];
    const switchSchool = vi.fn(async () => {
      order.push('switch');
      return true;
    });
    const navigate = vi.fn(() => order.push('navigate'));

    await expect(
      switchSchoolThenOpen({ schoolId: 8, activeSchoolId: 7, switchSchool, navigate }),
    ).resolves.toBe('opened');
    expect(order).toEqual(['switch', 'navigate']);
  });

  it('does not navigate when school switching fails', async () => {
    const switchSchool = vi.fn(async () => false);
    const navigate = vi.fn();

    await expect(
      switchSchoolThenOpen({ schoolId: 8, activeSchoolId: 7, switchSchool, navigate }),
    ).resolves.toBe('switch_failed');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the row has no valid school', async () => {
    const switchSchool = vi.fn(async () => true);
    const navigate = vi.fn();

    await expect(
      switchSchoolThenOpen({ schoolId: null, activeSchoolId: 7, switchSchool, navigate }),
    ).resolves.toBe('invalid_school');
    expect(switchSchool).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
