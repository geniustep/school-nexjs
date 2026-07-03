import { describe, expect, it } from 'vitest';
import {
  canChangeAdmissionState,
  canEditAdmissionDetail,
} from './admission-allowed-actions';
import type { CurrentUser } from '@/types/user';

function user(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Pedagogy',
    email: 'd@test.ma',
    role: 'admin',
    permissions: [],
    school: null,
    effective_capabilities: caps,
  };
}

describe('admission edit limited gates', () => {
  it('allowed_actions.edit shows edit without manage/decide', () => {
    expect(canEditAdmissionDetail({ edit: true }, user([]))).toBe(true);
    expect(canChangeAdmissionState({ edit: true, decide: false })).toBe(false);
  });

  it('admission.update_limited capability enables edit when API omits edit flag', () => {
    expect(canEditAdmissionDetail({}, user(['admission.update_limited']))).toBe(true);
  });

  it('explicit edit=false blocks even with update_limited capability', () => {
    expect(canEditAdmissionDetail({ edit: false }, user(['admission.update_limited']))).toBe(false);
  });

  it('missing manage/decide hides state change and decision actions', () => {
    const actions = { edit: true, decide: false, reopen: false };
    expect(canChangeAdmissionState(actions)).toBe(false);
    expect(canEditAdmissionDetail(actions, user(['admission.update_limited']))).toBe(true);
  });

  it('decide capability alone enables state/decision UI gate', () => {
    expect(canChangeAdmissionState({ decide: true })).toBe(true);
  });

  it('does not infer delete from edit limited', () => {
    const actions: Record<string, boolean | undefined> = { edit: true };
    expect(Boolean(actions.delete || actions.archive)).toBe(false);
  });
});

describe('admission primary edit request action', () => {
  it('admission.update_limited enables primary edit action in header', () => {
    expect(canEditAdmissionDetail({}, user(['admission.update_limited']))).toBe(true);
    expect(canEditAdmissionDetail({ edit: true }, user([]))).toBe(true);
  });

  it('without update_limited or allowed_actions.edit hides primary edit action', () => {
    expect(canEditAdmissionDetail({}, user([]))).toBe(false);
    expect(canEditAdmissionDetail({}, user(['admission.view']))).toBe(false);
  });

  it('update_limited does not expose final decision or reopen gates', () => {
    const actions = { edit: true, decide: false, reopen: false };
    expect(canChangeAdmissionState(actions)).toBe(false);
    expect(canEditAdmissionDetail(actions, user(['admission.update_limited']))).toBe(true);
  });

  it('decide alone enables final decision UI gate, not limited edit alone', () => {
    expect(canChangeAdmissionState({ decide: true })).toBe(true);
    expect(canChangeAdmissionState({ edit: true })).toBe(false);
    expect(canEditAdmissionDetail({ decide: true }, user([]))).toBe(false);
  });
});
