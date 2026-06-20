import { describe, expect, it } from 'vitest';
import {
  formatDiscountPercentDisplay,
  normalizeDiscountPercentInput,
  parseDiscountPayloadValue,
} from './normalize-discount-percent';

describe('normalizeDiscountPercentInput', () => {
  it('preserves whole-number percents', () => {
    expect(normalizeDiscountPercentInput(40)).toBe(40);
    expect(normalizeDiscountPercentInput('40')).toBe(40);
    expect(normalizeDiscountPercentInput('40.0')).toBe(40);
    expect(normalizeDiscountPercentInput(100)).toBe(100);
    expect(normalizeDiscountPercentInput(0)).toBe(0);
  });

  it('snaps near-integer UI artifacts to integers', () => {
    expect(normalizeDiscountPercentInput(39.98)).toBe(40);
    expect(normalizeDiscountPercentInput('39.98')).toBe(40);
  });

  it('keeps meaningful fractional percents', () => {
    expect(normalizeDiscountPercentInput(37.5)).toBe(37.5);
    expect(normalizeDiscountPercentInput('12.25')).toBe(12.25);
  });

  it('clamps to 0..100', () => {
    expect(normalizeDiscountPercentInput(150)).toBe(100);
    expect(normalizeDiscountPercentInput(-5)).toBe(0);
  });
});

describe('parseDiscountPayloadValue', () => {
  it('normalizes percent values only', () => {
    expect(parseDiscountPayloadValue('percent', '39.98')).toBe(40);
    expect(parseDiscountPayloadValue('percent', '37.5')).toBe(37.5);
  });

  it('does not change fixed amounts', () => {
    expect(parseDiscountPayloadValue('fixed_amount', '39.98')).toBe(39.98);
    expect(parseDiscountPayloadValue('fixed_amount', '2500')).toBe(2500);
  });
});

describe('formatDiscountPercentDisplay', () => {
  it('formats normalized percents for review labels', () => {
    expect(formatDiscountPercentDisplay('39.98')).toBe('40');
    expect(formatDiscountPercentDisplay('37.5')).toBe('37.5');
  });
});
