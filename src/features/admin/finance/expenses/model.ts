import type { CurrentUser } from '@/types/user';
export const EXPENSES_BASE = '/admin/finance/expenses';
export type ExpenseState = 'draft' | 'submitted' | 'rejected' | 'cancelled';
export interface Category {
    id: number;
    name: string;
    code?: string | null;
    parent_id?: number | null;
    active?: boolean;
}
export interface EligibleVendor {
    partner_id: number;
    name: string;
}
export interface Vendor extends EligibleVendor {
    link_id: number;
    partner_id: number;
    name: string;
}
export interface Expense {
    id: number;
    reference: string;
    school_id: number;
    description: string;
    expense_date: string;
    category_id: number;
    partner_id: number | null;
    beneficiary_label: string | null;
    proposed_amount: string;
    currency: {
        id: number;
        name: string;
    };
    approval_state: ExpenseState;
    version: number;
    allowed_actions: string[];
}
export interface Bootstrap {
    contract_version: 'expenses-draft-v1';
    school_id: number;
    categories: Category[];
    cost_centers_available: false;
    currency: ExpenseCurrency;
}
export interface DraftInput {
    description: string;
    expense_date: string;
    category_id: number;
    amount: string;
    partner_id: number | null;
    beneficiary_label: string;
}
// Expenses grants must be explicit in the current session. No role/full-school inference.
export function expenseCapability(user: CurrentUser, action: string): boolean {
    return user.role === 'admin' && (user.effective_capabilities?.includes(`finance.expenses.${action}`) === true || user.effective_permissions?.some(p => p === `finance.expenses.${action}`) === true);
}
export function canExpenseAction(user: CurrentUser, expense: Expense, action: 'edit' | 'submit' | 'cancel' | 'reject'): boolean {
    const capability = action === 'edit' ? 'edit_draft' : action;
    return expenseCapability(user, capability) && expense.allowed_actions.includes(action) && expense.approval_state === (action === 'reject' ? 'submitted' : 'draft');
}
export function validDraft(input: DraftInput): boolean {
    return Boolean(input.description.trim() && /^\d{4}-\d{2}-\d{2}$/.test(input.expense_date) && input.category_id > 0 && /^(?:\d+)(?:\.\d+)?$/.test(input.amount) && Number.isFinite(Number(input.amount)) && Number(input.amount) > 0 && (input.partner_id || input.beneficiary_label.trim()));
}
export function draftPayload(input: DraftInput) {
    return { description: input.description.trim(), expense_date: input.expense_date, category_id: input.category_id, amount: input.amount, partner_id: input.partner_id, beneficiary_label: input.partner_id ? '' : input.beneficiary_label.trim() };
}
export function expenseErrorKind(code: string): 'stale' | 'forbidden' | 'invalid' | 'missing' | 'retry' {
    if (code === 'stale_version')
        return 'stale';
    if (['unauthenticated', 'forbidden', 'permission_denied', 'capability_missing'].includes(code))
        return 'forbidden';
    if (['not_found', 'expense_not_found'].includes(code))
        return 'missing';
    if (['validation_error', 'invalid_amount', 'category_archived', 'partner_not_in_school_scope', 'duplicate_record', 'client_field_not_allowed', 'invalid_state_transition', 'idempotency_conflict'].includes(code))
        return 'invalid';
    return 'retry';
}
export interface ExpenseCurrency {
    id: number;
    name: string;
    symbol?: string;
    decimal_places?: number;
}
export function creationCurrency(data: unknown): ExpenseCurrency | null {
    if (!data || typeof data !== 'object' || !('currency' in data)) return null;
    const currency = data.currency;
    if (!currency || typeof currency !== 'object' || !('id' in currency) || !('name' in currency) || !Number.isSafeInteger(currency.id) || typeof currency.id !== 'number' || currency.id <= 0 || typeof currency.name !== 'string' || !/^[A-Z]{3}$/.test(currency.name)) return null;
    return { id: currency.id, name: currency.name };
}
export class ExpenseAttempt {
    private previous: {
        payload: string;
        key: string;
    } | null = null;
    key(payload: unknown, generate: () => string): string {
        const canonical = JSON.stringify(payload);
        if (this.previous?.payload !== canonical)
            this.previous = { payload: canonical, key: generate() };
        return this.previous!.key;
    }
    clear() { this.previous = null; }
}
