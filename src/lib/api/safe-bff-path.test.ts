import { describe, expect, it } from 'vitest';
import {
  assertUrlStaysUnderPathPrefix,
  canonicalizeBffPathSegments,
  decodeBffPathSegmentOnce,
} from '@/lib/api/safe-bff-path';
import {
  assertOdooApiUrlUnderV1Prefix,
  buildOdooApiUrl,
  tryBuildBffProxyPath,
} from '@/lib/api/build-odoo-api-url';
import { assertBffRoutePolicy, hasDeniedBffNamespace } from '@/lib/api/bff-route-policy';

describe('safe BFF path segments', () => {
  it('accepts safe dynamic School API segments', () => {
    const result = canonicalizeBffPathSegments([
      'admin',
      'finance',
      'students',
      '854',
      'financial-overview',
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('/admin/finance/students/854/financial-overview');
    }
  });

  it.each([
    ['.'],
    ['..'],
    ['%2e'],
    ['%2E'],
    ['%2e%2e'],
    ['%2E%2E'],
    ['%252e%252e'],
    ['%2f'],
    ['%5c'],
    ['https://example.com'],
    ['//example.com'],
    ['\\dataset'],
    ['a/b'],
    ['%zz'],
  ])('rejects unsafe segment %s', (segment) => {
    expect(decodeBffPathSegmentOnce(segment).ok).toBe(false);
    expect(canonicalizeBffPathSegments(['admin', segment]).ok).toBe(false);
  });
});

describe('odoo-web image path prefix', () => {
  const base = 'https://api-school.example';

  it('keeps safe image paths under /web/image/', () => {
    const canonical = canonicalizeBffPathSegments([
      'image',
      'school.student',
      '854',
      'image_128',
    ]);
    expect(canonical.ok).toBe(true);
    if (!canonical.ok) return;
    const url =
      `${base}/web/` + canonical.segments.map((s) => encodeURIComponent(s)).join('/');
    expect(assertUrlStaysUnderPathPrefix(url, base, '/web/image').ok).toBe(true);
    expect(new URL(url).pathname.startsWith('/web/image/')).toBe(true);
  });

  it('rejects image traversal segments before URL build', () => {
    expect(canonicalizeBffPathSegments(['image', '..', '..', 'dataset']).ok).toBe(false);
    expect(canonicalizeBffPathSegments(['image', '%2e%2e', 'dataset']).ok).toBe(false);
    expect(canonicalizeBffPathSegments(['dataset', 'call_kw']).ok).toBe(true);
    // first segment must be image for the web proxy — enforced by caller; path itself may canonicalize
    const notImage = canonicalizeBffPathSegments(['web', 'session', 'authenticate']);
    expect(notImage.ok).toBe(true);
    if (notImage.ok) expect(notImage.segments[0]).not.toBe('image');
  });
});

describe('BFF API v1 path escape', () => {
  const base = 'https://api-school.example';

  it('keeps safe paths under /api/v1/', () => {
    const built = tryBuildBffProxyPath(['admin', 'students', '12']);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const url = buildOdooApiUrl(base, '/api/v1', built.path);
    expect(assertOdooApiUrlUnderV1Prefix(url, base).ok).toBe(true);
    expect(new URL(url).pathname.startsWith('/api/v1/')).toBe(true);
    expect(new URL(url).origin).toBe(new URL(base).origin);
  });

  it('rejects traversal that would reach /web', () => {
    expect(tryBuildBffProxyPath(['..', 'web', 'session']).ok).toBe(false);
    expect(tryBuildBffProxyPath(['admin', '..', 'web']).ok).toBe(false);
  });
});

describe('BFF route policy', () => {
  it('allows known School API families with expected methods', () => {
    expect(assertBffRoutePolicy('/admin/students', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/finance/fee-plans/1', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/teacher/classes/3/homeworks', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/parent/children', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/student/homeworks/9', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/me', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/channels/1/messages', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/channels/1/my-pending-messages', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/channels/1/pending-messages/34/resubmit', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/communication/content', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/communication/content/34/approve', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/channels/10/pending-messages', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/channels/10/messages', 'GET').ok).toBe(true);
    expect(
      assertBffRoutePolicy('/admin/channels/10/pending-messages/34/resubmit', 'POST').ok,
    ).toBe(true);
    // B4 recipient-preview paths
    expect(
      assertBffRoutePolicy('/channels/1/messages/recipient-preview', 'POST').ok,
    ).toBe(true);
    expect(
      assertBffRoutePolicy('/admin/channels/10/messages/recipient-preview', 'POST').ok,
    ).toBe(true);
    expect(
      assertBffRoutePolicy('/admin/communication/content/34/recipient-preview', 'POST').ok,
    ).toBe(true);
    expect(
      assertBffRoutePolicy('/staff/communication/content/34/recipient-preview', 'POST').ok,
    ).toBe(true);
    // Governed announcement recipient APIs (5D2B / 5E2)
    expect(assertBffRoutePolicy('/communication/announcements', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/communication/announcements/12', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/communication/announcements/12/read', 'POST').ok).toBe(true);
    expect(
      assertBffRoutePolicy(
        '/communication/announcements/12/attachments/9/download',
        'GET',
      ).ok,
    ).toBe(true);
  });

  it('rejects unlisted paths, wrong methods, and ORM namespaces', () => {
    expect(assertBffRoutePolicy('/admin/academic-setup/terms/31', 'PATCH').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/academic-years/1/terms', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/academic-years/1/terms', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/unknown-family/x', 'GET').ok).toBe(false);
    expect(assertBffRoutePolicy('/me', 'POST').ok).toBe(false);
    expect(assertBffRoutePolicy('/web/dataset', 'GET').ok).toBe(false);
    expect(hasDeniedBffNamespace('/admin/students/search_read')).toBe(true);
    expect(assertBffRoutePolicy('/admin/students/search_read', 'GET').ok).toBe(false);
    expect(assertBffRoutePolicy('/jsonrpc', 'POST').ok).toBe(false);
    expect(assertBffRoutePolicy('/staff/communication/content/34/approve', 'POST').ok).toBe(
      false,
    );
    expect(assertBffRoutePolicy('/channels/1/messages/recipient-preview', 'GET').ok).toBe(false);
  });

  it('rejects path traversal and encoded slash in B4 preview segments', () => {
    expect(canonicalizeBffPathSegments(['channels', '..', 'admin']).ok).toBe(false);
    expect(
      canonicalizeBffPathSegments(['channels', '1', 'messages', 'recipient-preview', '%2f']).ok,
    ).toBe(false);
    expect(
      canonicalizeBffPathSegments(['staff', 'communication', 'content', '%2e%2e', 'x']).ok,
    ).toBe(false);
  });
});
