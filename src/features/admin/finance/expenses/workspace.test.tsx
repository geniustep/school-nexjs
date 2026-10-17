// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExpensesWorkspace } from './workspace';
const fixture = vi.hoisted(() => ({ manage: true, get: vi.fn(), post: vi.fn() }));
vi.mock('@/features/auth/session-context', () => ({ useSession: () => ({ id: 1, role: 'admin', permissions: [], effective_capabilities: ['finance.expenses.view', 'finance.expenses.create', ...(fixture.manage ? ['finance.expenses.vendors.manage'] : [])] }) }));
vi.mock('@/features/auth/admin-session-context', () => ({ useAdminSession: () => ({ activeSchoolId: 3, schools: [{ id: 3, name: 'School' }] }) }));
vi.mock('@/features/i18n/locale-context', () => ({ useLocale: () => ({ locale: 'en', dir: 'ltr' }) }));
vi.mock('@/lib/api/client', () => ({ api: { get: fixture.get, post: fixture.post } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
const ok = (data: unknown) => ({ success: true, data, meta: {} });
beforeEach(() => {
    fixture.manage = true;
    fixture.get.mockReset(); fixture.post.mockReset();
    HTMLDialogElement.prototype.show = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    fixture.get.mockImplementation(async (path: string, query?: { mode?: string }) => {
        if (path.endsWith('/bootstrap')) return ok({ school_id: 3, currency: { id: 1, name: 'MAD' }, categories: [] });
        if (path.endsWith('/vendors/lookup')) return ok({ mode: query?.mode, vendors: query?.mode === 'eligible' ? [{ partner_id: 7, name: 'Candidate' }] : [{ link_id: 5, partner_id: 8, name: 'Linked' }] });
        return ok([]);
    });
});
afterEach(cleanup);
describe('Expenses bootstrap and eligible vendor integration', () => {
    it('shows creation currency with expenses access alone and never requests general finance reference data', async () => {
        render(<ExpensesWorkspace />);
        const create = screen.getByRole('button', { name: 'New expense' });
        await waitFor(() => expect((create as HTMLButtonElement).disabled).toBe(false));
        fireEvent.click(create);
        expect(await screen.findByText('MAD')).toBeTruthy();
        expect(fixture.get.mock.calls.some(([path]) => path.includes('reference-data'))).toBe(false);
    });
    it('searches eligible partners and sends only the selected partner ID when linking', async () => {
        fixture.post.mockResolvedValue(ok({ link_id: 6, partner_id: 7, name: 'Candidate' }));
        render(<ExpensesWorkspace />);
        fireEvent.click(screen.getByRole('button', { name: 'Vendors' }));
        await screen.findByText('Linked');
        fireEvent.change(screen.getByLabelText('Vendor name'), { target: { value: 'Can' } });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        await screen.findByText('Candidate');
        expect(fixture.get).toHaveBeenCalledWith('/admin/finance/expenses/vendors/lookup', { mode: 'eligible', q: 'Can', limit: 50 });
        fireEvent.click(screen.getByRole('button', { name: 'Link vendor' }));
        await waitFor(() => expect(fixture.post).toHaveBeenCalledWith('/admin/finance/expenses/vendors', { partner_id: 7 }));
    });
    it('rejects a lookup response without the eligible mode echo', async () => {
        fixture.get.mockImplementation(async (path: string) => path.endsWith('/bootstrap') ? ok({ school_id: 3, currency: { id: 1, name: 'MAD' }, categories: [] }) : path.endsWith('/vendors/lookup') ? ok({ vendors: [{ partner_id: 7, name: 'Unverified' }] }) : ok([]));
        render(<ExpensesWorkspace />);
        fireEvent.click(screen.getByRole('button', { name: 'Vendors' }));
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
        expect(screen.queryByRole('button', { name: 'Link vendor' })).toBeNull();
    });
    it('does not expose eligible search without vendor management capability', async () => {
        fixture.manage = false;
        render(<ExpensesWorkspace />);
        fireEvent.click(screen.getByRole('button', { name: 'Vendors' }));
        await screen.findByText('Linked');
        expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
        expect(fixture.get.mock.calls.some(([, query]) => query?.mode === 'eligible')).toBe(false);
    });
});
