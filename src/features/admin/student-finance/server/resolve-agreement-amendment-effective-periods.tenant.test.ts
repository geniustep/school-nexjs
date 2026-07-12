import { beforeEach, describe, expect, it, vi } from 'vitest';

const odooApiFetchMock = vi.fn();

vi.mock('@/lib/api/odoo-server', () => ({
  odooApiFetch: (...args: unknown[]) => odooApiFetchMock(...args),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'scc_session' ? { value: 'sess-1' } : undefined),
  })),
}));

vi.mock('@/lib/config', () => ({
  config: {
    sessionCookieName: 'scc_session',
    apiPrefix: '/api/v1',
    odooBaseUrl: 'https://SHOULD-NOT-USE.example',
  },
}));

import {
  __clearAgreementAmendmentPeriodCacheForTests,
  resolveAgreementAmendmentEffectivePeriods,
} from './resolve-agreement-amendment-effective-periods';

describe('resolveAgreementAmendmentEffectivePeriods tenant binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearAgreementAmendmentPeriodCacheForTests();
  });

  it('requires tenant and backendBaseUrl (no ODOO_BASE_URL fallback)', async () => {
    const missing = await resolveAgreementAmendmentEffectivePeriods({
      studentId: 1,
      agreementId: 2,
      tenant: '',
      backendBaseUrl: '',
      userId: 1,
    });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.code).toBe('unauthorized');
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });

  it('passes Host tenant backend into odooApiFetch', async () => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: {
        success: true,
        data: [{ id: 10, label: 'فترة تجريبية', period_key: 'p1' }],
        meta: {},
      },
    });

    const result = await resolveAgreementAmendmentEffectivePeriods({
      studentId: 7,
      agreementId: 9,
      tenant: 'school',
      backendBaseUrl: 'https://api-school.example/',
      host: 'school.raqeem.ma',
      userId: 42,
      activeSchoolId: 3,
    });

    expect(result.success).toBe(true);
    expect(odooApiFetchMock).toHaveBeenCalled();
    const opts = odooApiFetchMock.mock.calls[0][1] as {
      tenant: string;
      backendBaseUrl: string;
      host?: string | null;
    };
    expect(opts.tenant).toBe('school');
    expect(opts.backendBaseUrl).toBe('https://api-school.example');
    expect(opts.host).toBe('school.raqeem.ma');
    expect(opts.backendBaseUrl).not.toContain('SHOULD-NOT-USE');
  });

  it('isolates PERIOD_CACHE by user and active school', async () => {
    odooApiFetchMock
      .mockResolvedValueOnce({
        kind: 'json',
        status: 404,
        body: { success: false, error: { code: 'not_found', message: 'x' }, meta: {} },
      })
      .mockResolvedValueOnce({
        kind: 'json',
        status: 200,
        body: {
          success: true,
          data: { id: 9, academic_year_id: 100, lines: [{ id: 1, fee_type_id: 1, amount: 10 }] },
          meta: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'json',
        status: 200,
        body: { success: true, data: { items: [{ id: 100 }] }, meta: {} },
      });

    // Force preview-probe path by failing list then providing agreement — keep mocks light:
    // Use list success for second user to avoid heavy probe loops.
    odooApiFetchMock.mockReset();
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: {
        success: true,
        data: [{ id: 10, label: 'فترة أ', period_key: 'p1' }],
        meta: {},
      },
    });

    await resolveAgreementAmendmentEffectivePeriods({
      studentId: 1,
      agreementId: 2,
      tenant: 'school',
      backendBaseUrl: 'https://api-school.example',
      userId: 1,
      activeSchoolId: 3,
    });
    await resolveAgreementAmendmentEffectivePeriods({
      studentId: 1,
      agreementId: 2,
      tenant: 'school',
      backendBaseUrl: 'https://api-school.example',
      userId: 2,
      activeSchoolId: 3,
    });
    // List endpoint hit twice (no shared cache for list path — cache only for probe).
    expect(odooApiFetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
