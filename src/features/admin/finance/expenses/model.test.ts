import { describe, it, expect } from 'vitest';
import { canExpenseAction, expenseCapability, validDraft, draftPayload, expenseErrorKind, type Expense } from './model';
import { EXPENSE_COPY } from './copy';
import type { CurrentUser } from '@/types/user';
const user: CurrentUser = { id: 1, name: 'Test', email: null, role: 'admin', school: { id: 3, name: 'School' }, permissions: ['finance.view'], admin_kind: 'school_manager', permissions_mode: 'full_school' };
const expense = { approval_state: 'draft', allowed_actions: ['edit', 'submit', 'cancel'] } as Expense;
describe('Expenses explicit capabilities and lifecycle', () => {
    it('never infers expenses grants from manager or finance access', () => expect(expenseCapability(user, 'create')).toBe(false));
    it('fails closed when explicit grants are absent or empty', () => { expect(expenseCapability({ ...user, effective_capabilities: [] }, 'view')).toBe(false); });
    it('requires grant plus server action and valid state', () => { const u = { ...user, effective_capabilities: ['finance.expenses.edit_draft'] }; expect(canExpenseAction(u, expense, 'edit')).toBe(true); expect(canExpenseAction(u, { ...expense, allowed_actions: ['view'] }, 'edit')).toBe(false); expect(canExpenseAction(u, { ...expense, approval_state: 'submitted' }, 'edit')).toBe(false); });
    it('blocks terminal record actions', () => { for (const state of ['cancelled', 'rejected'] as const)
        expect(canExpenseAction({ ...user, effective_capabilities: ['finance.expenses.cancel'] }, { ...expense, approval_state: state }, 'cancel')).toBe(false); });
});
describe('Draft payload and safe messages', () => {
    const input = { description: ' Supplies ', expense_date: '2026-10-16', category_id: 2, amount: '15.50', partner_id: null, beneficiary_label: ' Person ' };
    it('validates amounts and beneficiary', () => { expect(validDraft(input)).toBe(true); for (const amount of ['0', '-1', 'Infinity', 'NaN'])
        expect(validDraft({ ...input, amount })).toBe(false); expect(validDraft({ ...input, beneficiary_label: '' })).toBe(false); });
    it('only sends contract-owned editable fields and preserves decimal string', () => { expect(draftPayload(input)).toEqual({ ...input, description: 'Supplies', beneficiary_label: 'Person' }); expect(draftPayload(input)).not.toHaveProperty('school_id'); expect(draftPayload(input)).not.toHaveProperty('currency_id'); });
    it('maps stale version separately without backend messages', () => { expect(expenseErrorKind('stale_version')).toBe('stale'); expect(expenseErrorKind('category_archived')).toBe('invalid'); expect(expenseErrorKind('unknown')).toBe('retry'); });
    it('has complete branded copy in all four locales', () => { for (const copy of Object.values(EXPENSE_COPY)) {
        expect(Object.keys(copy)).toEqual(Object.keys(EXPENSE_COPY.ar));
        for (const value of Object.values(copy)) {
            expect(value.trim()).not.toBe('');
            expect(value).not.toMatch(/odoo|أودو/i);
        }
    } });
});
import { creationCurrency, ExpenseAttempt } from './model';
describe('Trusted creation context and retries', () => {
    it('accepts the bootstrap currency without requiring general finance access', () => { expect(creationCurrency({ currency: { id: 1, name: 'MAD' } })?.name).toBe('MAD'); for (const data of [null, {}, { currencies: [] }, { currencies: [{ id: 1, name: 'MAD' }, { id: 2, name: 'EUR' }] }, { currency: { name: 'MAD' } }, { currency: { id: 1, name: 'bad' } }, { currency: { id: -1, name: 'MAD' } }])
        expect(creationCurrency(data)).toBeNull(); });
    it('reuses a logical create key on retry but rotates when input changes', () => { const a = new ExpenseAttempt(); let id = 0; const gen = () => String(++id); expect(a.key({ amount: '20' }, gen)).toBe('1'); expect(a.key({ amount: '20' }, gen)).toBe('1'); expect(a.key({ amount: '21' }, gen)).toBe('2'); a.clear(); expect(a.key({ amount: '21' }, gen)).toBe('3'); });
});

describe('V408 approval UX contract', () => {
    it('requires an explicit approve grant, submitted state, and a server-allowed action', () => {
        const submitted = { ...expense, approval_state: 'submitted' as const, allowed_actions: ['view', 'approve'] };
        const approver = { ...user, effective_capabilities: ['finance.expenses.approve'] };
        expect(canExpenseAction(approver, submitted, 'approve')).toBe(true);
        expect(canExpenseAction(user, submitted, 'approve')).toBe(false);
        expect(canExpenseAction(approver, { ...submitted, allowed_actions: ['view'] }, 'approve')).toBe(false);
        expect(canExpenseAction(approver, { ...submitted, approval_state: 'draft' }, 'approve')).toBe(false);
        expect(canExpenseAction(approver, { ...submitted, approval_state: 'approved' }, 'approve')).toBe(false);
    });
    it('provides translated approval states and operational-gate messaging', () => {
        for (const copy of Object.values(EXPENSE_COPY)) {
            expect(copy.approve.trim()).toBeTruthy();
            expect(copy.approved.trim()).toBeTruthy();
            expect(copy.more.trim()).toBeTruthy();
        }
        expect(expenseErrorKind('approval_not_operational')).toBe('invalid');
    });
});
