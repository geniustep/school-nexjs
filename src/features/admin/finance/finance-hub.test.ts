import { describe, expect, it } from 'vitest';
import {
  canViewFinanceAgreements,
  canViewFinanceInstallments,
  canViewFinanceServices,
} from '@/lib/permissions/finance';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import {
  appendReturnTo,
  isSafeInternalReturnPath,
  sanitizeReturnTo,
} from '@/lib/utils/safe-return-url';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import type { CurrentUser, Role } from '@/types/user';

const financeUser: CurrentUser = {
  id: 1,
  name: 'QA',
  email: null,
  role: 'admin' as Role,
  permissions: [
    'finance.view',
    'finance.view_student_balance',
    'finance.view_payments',
    'finance.view_cheques',
  ],
  school: null,
};

describe('safe return URL', () => {
  it('accepts internal finance paths only', () => {
    expect(isSafeInternalReturnPath('/admin/finance/agreements')).toBe(true);
    expect(isSafeInternalReturnPath('/admin/students/617?tab=finance')).toBe(true);
    expect(isSafeInternalReturnPath('https://evil.test')).toBe(false);
    expect(isSafeInternalReturnPath('//evil.test/admin')).toBe(false);
  });

  it('falls back for unsafe returnTo', () => {
    expect(sanitizeReturnTo('https://evil.test', '/admin/finance')).toBe('/admin/finance');
    expect(sanitizeReturnTo('/admin/finance/installments', '/admin/finance')).toBe(
      '/admin/finance/installments',
    );
  });

  it('appends encoded returnTo to href', () => {
    expect(appendReturnTo('/admin/finance/collections/new', '/admin/finance')).toContain(
      'returnTo=%2Fadmin%2Ffinance',
    );
  });
});

describe('student finance navigation', () => {
  it('builds student 360 finance links with tab and returnTo', () => {
    expect(buildStudentFinanceLink(617, 'finance', '/admin/finance/agreements')).toBe(
      '/admin/students/617?tab=finance&returnTo=%2Fadmin%2Ffinance%2Fagreements',
    );
    expect(buildStudentFinanceLink(617, 'financial-agreement')).toBe(
      '/admin/students/617?tab=financial-agreement',
    );
  });
});

describe('finance overview normalization', () => {
  it('maps flat overview payload without mixing pending cheques into confirmed paid', () => {
    const overview = normalizeFinanceOverview({
      total_due: 1000,
      confirmed_paid: 200,
      pending_cheques: 300,
      remaining_amount: 800,
      uncovered_amount: 500,
      overdue_amount: 50,
      cheques: { received: 2, bounced: 1 },
    });

    expect(overview?.totals?.total_collected).toBe(200);
    expect(overview?.totals?.cheques_pending_amount).toBe(300);
    expect(overview?.totals?.cheques_pending_count).toBe(2);
    expect(overview?.totals?.cheques_rejected_count).toBe(1);
  });

  it('enriches nested totals with confirmed_paid from root payload', () => {
    const overview = normalizeFinanceOverview({
      confirmed_paid: 1400,
      totals: {
        total_due: 26898,
        total_paid: 1400,
        total_remaining: 25498,
        total_overdue: 50,
      },
    });
    expect(overview?.totals?.total_collected).toBe(1400);
    expect(overview?.totals?.confirmed_paid).toBe(1400);
  });
});

describe('finance hub permissions', () => {
  it('gates hub sections by capabilities not role names', () => {
    expect(canViewFinanceAgreements(financeUser)).toBe(true);
    expect(canViewFinanceInstallments(financeUser)).toBe(true);
    expect(canViewFinanceServices(financeUser)).toBe(true);
    expect(canViewFinanceAgreements({ ...financeUser, permissions: [] })).toBe(false);
  });
});
