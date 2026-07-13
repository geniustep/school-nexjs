import { describe, expect, it } from 'vitest';
import type { AdmissionOptionItem } from '@/types/admission';
import {
  buildAdmissionSourceFilterOptions,
  isDirectVisitSourceOption,
  resolveSourceFilterSelectValue,
  sourceFilterChipLabel,
  sourceFilterMatchIds,
} from './admission-source-filter';

const sources: AdmissionOptionItem[] = [
  { id: 1, code: 'phone', label: 'Phone' },
  { id: 2, code: 'visit', label: 'Visit' },
  { id: 3, label: 'زيارة' },
  { id: 4, label: 'زيارة مباشرة' },
  { id: 5, code: 'web', label: 'Web' },
];

describe('admission source filter dedupe', () => {
  it('collapses visit label variants into one select option', () => {
    const options = buildAdmissionSourceFilterOptions(sources, 'زيارة مباشرة');
    expect(options).toHaveLength(3);
    const visit = options.find((o) => o.isDirectVisit);
    expect(visit?.label).toBe('زيارة مباشرة');
    expect(visit?.value).toBe('2');
    expect(visit?.matchIds.sort()).toEqual(['2', '3', '4']);
    expect(options.filter((o) => o.isDirectVisit)).toHaveLength(1);
  });

  it('normalizes legacy visit ids to the canonical select value', () => {
    const options = buildAdmissionSourceFilterOptions(sources, 'Direct visit');
    expect(resolveSourceFilterSelectValue(options, '3')).toBe('2');
    expect(resolveSourceFilterSelectValue(options, '4')).toBe('2');
    expect(sourceFilterChipLabel(options, '3', 'x')).toBe('Direct visit');
    expect(sourceFilterMatchIds(sources, '3').sort()).toEqual(['2', '3', '4']);
  });

  it('detects visit variants without inventing backend codes', () => {
    expect(isDirectVisitSourceOption({ id: 9, label: 'Visite' })).toBe(true);
    expect(isDirectVisitSourceOption({ id: 10, label: 'Referral' })).toBe(false);
  });
});
