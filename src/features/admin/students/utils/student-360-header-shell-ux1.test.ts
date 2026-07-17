import { describe, expect, it } from 'vitest';
import {
  STUDENT_360_TAB_ORDER,
  buildAvailableStudent360Tabs,
  buildStudent360TabHref,
  parseStudent360Tab,
} from './student-360-tabs';
import {
  buildStudent360AcademicContextLine,
  buildStudent360HeaderOverflowActions,
  shouldShowStudent360HeaderAttentionCue,
  student360HeaderShowsRecordPayment,
} from './build-student-360-header-shell';

describe('Student 360 header + tabs shell UX1', () => {
  it('keeps record payment as a primary header action when collect is allowed', () => {
    expect(
      student360HeaderShowsRecordPayment({ showFinance: true, canCollect: true }),
    ).toBe(true);
    expect(
      student360HeaderShowsRecordPayment({ showFinance: true, canCollect: false }),
    ).toBe(false);
  });

  it('uses the agreed operational tab order', () => {
    expect(STUDENT_360_TAB_ORDER).toEqual([
      'overview',
      'enrollment',
      'guardians',
      'finance',
      'documents',
      'health',
      'academic',
    ]);
  });

  it('preserves URL tab keys and deep links', () => {
    expect(buildStudent360TabHref(2081, 'overview')).toBe('/admin/students/2081');
    expect(buildStudent360TabHref(2081, 'finance')).toBe('/admin/students/2081?tab=finance');
    expect(buildStudent360TabHref(2081, 'academic')).toBe('/admin/students/2081?tab=academic');
    expect(parseStudent360Tab('finance', [...STUDENT_360_TAB_ORDER])).toBe('finance');
  });

  it('hides permission-gated tabs while preserving visible order', () => {
    expect(
      buildAvailableStudent360Tabs({
        showFinance: true,
        showHealth: false,
        showDocuments: true,
      }),
    ).toEqual(['overview', 'enrollment', 'guardians', 'finance', 'documents', 'academic']);
  });

  it('keeps edit as the only visible secondary action and parks rare actions in overflow', () => {
    const overflow = buildStudent360HeaderOverflowActions({
      canManage: true,
      canManageGuardians: true,
      hasActiveGuardian: false,
      hasEnrollment: false,
      canManageDocuments: true,
      missingDocs: 2,
      canManageHealth: true,
      hasHealth: false,
    });
    expect(overflow.map((a) => a.key)).toEqual(['guardian', 'enrollment', 'document', 'health']);
    expect(overflow.some((a) => a.key === 'document')).toBe(true);
  });

  it('does not invent overflow actions without manage permission', () => {
    expect(
      buildStudent360HeaderOverflowActions({
        canManage: false,
        canManageGuardians: true,
        hasActiveGuardian: false,
        hasEnrollment: false,
        canManageDocuments: true,
        missingDocs: 2,
        canManageHealth: true,
        hasHealth: false,
      }),
    ).toEqual([]);
  });

  it('builds a compact academic context without empty separators', () => {
    expect(buildStudent360AcademicContextLine({ classLabel: 'M1A', levelLabel: '1APIC' })).toBe('M1A');
    expect(buildStudent360AcademicContextLine({ classLabel: null, levelLabel: '1APIC' })).toBe(
      '1APIC',
    );
    expect(buildStudent360AcademicContextLine({ classLabel: '  ', levelLabel: null })).toBeNull();
    expect(
      buildStudent360AcademicContextLine({
        classLabel: 'M1A — 1APIC',
        levelLabel: 'M1 — 1APIC',
      }),
    ).toBe('M1A — 1APIC');
  });

  it('shows a single attention cue only when follow-up is needed', () => {
    expect(
      shouldShowStudent360HeaderAttentionCue({
        alertCount: 0,
        missingBasicIdentity: false,
        profileReadiness: 'ready',
      }),
    ).toBe(false);
    expect(
      shouldShowStudent360HeaderAttentionCue({
        alertCount: 2,
        missingBasicIdentity: false,
        profileReadiness: 'ready',
      }),
    ).toBe(true);
  });
});
