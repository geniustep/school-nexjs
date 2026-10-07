import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from './bff-route-policy';

const BASE = '/communication/announcements/528/attachments/61414';

describe('BFF announcement attachment route policy', () => {
  for (const action of ['download', 'preview', 'thumbnail'] as const) {
    it(`allows GET and HEAD for announcement attachment ${action}`, () => {
      expect(assertBffRoutePolicy(`${BASE}/${action}`, 'GET')).toEqual({ ok: true });
      expect(assertBffRoutePolicy(`${BASE}/${action}`, 'HEAD')).toEqual({ ok: true });
    });
  }

  it('rejects mutation methods for announcement attachment thumbnails', () => {
    expect(assertBffRoutePolicy(`${BASE}/thumbnail`, 'POST')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('rejects unknown announcement attachment actions', () => {
    expect(assertBffRoutePolicy(`${BASE}/delete`, 'GET')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
  });
});
