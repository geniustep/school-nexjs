import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildBffProxyPath,
  buildOdooApiUrl,
  normalizeOdooApiPath,
} from '@/lib/api/build-odoo-api-url';

const ODOO_BASE = 'https://app.propanel.ma';
const API_PREFIX = '/api/v1';
const STUDENT_ID = 854;
const PLAN_ID = 2589;
const SCHOOL_ID = 3;

describe('finance official contracts — BFF path mapping', () => {
  const overviewPath = endpoints.admin.financeStudentFinancialOverview(STUDENT_ID);
  const collectiblePath = endpoints.admin.financeStudentCollectibleItems(STUDENT_ID);
  const batchPath = endpoints.admin.financeFeePlanAssignedStudentsFinancialSummary(PLAN_ID);
  const agreementPath = endpoints.admin.financeStudentAgreementFromCurrentFees(STUDENT_ID);

  it('Financial Overview builds the correct Odoo path', () => {
    expect(overviewPath).toBe(`/admin/finance/students/${STUDENT_ID}/financial-overview`);
    expect(overviewPath).not.toContain('financial_overview');
    expect(overviewPath).not.toContain('/admin/students/');
  });

  it('Collectible Items builds the correct Odoo path', () => {
    expect(collectiblePath).toBe(`/admin/finance/students/${STUDENT_ID}/collectible-items`);
  });

  it('Assigned Students Financial Summary builds the correct Odoo path', () => {
    expect(batchPath).toBe(
      `/admin/finance/fee-plans/${PLAN_ID}/assigned-students-financial-summary`,
    );
  });

  it('Agreement From Current Fees builds the correct Odoo path', () => {
    expect(agreementPath).toBe(
      `/admin/finance/students/${STUDENT_ID}/agreements/from-current-fees`,
    );
  });

  it('includes /api/v1 exactly once in the final Odoo URL', () => {
    const url = buildOdooApiUrl(ODOO_BASE, API_PREFIX, overviewPath, {
      active_school_id: SCHOOL_ID,
    });
    expect(url).toBe(
      `${ODOO_BASE}/api/v1/admin/finance/students/${STUDENT_ID}/financial-overview?active_school_id=${SCHOOL_ID}`,
    );
    expect(url.match(/\/api\/v1/g)?.length).toBe(1);
  });

  it('forwards active_school_id and preserves extra query parameters', () => {
    const url = buildOdooApiUrl(ODOO_BASE, API_PREFIX, collectiblePath, {
      active_school_id: SCHOOL_ID,
      academic_year_id: 1,
      status: 'due',
      fee_type_id: 12,
      page: 2,
      page_size: 25,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('active_school_id')).toBe(String(SCHOOL_ID));
    expect(parsed.searchParams.get('academic_year_id')).toBe('1');
    expect(parsed.searchParams.get('status')).toBe('due');
    expect(parsed.searchParams.get('fee_type_id')).toBe('12');
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('page_size')).toBe('25');
  });

  it('batch summary URL keeps search and class filters', () => {
    const url = buildOdooApiUrl(ODOO_BASE, API_PREFIX, batchPath, {
      active_school_id: SCHOOL_ID,
      search: 'عبد',
      level_id: 4,
      class_id: 9,
      page: 1,
      page_size: 10,
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(
      `/api/v1/admin/finance/fee-plans/${PLAN_ID}/assigned-students-financial-summary`,
    );
    expect(parsed.searchParams.get('search')).toBe('عبد');
    expect(parsed.searchParams.get('level_id')).toBe('4');
    expect(parsed.searchParams.get('class_id')).toBe('9');
  });

  it('does not strip /api/v1 when path already contains it', () => {
    const url = buildOdooApiUrl(ODOO_BASE, API_PREFIX, `/api/v1${overviewPath}`, {
      active_school_id: SCHOOL_ID,
    });
    expect(url.match(/\/api\/v1/g)?.length).toBe(1);
    expect(url).toContain('/financial-overview');
    expect(url).not.toContain('financial_overview');
  });

  it('normalizes paths without a leading slash', () => {
    expect(normalizeOdooApiPath(`admin/finance/students/${STUDENT_ID}/financial-overview`)).toBe(
      overviewPath,
    );
  });

  it('BFF proxy path matches browser route segments', () => {
    const segments = overviewPath.slice(1).split('/');
    expect(buildBffProxyPath(segments)).toBe(overviewPath);
    expect(buildBffProxyPath(['admin', 'finance', 'students', '854', 'financial-overview'])).toBe(
      overviewPath,
    );
  });

  it('does not use legacy /admin/students/{id}/finance paths', () => {
    for (const path of [overviewPath, collectiblePath, agreementPath, batchPath]) {
      expect(path).not.toMatch(/\/admin\/students\/\d+\/finance\//);
    }
  });

  it('agreement POST path is not confused with GET overview', () => {
    expect(agreementPath).toContain('agreements/from-current-fees');
    expect(agreementPath).not.toContain('financial-overview');
  });
});
