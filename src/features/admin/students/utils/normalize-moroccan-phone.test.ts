import { describe, expect, it } from 'vitest';
import {
  moroccanPhoneSearchQuery,
  normalizeMoroccanPhone,
  validateMoroccanPhone,
} from './normalize-moroccan-phone';

describe('normalizeMoroccanPhone', () => {
  it('normalizes local mobile', () => {
    expect(normalizeMoroccanPhone('0620976497').local).toBe('0620976497');
  });

  it('normalizes +212 prefix', () => {
    expect(normalizeMoroccanPhone('+212620976497').local).toBe('0620976497');
  });

  it('normalizes 212 without plus', () => {
    expect(normalizeMoroccanPhone('212620976497').local).toBe('0620976497');
  });

  it('normalizes 00212 prefix', () => {
    expect(normalizeMoroccanPhone('00212620976497').local).toBe('0620976497');
  });

  it('search query prefers local format', () => {
    expect(moroccanPhoneSearchQuery('+212620976497')).toBe('0620976497');
  });

  it('validates proper mobile', () => {
    expect(validateMoroccanPhone('0612345678')).toBe(true);
    expect(validateMoroccanPhone('abc')).toBe(false);
  });
});
