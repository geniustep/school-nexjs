import { describe, expect, it } from 'vitest';
import {
  shouldBindActiveSchoolInBody,
  shouldInjectActiveSchoolIdInBody,
} from './bff-route-policy';
import { bindActiveSchoolJsonBody } from './bind-active-school-body';

const PATH = '/admin/students/14755/academic-placement/correct';

describe('BFF student academic placement body policy', () => {
  it('keeps trusted school binding enabled without injecting active_school_id into the strict body', () => {
    expect(shouldBindActiveSchoolInBody(PATH, 'POST')).toBe(true);
    expect(shouldInjectActiveSchoolIdInBody(PATH)).toBe(false);

    const bound = bindActiveSchoolJsonBody(
      { level_id: 2442 },
      3,
      { injectActiveSchoolId: shouldInjectActiveSchoolIdInBody(PATH) },
    );

    expect(bound).toEqual({ ok: true, body: { level_id: 2442 } });
  });

  it('still rejects a mismatched client-supplied active_school_id before upstream', () => {
    const bound = bindActiveSchoolJsonBody(
      { level_id: 2442, active_school_id: 99 },
      3,
      { injectActiveSchoolId: shouldInjectActiveSchoolIdInBody(PATH) },
    );

    expect(bound).toEqual({ ok: false, reason: 'active_school_id_mismatch' });
  });
});
