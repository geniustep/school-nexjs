import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { endpoints } from '@/lib/api/endpoints';
import { shouldInjectActiveSchoolIdInBody } from '@/lib/api/bff-route-policy';
import { parseFamilyBatchConvertRequestBody } from '@/features/admin/admissions/utils/family-batch-selective-conversion';

const odooApiFetchMock = vi.fn();
const getCurrentUserMock = vi.fn();
const cookiesGetMock = vi.fn();
const getStoredTenantSlugMock = vi.fn();
const getActiveRoleCookieMock = vi.fn();
const guardTenantFromRequestMock = vi.fn();

vi.mock('@/lib/api/odoo-server', () => ({
  odooApiFetch: (...args: unknown[]) => odooApiFetchMock(...args),
}));

vi.mock('@/lib/api/server', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (...args: unknown[]) => cookiesGetMock(...args) }),
}));

vi.mock('@/lib/api/odoo-backend', () => ({
  getStoredTenantSlug: (...args: unknown[]) => getStoredTenantSlugMock(...args),
  tenantBackendNotConfiguredResponse: () =>
    new Response(JSON.stringify({ success: false }), { status: 503 }),
}));

vi.mock('@/lib/auth/active-role-preference', () => ({
  getActiveRoleCookie: (...args: unknown[]) => getActiveRoleCookieMock(...args),
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  guardTenantFromRequest: (...args: unknown[]) => guardTenantFromRequestMock(...args),
}));

vi.mock('@/lib/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tenant')>('@/lib/tenant');
  return {
    ...actual,
    resolveTenantRuntimeConfigFromRequest: () => ({
      ok: true as const,
      config: {
        tenantCode: 'school',
        backendBaseUrl: 'https://odoo.test',
      },
    }),
    getHostFromHeaders: () => 'app.test',
  };
});

