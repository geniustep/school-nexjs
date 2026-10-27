// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ExpensesWorkspace } from './workspace';
import type { Expense } from './model';
const fixture = vi.hoisted(() => ({ grants: [] as string[], gate: false, record: null as Expense | null, get: vi.fn(), post: vi.fn() }));
vi.mock('@/features/auth/session-context', () => ({ useSession: () => ({ id: 21, role: 'admin', permissions: [], effective_capabilities: ['finance.expenses.view', ...fixture.grants] }) }));
vi.mock('@/features/auth/admin-session-context', () => ({ useAdminSession: () => ({ activeSchoolId: 3, schools: [{ id: 3, name: 'School' }] }) }));
vi.mock('@/features/i18n/locale-context', () => ({ useLocale: () => ({ locale: 'ar', dir: 'rtl' }) }));
vi.mock('@/lib/api/client', () => ({ api: { get: fixture.get, post: fixture.post } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
const ok = (data: unknown) => ({ success: true, data, meta: { pagination: { total_pages: 1, total: 1, page_size: 20 } } });
const record = (state: Expense['approval_state'], actions: string[]): Expense => ({
  id: 79, reference: 'EXP/000079', school_id: 3, description: 'أوراق', expense_date: '2026-10-27', category_id: 1,
  partner_id: null, beneficiary_label: 'مكتبة', proposed_amount: '500.000000', currency: { id: 1, name: 'MAD' },
  approval_state: state, version: 1, allowed_actions: actions,
});
beforeEach(() => {
  fixture.grants = []; fixture.gate = false; fixture.record = record('draft', ['view']);
  fixture.get.mockReset(); fixture.post.mockReset();
  HTMLDialogElement.prototype.show = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  fixture.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/bootstrap')) return ok({ school_id: 3, approval_operational_enabled: fixture.gate, currency: { id: 1, name: 'MAD' }, categories: [{ id: 1, name: 'قرطاسية' }] });
    if (path === '/admin/finance/expenses') return ok([fixture.record]);
    if (path === '/admin/finance/expenses/79') return ok(fixture.record);
    return ok([]);
  });
});
afterEach(cleanup);
describe('Expenses V408 actions on the actual workspace', () => {
  it('displays a clear primary submit action without a yellow banner', async () => {
    fixture.grants = ['finance.expenses.submit', 'finance.expenses.edit_draft'];
    fixture.record = record('draft', ['view', 'submit', 'edit']);
    render(<ExpensesWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'EXP/000079' }));
    const submit = await screen.findByRole('button', { name: 'إرسال للمراجعة' });
    expect(submit.className).toContain('expenses-action-primary');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    expect(document.querySelector('.expenses-notice')).toBeNull();
    expect(screen.getAllByText('500,00 MAD').length).toBeGreaterThan(0);
  });
  it('shows approval only when both the capability and backend allowed_actions permit it', async () => {
    fixture.grants = ['finance.expenses.approve', 'finance.expenses.reject'];
    fixture.gate = true; fixture.record = record('submitted', ['view', 'approve', 'reject']);
    render(<ExpensesWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'EXP/000079' }));
    const approve = await screen.findByRole('button', { name: 'المصادقة على المصروف' });
    expect(approve.className).toContain('expenses-action-primary');
    fireEvent.click(approve);
    expect(await screen.findByRole('button', { name: 'تأكيد' })).toBeTruthy();
  });
  it('does not expose approval while the backend gate is closed', async () => {
    fixture.grants = ['finance.expenses.approve'];
    fixture.record = record('submitted', ['view']);
    render(<ExpensesWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'EXP/000079' }));
    await screen.findByText('المصادقة غير مفعّلة لهذه المؤسسة.');
    expect(screen.queryByRole('button', { name: 'المصادقة على المصروف' })).toBeNull();
  });
});
