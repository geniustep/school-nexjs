import { describe, expect, it } from 'vitest';
import type { StaffCapabilityOption } from '@/types/academic-setup';
import {
  grantableResponsibilityCapabilities,
  filterResponsibilityCapabilities,
  countUnavailableSelectedCapabilities,
  readableResponsibilityCapabilityLabel,
} from './staff-responsibility-capability-picker';

const fixture: StaffCapabilityOption[] = [
  { id: 1, code: 'attendance.view', category: 'attendance', label: 'view', grantable: true },
  { id: 2, code: 'attendance.export', category: 'attendance', label: 'export', grantable: true },
  { id: 3, code: 'students.view', category: 'students', label: 'view', grantable: true },
  { id: 4, code: 'finance.manage', category: 'finance', label: 'manage', grantable: false },
];
const getLabel = (item: StaffCapabilityOption) =>
  readableResponsibilityCapabilityLabel(item, item.label, item.category === 'attendance' ? 'الحضور والغياب' : 'التلاميذ', 'ar');
const getCategory = (category: string) => category === 'attendance' ? 'الحضور والغياب' : 'التلاميذ';

describe('staff responsibility capability picker', () => {
  it('keeps only backend-grantable capability codes and deduplicates the catalog', () => {
    const list = grantableResponsibilityCapabilities([...fixture, fixture[0]]);
    expect(list.map((cap) => cap.code)).toEqual(['attendance.view', 'attendance.export', 'students.view']);
  });

  it('replaces generic action-only labels with an unambiguous domain-qualified label', () => {
    expect(getLabel(fixture[0])).toBe('الاطلاع على الحضور والغياب');
    expect(readableResponsibilityCapabilityLabel(fixture[0], 'عرض الحضور والغياب', 'الحضور والغياب', 'ar'))
      .toBe('عرض الحضور والغياب');
  });

  it('searches across localized domain, readable name and technical code', () => {
    const items = grantableResponsibilityCapabilities(fixture);
    expect(filterResponsibilityCapabilities(items, 'الحضور', false, [], getLabel, getCategory)).toHaveLength(2);
    expect(filterResponsibilityCapabilities(items, 'attendance.export', false, [], getLabel, getCategory).map((cap) => cap.code))
      .toEqual(['attendance.export']);
    expect(filterResponsibilityCapabilities(items, 'stuDenTS', false, [], getLabel, getCategory).map((cap) => cap.code))
      .toEqual(['students.view']);
  });

  it('selected-only is a view filter and never mutates the saved selection', () => {
    const selected = ['attendance.view', 'students.view'];
    const results = filterResponsibilityCapabilities(grantableResponsibilityCapabilities(fixture), 'الحضور', true, selected, getLabel, getCategory);
    expect(results.map((cap) => cap.code)).toEqual(['attendance.view']);
    expect(selected).toEqual(['attendance.view', 'students.view']);
  });

  it('counts capabilities no longer grantable without discarding the saved codes', () => {
    const selected = ['attendance.view', 'finance.manage'];
    expect(countUnavailableSelectedCapabilities(grantableResponsibilityCapabilities(fixture), selected)).toBe(1);
    expect(selected).toHaveLength(2);
  });
});