describe('family-batch convert-to-students BFF', () => {
  beforeEach(() => {
    odooApiFetchMock.mockReset();
    getCurrentUserMock.mockReset();
    cookiesGetMock.mockReset();
    getStoredTenantSlugMock.mockReset();
    getActiveRoleCookieMock.mockReset();
    guardTenantFromRequestMock.mockReset();

    cookiesGetMock.mockReturnValue({ value: 'sess-1' });
    getStoredTenantSlugMock.mockResolvedValue('school');
    getActiveRoleCookieMock.mockResolvedValue('admin');
    guardTenantFromRequestMock.mockResolvedValue({ ok: true });
    getCurrentUserMock.mockResolvedValue({
      id: 9,
      role: 'admin',
      active_school_id: 3,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('forwards batch_id, application_ids, idempotency_key, session, and active role', async () => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: {
        success: true,
        data: {
          batch_id: 55,
          idempotency_key: 'fam-conv-1',
          status: 'completed',
          requested_count: 2,
          succeeded_count: 2,
          replayed_count: 0,
          already_registered_count: 0,
          failed_count: 0,
          applications: [
            { application_id: 101, status: 'succeeded', student_id: 901, code: 'STUDENT_CREATED' },
            { application_id: 103, status: 'succeeded', student_id: 902, code: 'STUDENT_CREATED' },
          ],
          replayed: false,
        },
        meta: {},
      },
    });

    const { POST } = await import(
      '@/app/api/admin/admissions/family-batches/[batchId]/convert-to-students/route'
    );

    const req = new NextRequest(
      'https://app.test/api/admin/admissions/family-batches/55/convert-to-students',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://app.test',
          host: 'app.test',
          'X-SSC-Active-Role': 'admin',
        },
        body: JSON.stringify({
          idempotency_key: 'fam-conv-1',
          application_ids: [103, 101],
        }),
      },
    );

    const res = await POST(req, { params: Promise.resolve({ batchId: '55' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('completed');
    expect(json.data.applications).toHaveLength(2);

    expect(odooApiFetchMock).toHaveBeenCalledTimes(1);
    const [path, opts] = odooApiFetchMock.mock.calls[0] as [
      string,
      {
        method: string;
        sessionId: string;
        activeRole?: string;
        query?: Record<string, string>;
        body?: { idempotency_key: string; application_ids: number[] };
      },
    ];
    expect(path).toBe(endpoints.admin.admissionFamilyBatchConvertToStudents(55));
    expect(opts.method).toBe('POST');
    expect(opts.sessionId).toBe('sess-1');
    expect(opts.activeRole).toBe('admin');
    expect(opts.query?.active_school_id).toBe('3');
    expect(opts.body).toEqual({
      idempotency_key: 'fam-conv-1',
      application_ids: [101, 103],
    });
    expect(JSON.stringify(opts.body)).not.toMatch(/student_name|أحمد|name/);
    expect(odooApiFetchMock.mock.calls[0][0]).not.toContain('batch-registration');
    expect(String(odooApiFetchMock.mock.calls[0][0])).not.toMatch(/\/actions$/);
  });

  it('returns partial success envelope unchanged in status semantics', async () => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: {
        success: true,
        data: {
          batch_id: 55,
          status: 'partially_completed',
          requested_count: 2,
          succeeded_count: 1,
          failed_count: 1,
          applications: [
            { application_id: 101, status: 'succeeded', student_id: 901, code: 'STUDENT_CREATED' },
            { application_id: 103, status: 'failed', student_id: null, code: 'CONVERT_FAILED' },
          ],
        },
        meta: {},
      },
    });

    const { POST } = await import(
      '@/app/api/admin/admissions/family-batches/[batchId]/convert-to-students/route'
    );
    const req = new NextRequest(
      'https://app.test/api/admin/admissions/family-batches/55/convert-to-students',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'app.test' },
        body: JSON.stringify({
          idempotency_key: 'k2',
          application_ids: [101, 103],
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ batchId: '55' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('partially_completed');
    expect(json.data.succeeded_count).toBe(1);
    expect(json.data.failed_count).toBe(1);
  });

  it.each([
    [400, 'validation_error'],
    [401, 'unauthenticated'],
    [403, 'permission_denied'],
    [404, 'not_found'],
    [409, 'idempotency_conflict'],
  ])('preserves %s from Odoo', async (status, code) => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status,
      body: {
        success: false,
        error: { code, message: 'safe message', details: {} },
        meta: {},
      },
    });
    const { POST } = await import(
      '@/app/api/admin/admissions/family-batches/[batchId]/convert-to-students/route'
    );
    const req = new NextRequest(
      'https://app.test/api/admin/admissions/family-batches/55/convert-to-students',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'app.test' },
        body: JSON.stringify({ idempotency_key: 'k', application_ids: [1] }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ batchId: '55' }) });
    expect(res.status).toBe(status);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(code);
    expect(JSON.stringify(json)).not.toMatch(/odoo\.test|https:\/\/odoo/i);
  });

  it('sanitizes 5xx without leaking Odoo URL', async () => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 500,
      body: {
        success: false,
        error: {
          code: 'server_error',
          message: 'boom at https://odoo.test/secret',
          details: { url: 'https://odoo.test/x', stack: 'Traceback' },
        },
        meta: {},
      },
    });
    const { POST } = await import(
      '@/app/api/admin/admissions/family-batches/[batchId]/convert-to-students/route'
    );
    const req = new NextRequest(
      'https://app.test/api/admin/admissions/family-batches/55/convert-to-students',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'app.test' },
        body: JSON.stringify({ idempotency_key: 'k', application_ids: [1] }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ batchId: '55' }) });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(/odoo\.test|Traceback|https:\/\/odoo/i);
  });

  it('rejects invalid body before calling Odoo', async () => {
    const { POST } = await import(
      '@/app/api/admin/admissions/family-batches/[batchId]/convert-to-students/route'
    );
    const req = new NextRequest(
      'https://app.test/api/admin/admissions/family-batches/55/convert-to-students',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'app.test' },
        body: JSON.stringify({ application_ids: [] }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ batchId: '55' }) });
    expect(res.status).toBe(400);
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 without session and does not call Odoo', async () => {
    cookiesGetMock.mockReturnValue(undefined);
    const { POST } = await import(
      '@/app/api/admin/admissions/family-batches/[batchId]/convert-to-students/route'
    );
    const req = new NextRequest(
      'https://app.test/api/admin/admissions/family-batches/55/convert-to-students',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'app.test' },
        body: JSON.stringify({ idempotency_key: 'k', application_ids: [1] }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ batchId: '55' }) });
    expect(res.status).toBe(401);
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });

  it('does not inject active_school_id into convert body via shared policy', () => {
    expect(
      shouldInjectActiveSchoolIdInBody('/admin/admissions/family-batches/55/convert-to-students'),
    ).toBe(false);
  });

  it('parseFamilyBatchConvertRequestBody rejects PII fields and duplicates', () => {
    expect(
      parseFamilyBatchConvertRequestBody({
        idempotency_key: 'k',
        application_ids: [1, 1],
      }).ok,
    ).toBe(false);
    expect(
      parseFamilyBatchConvertRequestBody({
        idempotency_key: 'k',
        application_ids: [1],
        student_name: 'x',
      }).ok,
    ).toBe(false);
    const ok = parseFamilyBatchConvertRequestBody({
      idempotency_key: 'k',
      application_ids: [3, 1],
    });
    expect(ok).toEqual({
      ok: true,
      payload: { idempotency_key: 'k', application_ids: [1, 3] },
    });
  });
});
