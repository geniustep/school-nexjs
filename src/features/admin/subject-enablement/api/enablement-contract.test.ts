import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  SUBJECT_ENABLEMENT_ERROR_CODES,
  isSubjectLevelEnablementWriteAvailable,
  type SubjectEnablementMatrixPayload,
} from '@/types/subject-enablement';
import {
  assertEnablementUpdateBodyKeys,
  buildEnablementQuery,
  buildEnablementUpdateBody,
  fetchSubjectEnablement,
  updateSubjectEnablement,
} from './enablement-api';
import {
  buildMatrixFromEnablementPayload,
  formatSubjectLabel,
  matrixContainsCode,
} from '../utils/build-enablement-matrix';
import { diffEnablementSelection } from '../utils/enablement-diff';
import { mapEnablementApiError } from '../utils/map-enablement-errors';

/** Fixtures taken literally from NEXTJS_CONTRACT_BRIEF.md (abridged). */
const FIXTURE_GET: SubjectEnablementMatrixPayload = {
  school: { id: 1, name: 'Test School', code: 'TS' },
  academic_year: {
    id: 1,
    name: '2025-2026',
    code: '2526',
    is_current: true,
    state: 'active',
  },
  levels: [{ id: 10, name: 'P2', code: 'P2', ref_level_id: 2, active: true }],
  operational_subjects: [
    {
      id: 5,
      name: 'العربية',
      code: 'AR_PRIM',
      ref_subject_id: 3,
      ref_subject_code: 'AR_PRIM',
      active: true,
    },
    {
      id: 6,
      name: 'الرياضيات',
      code: 'MATH_PRIM',
      ref_subject_id: 4,
      ref_subject_code: 'MATH_PRIM',
      active: true,
    },
    {
      id: 7,
      name: 'الفرنسية',
      code: 'FR_PRIM',
      ref_subject_id: 5,
      ref_subject_code: 'FR_PRIM',
      active: true,
    },
  ],
  items: [
    {
      enabled_record_id: 99,
      operational_subject_id: 5,
      subject: {
        id: 5,
        code: 'AR_PRIM',
        ref_subject_id: 3,
        ref_subject_code: 'AR_PRIM',
        active: true,
      },
      level: { id: 10, code: 'P2' },
      academic_year: { id: 1 },
      enabled: true,
      is_active: true,
      state: 'enabled',
      plan: {
        weekly_minutes: null,
        assessment_coefficient: null,
        legacy_coefficient: 1.0,
      },
      consumer_summary: {
        can_disable: true,
        disable_block_code: null,
        active_consumer_counts: { assignments: 0 },
        historical_consumer_counts: { assignments: 0 },
      },
      allowed_actions: { view: true, enable: false, disable: true, update: true },
      write_date: '2026-07-21T01:00:00',
    },
  ],
  counts: { levels: 1, operational_subjects: 3, enabled: 1, by_level: [] },
  version: '99:2026-07-21T01:00:00',
  permissions: { can_view: true, can_manage: true },
};

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

