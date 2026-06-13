import { describe, expect, it } from 'vitest';
import {
  academicLabelSearchHaystack,
  formatAcademicClassLabel,
  formatAcademicLevelLabel,
} from './format-academic-label';

describe('formatAcademicLevelLabel', () => {
  it('prefers moroccan_display_alias over code', () => {
    const parts = formatAcademicLevelLabel(
      {
        name: 'M1',
        code: 'M1',
        moroccan_display_alias: 'الأولى إعدادي',
      },
      'ar',
    );
    expect(parts.primary).toBe('الأولى إعدادي');
    expect(parts.secondary).toBe('M1');
  });

  it('falls back to code when no readable label exists', () => {
    const parts = formatAcademicLevelLabel({ name: 'M1', code: 'M1' }, 'ar');
    expect(parts.primary).toBe('M1');
    expect(parts.secondary).toBeNull();
  });
});

describe('formatAcademicClassLabel', () => {
  it('uses display_alias when provided', () => {
    const parts = formatAcademicClassLabel(
      {
        name: 'M1A',
        code: 'M1A',
        display_alias: 'الأولى إعدادي — القسم أ',
        level: { id: 1, name: 'M1', code: 'M1', moroccan_display_alias: 'الأولى إعدادي' },
      },
      'ar',
    );
    expect(parts.primary).toBe('الأولى إعدادي — القسم أ');
    expect(parts.secondary).toBe('M1A');
  });

  it('builds readable class label from level alias and section suffix', () => {
    const parts = formatAcademicClassLabel(
      {
        name: 'M1A',
        code: 'M1A',
        level: { id: 1, name: 'M1', code: 'M1', moroccan_display_alias: 'الأولى إعدادي' },
      },
      'ar',
    );
    expect(parts.primary).toBe('الأولى إعدادي — القسم أ');
    expect(parts.secondary).toBe('M1A');
  });

  it('supports search by readable and technical labels', () => {
    const parts = formatAcademicClassLabel(
      {
        name: 'M1A',
        code: 'M1A',
        level: { id: 1, name: 'M1', code: 'M1', moroccan_display_alias: 'الأولى إعدادي' },
      },
      'ar',
    );
    const haystack = academicLabelSearchHaystack(parts, ['M1A']);
    expect(haystack).toContain('الأولى إعدادي');
    expect(haystack).toContain('m1a');
  });
});
