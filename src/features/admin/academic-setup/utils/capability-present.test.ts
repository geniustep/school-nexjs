import { describe, expect, it } from 'vitest';
import {
  areCapabilityIdsDirty,
  buildStaffCapabilityPayload,
  getStaffCapabilityUxMode,
  groupCapabilitiesByCategory,
  normalizeCapabilityCatalog,
  resolveCapabilityCategoryLabel,
  resolveCapabilityLabel,
  sortCategoryCodes,
} from './capability-present';
import type { StaffCapabilityOption } from '@/types/academic-setup';

const t = (key: string) => {
  const map: Record<string, string> = {
    'admin.academicSetup.capCategory.dashboard': 'لوحة التحكم',
    'admin.academicSetup.capCategory.finance': 'المالية',
    'admin.academicSetup.capCategory.unknown_cat': '__missing__',
  };
  return map[key] ?? key;
};

function cap(partial: Partial<StaffCapabilityOption> & Pick<StaffCapabilityOption, 'id' | 'code'>): StaffCapabilityOption {
  return {
    category: 'other',
    label: partial.label ?? partial.code,
    grantable: true,
    ...partial,
  };
}

describe('normalizeCapabilityCatalog', () => {
  it('dedupes by id then code', () => {
    const items = [
      cap({ id: 1, code: 'view_students', category: 'students' }),
      cap({ id: 1, code: 'view_students_dup', category: 'students' }),
      cap({ id: 2, code: 'view_students', category: 'students' }),
      cap({ id: 3, code: 'manage_students', category: 'students' }),
    ];
    const normalized = normalizeCapabilityCatalog(items);
    expect(normalized).toHaveLength(2);
    expect(normalized.map((c) => c.id)).toEqual([1, 3]);
  });
});

describe('resolveCapabilityLabel', () => {
  it('uses nested finance translation by code', () => {
    const label = resolveCapabilityLabel('ar', cap({ id: 1, code: 'finance.view_payments', label: 'View Payments' }));
    expect(label).toBe('عرض الأداءات');
  });

  it('never returns raw translation key', () => {
    const label = resolveCapabilityLabel('ar', cap({ id: 1, code: 'unknown.permission', label: 'View Payments' }));
    expect(label).not.toContain('admin.academicSetup');
    expect(label).not.toBe('View Payments');
  });

  it('aliases manage_payments to finance.collect_payments', () => {
    const label = resolveCapabilityLabel('ar', cap({ id: 1, code: 'manage_payments', label: 'Manage Payments' }));
    expect(label).toBe('تحصيل الأداءات');
  });
});

describe('resolveCapabilityCategoryLabel', () => {
  it('returns translated category label', () => {
    expect(resolveCapabilityCategoryLabel('dashboard', t, 'ar')).toBe('لوحة التحكم');
  });

  it('falls back to formatted code instead of raw key', () => {
    const label = resolveCapabilityCategoryLabel('operations', t, 'ar');
    expect(label).not.toContain('admin.academicSetup');
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('groupCapabilitiesByCategory', () => {
  it('sorts categories in stable order', () => {
    const groups = groupCapabilitiesByCategory([
      cap({ id: 1, code: 'a', category: 'finance' }),
      cap({ id: 2, code: 'b', category: 'dashboard' }),
      cap({ id: 3, code: 'c', category: 'students' }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(['dashboard', 'students', 'finance']);
  });
});

describe('sortCategoryCodes', () => {
  it('places unknown categories after known ones', () => {
    expect(sortCategoryCodes(['finance', 'zzz', 'dashboard'])).toEqual(['dashboard', 'finance', 'zzz']);
  });
});

describe('getStaffCapabilityUxMode', () => {
  it('maps roles to UX modes', () => {
    expect(getStaffCapabilityUxMode('school_manager')).toBe('role_summary');
    expect(getStaffCapabilityUxMode('project_manager')).toBe('role_summary');
    expect(getStaffCapabilityUxMode('general_supervisor')).toBe('supervisor');
    expect(getStaffCapabilityUxMode('admin_staff')).toBe('full_editor');
  });
});

describe('areCapabilityIdsDirty', () => {
  it('detects id set changes regardless of order', () => {
    expect(areCapabilityIdsDirty([1, 2], [2, 1])).toBe(false);
    expect(areCapabilityIdsDirty([1, 2], [1, 3])).toBe(true);
  });
});

describe('buildStaffCapabilityPayload', () => {
  it('always sends capability_ids on create when catalog is ready', () => {
    const result = buildStaffCapabilityPayload({
      isCreate: true,
      capabilityIds: [1, 2],
      originalCapabilityIds: [],
      capabilitiesTouched: false,
      catalogReady: true,
    });
    expect(result.capability_ids).toEqual([1, 2]);
    expect(result.omitCapabilities).toBe(false);
  });

  it('omits capability_ids on update when unchanged', () => {
    const result = buildStaffCapabilityPayload({
      isCreate: false,
      capabilityIds: [1, 2],
      originalCapabilityIds: [2, 1],
      capabilitiesTouched: false,
      catalogReady: true,
    });
    expect(result.omitCapabilities).toBe(true);
    expect(result.capability_ids).toBeUndefined();
  });

  it('sends capability_ids when user touched capabilities', () => {
    const result = buildStaffCapabilityPayload({
      isCreate: false,
      capabilityIds: [1],
      originalCapabilityIds: [1],
      capabilitiesTouched: true,
      catalogReady: true,
    });
    expect(result.capability_ids).toEqual([1]);
    expect(result.omitCapabilities).toBe(false);
  });

  it('blocks create when catalog is unavailable', () => {
    const result = buildStaffCapabilityPayload({
      isCreate: true,
      capabilityIds: [],
      originalCapabilityIds: [],
      capabilitiesTouched: false,
      catalogReady: false,
    });
    expect(result.blockSaveDueToCatalog).toBe(true);
    expect(result.omitCapabilities).toBe(true);
  });

  it('allows email-only update without capability_ids when catalog missing', () => {
    const result = buildStaffCapabilityPayload({
      isCreate: false,
      capabilityIds: [1],
      originalCapabilityIds: [1],
      capabilitiesTouched: false,
      catalogReady: false,
    });
    expect(result.blockSaveDueToCatalog).toBe(false);
    expect(result.omitCapabilities).toBe(true);
  });
});