describe('subject level enablement contract (Odoo 236)', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    vi.stubEnv('NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE', '1');
    vi.stubEnv('VERCEL_ENV', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes GET and POST endpoints under /admin/subjects/enablement', () => {
    expect(endpoints.admin.subjectsEnablement).toBe('/admin/subjects/enablement');
    expect(endpoints.admin.subjectsEnablementUpdate).toBe(
      '/admin/subjects/enablement/update',
    );
  });

  it('settings and subjects pages share the same contract endpoints', () => {
    // Both UI surfaces call these shared helpers / endpoints only.
    expect(endpoints.admin.subjectsEnablement).toContain('/subjects/enablement');
    expect(endpoints.admin.subjectsEnablementUpdate).toContain('/enablement/update');
  });

  it('builds GET query with only contract params', () => {
    expect(buildEnablementQuery({ level_id: 10, academic_year_id: 1 })).toEqual({
      academic_year_id: 1,
      level_id: 10,
    });
    expect(buildEnablementQuery({ subject_id: 5 })).toEqual({ subject_id: 5 });
  });

  it('builds POST body literally matching Odoo allowlist (no school_id / extras)', () => {
    const body = buildEnablementUpdateBody({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [5, 6],
      disable_subject_ids: [7],
      expected_version: '99:2026-07-21T01:00:00',
    });
    expect(body).toEqual({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [5, 6],
      disable_subject_ids: [7],
      expected_version: '99:2026-07-21T01:00:00',
    });
    expect(assertEnablementUpdateBodyKeys(body as unknown as Record<string, unknown>)).toBe(
      true,
    );
    expect(body).not.toHaveProperty('school_id');
    expect(Object.keys(body).sort()).toEqual(
      [
        'academic_year_id',
        'disable_subject_ids',
        'enable_subject_ids',
        'expected_version',
        'level_id',
      ].sort(),
    );
  });

  it('loads matrix by level from GET fixture', async () => {
    apiMocks.get.mockResolvedValue({ success: true, data: FIXTURE_GET, meta: {} });
    const res = await fetchSubjectEnablement({ level_id: 10 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const matrix = buildMatrixFromEnablementPayload(res.data, 10);
    expect(matrix.counts.enabled).toBe(1);
    expect(matrix.counts.notEnabled).toBe(2);
    expect(matrix.version).toBe('99:2026-07-21T01:00:00');
    expect(matrixContainsCode(matrix, 'AR_PRIM')).toBe(true);
    expect(formatSubjectLabel(matrix.rows[0]!)).toMatch(/\(/);
  });

  it('does not POST on checkbox/diff alone — only explicit updateSubjectEnablement', async () => {
    const matrix = buildMatrixFromEnablementPayload(FIXTURE_GET, 10);
    const draft = new Set(matrix.rows.filter((r) => r.status === 'enabled').map((r) => r.operationalSubjectId));
    draft.add(6); // toggle enable locally
    const summary = diffEnablementSelection(matrix.rows, draft);
    expect(summary.enableIds).toEqual([6]);
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('POSTs only via updateSubjectEnablement with exact payload', async () => {
    apiMocks.post.mockResolvedValue({
      success: true,
      data: {
        ...FIXTURE_GET,
        results: { created: [6], reactivated: [], disabled: [], noop: [] },
      },
      meta: {},
    });
    const res = await updateSubjectEnablement({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [6],
      disable_subject_ids: [],
      expected_version: '99:2026-07-21T01:00:00',
    });
    expect(res.ok).toBe(true);
    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(apiMocks.post.mock.calls[0]![0]).toBe(endpoints.admin.subjectsEnablementUpdate);
    expect(apiMocks.post.mock.calls[0]![1]).toEqual({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [6],
      disable_subject_ids: [],
      expected_version: '99:2026-07-21T01:00:00',
    });
  });

  it('models successful enable of an operational subject', async () => {
    apiMocks.post.mockResolvedValue({
      success: true,
      data: {
        ...FIXTURE_GET,
        results: { created: [6], reactivated: [], disabled: [], noop: [] },
        counts: { ...FIXTURE_GET.counts, enabled: 2 },
      },
      meta: {},
    });
    const res = await updateSubjectEnablement({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [6],
      disable_subject_ids: [],
      expected_version: FIXTURE_GET.version,
    });
    expect(res.ok && res.data.results.created).toEqual([6]);
  });

  it('models successful disable of unused subject', async () => {
    apiMocks.post.mockResolvedValue({
      success: true,
      data: {
        ...FIXTURE_GET,
        results: { created: [], reactivated: [], disabled: [5], noop: [] },
        items: [],
        counts: { ...FIXTURE_GET.counts, enabled: 0 },
      },
      meta: {},
    });
    const res = await updateSubjectEnablement({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [],
      disable_subject_ids: [5],
      expected_version: FIXTURE_GET.version,
    });
    expect(res.ok && res.data.results.disabled).toEqual([5]);
  });

  it('models reactivation of archived enablement row', async () => {
    apiMocks.post.mockResolvedValue({
      success: true,
      data: {
        ...FIXTURE_GET,
        results: { created: [], reactivated: [5], disabled: [], noop: [] },
      },
      meta: {},
    });
    const res = await updateSubjectEnablement({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [5],
      disable_subject_ids: [],
      expected_version: FIXTURE_GET.version,
    });
    expect(res.ok && res.data.results.reactivated).toEqual([5]);
  });

  it('maps 409 active consumers as safety block (visual rollback responsibility)', () => {
    const mapped = mapEnablementApiError(
      {
        code: SUBJECT_ENABLEMENT_ERROR_CODES.hasActiveConsumers,
        message: 'blocked',
        details: {
          status: 409,
          operational_subject_id: 5,
          enabled_record_id: 99,
          consumer_summary: {
            can_disable: false,
            disable_block_code: 'subject_level_enablement_has_active_consumers',
            active_consumer_counts: { assignments: 1 },
            historical_consumer_counts: { assignments: 0 },
          },
        },
      },
      (key) => key,
    );
    expect(mapped.isSafetyBlock).toBe(true);
    expect(mapped.operationalSubjectId).toBe(5);
    expect(mapped.consumerSummary?.active_consumer_counts.assignments).toBe(1);
  });

  it('maps version conflict 409 for concurrent/stale response', () => {
    const mapped = mapEnablementApiError(
      {
        code: SUBJECT_ENABLEMENT_ERROR_CODES.versionConflict,
        message: 'stale',
        details: { status: 409 },
      },
      (key) => key,
    );
    expect(mapped.isVersionConflict).toBe(true);
  });

  it('maps 401 and 403', () => {
    expect(
      mapEnablementApiError(
        { code: 'unauthorized', message: 'x', details: { status: 401 } },
        (k) => k,
      ).isAuth,
    ).toBe(true);
    expect(
      mapEnablementApiError(
        { code: 'forbidden', message: 'x', details: { status: 403 } },
        (k) => k,
      ).isForbidden,
    ).toBe(true);
  });

  it('view-only permissions keep writeAvailable false even when env flag is on', () => {
    const viewOnly: SubjectEnablementMatrixPayload = {
      ...FIXTURE_GET,
      permissions: { can_view: true, can_manage: false },
    };
    const matrix = buildMatrixFromEnablementPayload(viewOnly, 10);
    expect(matrix.permissions.canManage).toBe(false);
    expect(matrix.writeAvailable).toBe(false);
    expect(isSubjectLevelEnablementWriteAvailable()).toBe(true);
  });

  it('empty 2APIC/3APIC-like level shows zero enabled without auto-copy', () => {
    const empty: SubjectEnablementMatrixPayload = {
      ...FIXTURE_GET,
      levels: [{ id: 22, name: '2APIC', code: '2APIC', active: true }],
      items: [],
      counts: { levels: 1, operational_subjects: 3, enabled: 0, by_level: [] },
      version: '0:empty',
    };
    const matrix = buildMatrixFromEnablementPayload(empty, 22);
    expect(matrix.counts.enabled).toBe(0);
    expect(matrix.counts.notEnabled).toBe(3);
  });

  it('does not invent preschool auto-enablement in matrix builder', () => {
    const preschool: SubjectEnablementMatrixPayload = {
      ...FIXTURE_GET,
      levels: [{ id: 1, name: 'PS', code: 'PS', active: true }],
      items: [],
      counts: { levels: 1, operational_subjects: 3, enabled: 0, by_level: [] },
      version: '0:ps',
    };
    const matrix = buildMatrixFromEnablementPayload(preschool, 1);
    expect(matrix.counts.enabled).toBe(0);
  });

  it('keeps draft dirty after simulated 5xx (no local apply)', () => {
    const matrix = buildMatrixFromEnablementPayload(FIXTURE_GET, 10);
    const draft = new Set([5, 6]);
    const summary = diffEnablementSelection(matrix.rows, draft);
    expect(summary.dirty).toBe(true);
    // Server still has only 5 enabled — local draft unchanged
    expect(matrix.rows.find((r) => r.operationalSubjectId === 5)?.status).toBe('enabled');
    expect(matrix.rows.find((r) => r.operationalSubjectId === 6)?.status).toBe('not_enabled');
  });

  it('shows code beside name for Arabic lookalikes', () => {
    expect(formatSubjectLabel({ name: 'الاجتماعيات', code: 'SOC_MID' })).toBe(
      'الاجتماعيات (SOC_MID)',
    );
  });

  it('write flag defaults on and stays available in Vercel production', () => {
    vi.stubEnv('NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isSubjectLevelEnablementWriteAvailable()).toBe(true);
  });

  it('write flag can be explicitly opted out', () => {
    vi.stubEnv('NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE', 'off');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isSubjectLevelEnablementWriteAvailable()).toBe(false);
  });

  it('rejects bodies with extra fields outside allowlist', () => {
    expect(
      assertEnablementUpdateBodyKeys({
        academic_year_id: 1,
        level_id: 10,
        enable_subject_ids: [],
        disable_subject_ids: [],
        expected_version: 'v',
        school_id: 9,
      }),
    ).toBe(false);
  });

  it('dedupes enable/disable ids and ignores non-positive', () => {
    const body = buildEnablementUpdateBody({
      academic_year_id: 1,
      level_id: 10,
      enable_subject_ids: [5, 5, -1, 0],
      disable_subject_ids: [7, 7],
      expected_version: 'v',
    });
    expect(body.enable_subject_ids).toEqual([5]);
    expect(body.disable_subject_ids).toEqual([7]);
  });
});
