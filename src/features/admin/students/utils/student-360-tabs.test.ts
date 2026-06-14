import { describe, expect, it } from 'vitest';
import {
  STUDENT_360_TAB_ORDER,
  buildAvailableStudent360Tabs,
  buildStudent360TabHref,
  isStudent360TabId,
  parseStudent360Tab,
} from './student-360-tabs';

describe('STUDENT_360_TAB_ORDER', () => {
  it('matches the operational admin order', () => {
    expect(STUDENT_360_TAB_ORDER).toEqual([
      'overview',
      'enrollment',
      'guardians',
      'financial-agreement',
      'finance',
      'health',
      'documents',
    ]);
  });
});

describe('parseStudent360Tab', () => {
  const available = buildAvailableStudent360Tabs({
    showFinance: true,
    showHealth: true,
    showDocuments: true,
  });

  it('activates overview by default', () => {
    expect(parseStudent360Tab(null, available)).toBe('overview');
  });

  it('activates enrollment from URL', () => {
    expect(parseStudent360Tab('enrollment', available)).toBe('enrollment');
  });

  it('activates guardians from URL', () => {
    expect(parseStudent360Tab('guardians', available)).toBe('guardians');
  });

  it('activates finance from URL', () => {
    expect(parseStudent360Tab('finance', available)).toBe('finance');
  });

  it('activates financial-agreement from URL', () => {
    expect(parseStudent360Tab('financial-agreement', available)).toBe('financial-agreement');
  });

  it('activates health from URL', () => {
    expect(parseStudent360Tab('health', available)).toBe('health');
  });

  it('activates documents from URL', () => {
    expect(parseStudent360Tab('documents', available)).toBe('documents');
  });

  it('falls back to overview for invalid tab values', () => {
    expect(parseStudent360Tab('invalid-tab', available)).toBe('overview');
  });

  it('falls back when tab is unavailable by permission', () => {
    const limited = buildAvailableStudent360Tabs({
      showFinance: false,
      showHealth: false,
      showDocuments: false,
    });
    expect(parseStudent360Tab('documents', limited)).toBe('overview');
  });
});

describe('buildStudent360TabHref', () => {
  it('omits query for overview', () => {
    expect(buildStudent360TabHref(727, 'overview')).toBe('/admin/students/727');
  });

  it('adds tab query for finance and documents', () => {
    expect(buildStudent360TabHref(727, 'finance')).toBe('/admin/students/727?tab=finance');
    expect(buildStudent360TabHref(727, 'financial-agreement')).toBe(
      '/admin/students/727?tab=financial-agreement',
    );
    expect(buildStudent360TabHref(727, 'documents')).toBe('/admin/students/727?tab=documents');
  });
});

describe('isStudent360TabId', () => {
  it('recognizes known tab ids only', () => {
    expect(isStudent360TabId('health')).toBe(true);
    expect(isStudent360TabId('unknown')).toBe(false);
  });
});

describe('buildAvailableStudent360Tabs', () => {
  it('filters permission-gated tabs while preserving order', () => {
    expect(
      buildAvailableStudent360Tabs({
        showFinance: true,
        showHealth: false,
        showDocuments: true,
      }),
    ).toEqual(['overview', 'enrollment', 'guardians', 'financial-agreement', 'finance', 'documents']);
  });
});
