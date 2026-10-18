import { describe, expect, it } from 'vitest';
import { buildAssignmentPeriodPayload, detectAssignmentBackendContract } from './teaching-assignment-contract-capability';

describe('teaching assignment contract compatibility', () => {
  it('detects V1 and legacy 1C from successful mode-free responses', () => {
    expect(detectAssignmentBackendContract({context:{academic_year_id:1,effective_from:null,effective_to:null,
      time_window:null,period_mode:null,period_window:{period_window_source:'legacy'}}})).toBe('v1');
    expect(detectAssignmentBackendContract({context:{academic_year_id:1,effective_from:null,
      effective_to:null,time_window:null}})).toBe('legacy_1c');
  });
  it('fails closed on partial or absent contract', () => {
    expect(detectAssignmentBackendContract({context:{period_mode:null}})).toBe('unknown');
    expect(detectAssignmentBackendContract({context:undefined})).toBe('unknown');
  });
  it('V1 uses period_mode, omitting dates for academic_year', () => {
    expect(buildAssignmentPeriodPayload({contract:'v1',acceptedLegacy:false,mode:'academic_year',
      effectiveFrom:'',effectiveTo:''})).toEqual({period_mode:'academic_year'});
    expect(buildAssignmentPeriodPayload({contract:'v1',acceptedLegacy:false,mode:'custom',
      effectiveFrom:'2026-10-01',effectiveTo:'2027-07-01'}))
      .toEqual({period_mode:'custom',effective_from:'2026-10-01',effective_to:'2027-07-01'});
  });
  it('Legacy requires explicit user consent and omits period_mode', () => {
    const base={contract:'legacy_1c' as const,mode:'academic_year' as const,
      effectiveFrom:'2026-10-01',effectiveTo:'2027-07-01'};
    expect(buildAssignmentPeriodPayload({...base,acceptedLegacy:false})).toBeNull();
    expect(buildAssignmentPeriodPayload({...base,acceptedLegacy:true}))
      .toEqual({effective_from:'2026-10-01',effective_to:'2027-07-01'});
  });
  it('blocks unknown contract or invalid date window', () => {
    expect(buildAssignmentPeriodPayload({contract:'unknown',acceptedLegacy:true,mode:'academic_year',
      effectiveFrom:'2026-10-01',effectiveTo:'2027-07-01'})).toBeNull();
    expect(buildAssignmentPeriodPayload({contract:'legacy_1c',acceptedLegacy:true,mode:'custom',
      effectiveFrom:'2027-07-01',effectiveTo:'2026-10-01'})).toBeNull();
  });
});
