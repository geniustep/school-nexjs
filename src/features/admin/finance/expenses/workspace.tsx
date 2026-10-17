'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { hasPermission } from '@/lib/permissions/permissions';
import { Card, PageHeader, Badge } from '@/components/ui/primitives';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import type { ApiResponse, Pagination as PageMeta } from '@/types/api';
import { EXPENSE_COPY } from './copy';
import { EXPENSES_BASE as B, creationCurrency, ExpenseAttempt, type ExpenseCurrency, canExpenseAction, expenseCapability, expenseErrorKind, draftPayload, validDraft, type Bootstrap, type Category, type DraftInput, type Expense, type ExpenseState, type Vendor, type EligibleVendor } from './model';
import { expensesReadinessCopy } from '../expenses-readiness-copy';
import './workspace.css';
const STATES: ExpenseState[] = ['draft', 'submitted', 'rejected', 'cancelled'];
const blank = (): DraftInput => ({ description: '', expense_date: new Date().toISOString().slice(0, 10), category_id: 0, amount: '', partner_id: null, beneficiary_label: '' });
type Panel = 'create' | 'details' | 'edit' | 'categories' | 'vendors' | 'readiness' | null;
interface Readiness {
    accounting_checks: {
        school_company: boolean;
        purchase_journal: boolean;
        cash_or_bank_journal: boolean;
    };
}
export function ExpensesWorkspace() {
    const user = useSession();
    const { activeSchoolId, schools } = useAdminSession();
    const { locale, dir } = useLocale();
    const c = EXPENSE_COPY[locale];
    return <ExpenseSchoolWorkspace key={`${activeSchoolId}:${locale}:${user.id}`} user={user} schoolId={activeSchoolId} schoolName={schools.find(s => s.id === activeSchoolId)?.name ?? ''} locale={locale} dir={dir} c={c}/>;
}
function ExpenseSchoolWorkspace({ user, schoolId, schoolName, locale, dir, c }: {
    user: ReturnType<typeof useSession>;
    schoolId: number | null;
    schoolName: string;
    locale: keyof typeof EXPENSE_COPY;
    dir: 'rtl' | 'ltr';
    c: typeof EXPENSE_COPY.ar;
}) {
    const [currency, setCurrency] = useState<ExpenseCurrency | null>(null);
    const [rows, setRows] = useState<Expense[]>([]), [boot, setBoot] = useState<Bootstrap | null>(null), [vendors, setVendors] = useState<Vendor[]>([]), [categories, setCategories] = useState<Category[]>([]);
    const [page, setPage] = useState(1), [meta, setMeta] = useState<PageMeta>(), [status, setStatus] = useState(''), [category, setCategory] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [catParent, setCatParent] = useState(''), [catSequence, setCatSequence] = useState('');
    const [panel, setPanel] = useState<Panel>(null), [selected, setSelected] = useState<Expense | null>(null), [draft, setDraft] = useState<DraftInput>(blank), [labelMode, setLabelMode] = useState(false), [reason, setReason] = useState(''), [action, setAction] = useState<'submit' | 'reject' | 'cancel' | null>(null), [archived, setArchived] = useState(false), [catName, setCatName] = useState(''), [catCode, setCatCode] = useState(''), [catEdit, setCatEdit] = useState<number | null>(null), [readiness, setReadiness] = useState<Readiness | null>(null);
    const [eligible, setEligible] = useState<EligibleVendor[]>([]), [vendorQuery, setVendorQuery] = useState(''), [vendorLoading, setVendorLoading] = useState(false), [vendorSearched, setVendorSearched] = useState(false);
    const vendorGeneration = useRef(0);
    const createAttempt = useRef(new ExpenseAttempt());
    const dialog = useRef<HTMLDialogElement>(null), generation = useRef(0), mounted = useRef(true), locked = useRef(false), retryKey = useRef<{
        payload: string;
        key: string;
    } | null>(null);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
    function message(code: string) { return c[expenseErrorKind(code)]; }
    async function resolve<T>(r: ApiResponse<T>): Promise<T | null> { if (!mounted.current)
        return null; if (!r.success) {
        setError(message(r.error.code));
        return null;
    } return r.data; }
    async function load() { const g = ++generation.current; setLoading(true); setError(''); const [b, r] = await Promise.all([api.get<Bootstrap>(`${B}/bootstrap`), api.get<Expense[]>(B, { page, page_size: 20, approval_state: status, category_id: category })]); if (!mounted.current || g !== generation.current)
        return; setCurrency(b.success && b.data?.school_id === schoolId ? creationCurrency(b.data) : null); if (b.success && b.data?.school_id === schoolId) {
        setBoot(b.data);
        if (panel !== 'categories')
            setCategories(b.data.categories);
    }
    else {
        setBoot(null);
        setError(b.success ? c.forbidden : message(b.error.code));
    } if (r.success) {
        if (r.data.some(e => e.school_id !== schoolId)) {
            setRows([]);
            setError(c.forbidden);
        }
        else {
            setRows(r.data);
            setMeta(r.meta.pagination);
        }
    }
    else {
        setRows([]);
        setError(message(r.error.code));
    } setLoading(false); }
    useEffect(() => { void load(); }, [page, status, category]); // workspace remounts on school/locale/session changes
    useEffect(() => { if (!panel)
        setAction(null); if (panel && !dialog.current?.open) {
        if (window.matchMedia('(max-width:760px)').matches)
            dialog.current?.showModal();
        else
            dialog.current?.show();
    } if (!panel && dialog.current?.open)
        dialog.current.close(); }, [panel]);
    async function openDetails(id: number) { setError(''); const e = await resolve(await api.get<Expense>(`${B}/${id}`)); if (e && e.school_id === schoolId) {
        setSelected(e);
        setPanel('details');
    }
    else if (e)
        setError(c.forbidden); }
    async function openPanel(next: Panel) { setError(''); setNotice(''); setPanel(next); if (next === 'create') {
        setDraft(blank());
        setLabelMode(false);
        retryKey.current = null;
        createAttempt.current.clear();
    } if (next === 'vendors' || next === 'create') {
        const v = await resolve(await api.get<{
            vendors: Vendor[];
        }>(`${B}/vendors/lookup`, { mode: 'linked', limit: 50 }));
        if (v)
            setVendors(v.vendors);
    } if (next === 'readiness' && hasPermission(user, 'finance.view')) {
        setReadiness(null);
        const r = await resolve(await api.get<Readiness>(`${B}/readiness`));
        if (r)
            setReadiness(r);
    } }
    async function searchEligible(e?: FormEvent) {
        e?.preventDefault();
        if (!expenseCapability(user, 'vendors.manage')) return;
        const g = ++vendorGeneration.current;
        setVendorLoading(true); setVendorSearched(false); setEligible([]); setError('');
        try {
            const r = await api.get<{ mode: 'eligible'; vendors: EligibleVendor[] }>(`${B}/vendors/lookup`, { mode: 'eligible', q: vendorQuery.trim(), limit: 50 });
            if (!mounted.current || g !== vendorGeneration.current) return;
            if (r.success && r.data.mode === 'eligible') { setEligible(r.data.vendors); setVendorSearched(true); }
            else setError(r.success ? c.retry : message(r.error.code));
        } finally { if (mounted.current && g === vendorGeneration.current) setVendorLoading(false); }
    }
    async function linkVendor(candidate: EligibleVendor) {
        if (!expenseCapability(user, 'vendors.manage')) return;
        await mutate(() => api.post<Vendor>(`${B}/vendors`, { partner_id: candidate.partner_id }), () => {
            setEligible(items => items.filter(v => v.partner_id !== candidate.partner_id));
            void api.get<{ mode: 'linked'; vendors: Vendor[] }>(`${B}/vendors/lookup`, { mode: 'linked', limit: 50 }).then(r => {
                if (mounted.current && r.success && r.data.mode === 'linked') setVendors(r.data.vendors);
            });
        });
    }
    async function mutate<T>(request: () => Promise<ApiResponse<T>>, done: (data: T) => void) { if (locked.current)
        return; locked.current = true; setBusy(true); setError(''); try {
        const data = await resolve(await request());
        if (data !== null && mounted.current) {
            done(data);
            setNotice(c.success);
            void load();
        }
    }
    finally {
        locked.current = false;
        if (mounted.current)
            setBusy(false);
    } }
    async function save(e: FormEvent) { e.preventDefault(); if (!validDraft(draft)) {
        setError(c.required);
        return;
    } if (panel === 'create' && currency && expenseCapability(user, 'create')) {
        const payload = draftPayload(draft);
        const key = createAttempt.current.key(payload, () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join(''));
        await mutate(() => api.post<Expense>(B, payload, undefined, { 'Idempotency-Key': key }), data => { if (data.school_id !== schoolId) {
            setError(c.forbidden);
            return;
        } createAttempt.current.clear(); setSelected(data); setPanel('details'); });
    }
    else if (panel === 'edit' && selected && canExpenseAction(user, selected, 'edit')) {
        await mutate(() => api.patch<Expense>(`${B}/${selected.id}`, { ...draftPayload(draft), version: selected.version }), data => { setSelected(data); setPanel('details'); });
    } }
    function edit() { if (!selected || !canExpenseAction(user, selected, 'edit'))
        return; setDraft({ description: selected.description, expense_date: selected.expense_date, category_id: selected.category_id, amount: selected.proposed_amount, partner_id: selected.partner_id, beneficiary_label: selected.beneficiary_label ?? '' }); setLabelMode(!selected.partner_id); setPanel('edit'); void api.get<{
        vendors: Vendor[];
    }>(`${B}/vendors/lookup`, { mode: 'linked', limit: 50 }).then(r => { if (mounted.current && r.success)
        setVendors(r.data.vendors); }); }
    async function transition() { if (!selected || !action || !canExpenseAction(user, selected, action) || (action === 'reject' && !reason.trim()))
        return; const payload = JSON.stringify({ id: selected.id, action, reason: action === 'reject' ? reason.trim() : '' }); if (retryKey.current?.payload !== payload)
        retryKey.current = { payload, key: Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('') }; await mutate(() => api.post<Expense>(`${B}/${selected.id}/${action}`, action === 'reject' ? { reason: reason.trim() } : undefined, undefined, { 'Idempotency-Key': retryKey.current!.key }), data => { setSelected(data); setAction(null); setReason(''); retryKey.current = null; }); }
    async function loadCategories(showArchived: boolean) { setArchived(showArchived); const data = await resolve(await api.get<Category[]>(`${B}/categories`, { active: showArchived ? 'false' : 'true' })); if (data)
        setCategories(data); }
    async function saveCategory(e: FormEvent) { e.preventDefault(); if (!catName.trim() || !expenseCapability(user, 'categories.manage'))
        return; await mutate(() => catEdit ? api.patch<Category>(`${B}/categories/${catEdit}`, { name: catName.trim(), code: catCode.trim(), parent_id: catParent ? Number(catParent) : false, ...(catSequence !== '' ? { sequence: Number(catSequence) } : {}) }) : api.post<Category>(`${B}/categories`, { name: catName.trim(), code: catCode.trim(), parent_id: catParent ? Number(catParent) : false, ...(catSequence !== '' ? { sequence: Number(catSequence) } : {}) }), () => { setCatName(''); setCatCode(''); setCatEdit(null); setCatParent(''); setCatSequence(''); void loadCategories(archived); }); }
    const columns: Column<Expense>[] = [{ key: 'reference', header: c.reference, render: e => <button className="expense-link" onClick={() => void openDetails(e.id)} dir="ltr">{e.reference}</button> }, { key: 'description', header: c.description, render: e => <span dir="auto">{e.description}</span> }, { key: 'date', header: c.date, render: e => new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(new Date(`${e.expense_date}T12:00:00Z`)) }, { key: 'category', header: c.category, render: e => boot?.categories.find(x => x.id === e.category_id)?.name ?? c.category }, { key: 'beneficiary', header: c.beneficiary, render: e => <span dir="auto">{e.beneficiary_label ?? vendors.find(v => v.partner_id === e.partner_id)?.name ?? c.vendors}</span> }, { key: 'amount', header: c.amount, render: e => <span dir="auto">{e.proposed_amount} {e.currency.name}</span> }, { key: 'state', header: c.status, render: e => <Badge tone={e.approval_state === 'draft' ? 'blue' : e.approval_state === 'submitted' ? 'amber' : e.approval_state === 'rejected' ? 'red' : 'slate'}>{c[e.approval_state]}</Badge> }];
    const field = (key: keyof DraftInput, value: string | number | null) => setDraft(d => ({ ...d, [key]: value }));
    return <div className="admin-workspace expenses-workspace" dir={dir}>
 <Link href="/admin/finance" className="back-link">{c.back}</Link><PageHeader title={c.title} subtitle={c.subtitle}/>
 <div className="expenses-toolbar"><button className="btn btn--primary" disabled={!boot || !expenseCapability(user, 'create')} onClick={() => void openPanel('create')}>{c.create}</button>{expenseCapability(user, 'categories.manage') && <button className="btn btn--ghost" onClick={() => { void openPanel('categories'); void loadCategories(false); }}>{c.categories}</button>}<button className="btn btn--ghost" onClick={() => void openPanel('vendors')}>{c.vendors}</button>{hasPermission(user, 'finance.view') && <button className="btn btn--ghost" onClick={() => void openPanel('readiness')}>{c.readiness}</button>}</div>
 <div className="expenses-notice"><strong>{c.notice}</strong><span>{c.later}</span></div>
 <div className="expenses-filters"><label>{c.status}<select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">{c.all}</option>{STATES.map(s => <option key={s} value={s}>{c[s]}</option>)}</select></label><label>{c.category}<select className="input" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">{c.all}</option>{boot?.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label><button className="btn btn--ghost" disabled={loading} onClick={() => void load()}>{c.refresh}</button></div>
 {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
 <section aria-label={c.title} aria-busy={loading}>{loading && <p role="status">{c.loading}</p>}{!loading && !error && rows.length === 0 ? <Card><p>{c.empty}</p></Card> : <DataTable columns={columns} rows={rows} rowKey={e => e.id} className="expenses-table"/>}{meta && <Pagination page={page} totalPages={meta.total_pages} total={meta.total} pageSize={meta.page_size} onPage={setPage}/>}</section>
 <dialog ref={dialog} className="expenses-drawer" onKeyDown={e => { if (e.key === 'Escape' && !busy) {
        setPanel(null);
    } }} onCancel={e => { if (busy)
        e.preventDefault();
    else
        setPanel(null); }} aria-labelledby="expense-panel-title"><header><h2 id="expense-panel-title">{panel === 'create' ? c.create : panel === 'edit' ? c.edit : panel === 'categories' ? c.categories : panel === 'vendors' ? c.vendors : panel === 'readiness' ? c.readiness : c.details}</h2><button className="btn btn--ghost" disabled={busy} onClick={() => setPanel(null)}>{c.close}</button></header>
 {error && <><p role="alert" className="form-error">{error}</p>{selected && <button className="btn btn--ghost" onClick={() => void openDetails(selected.id)}>{c.reload}</button>}</>}
 {(panel === 'create' || panel === 'edit') && <form onSubmit={save} className="form-stack">
 <label>{c.description}<textarea className="input" required value={draft.description} onChange={e => field('description', e.target.value)}/></label><label>{c.date}<input type="date" className="input" required value={draft.expense_date} onChange={e => field('expense_date', e.target.value)}/></label><label>{c.category}<select className="input" required value={draft.category_id || ''} onChange={e => field('category_id', Number(e.target.value))}><option value="">{c.select}</option>{boot?.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label><label>{c.amount}<input className="input" inputMode="decimal" required value={draft.amount} onChange={e => field('amount', e.target.value)}/></label><p className="muted">{selected && panel === 'edit' ? selected.currency.name : currency?.name ?? c.currency}</p><label><input type="checkbox" checked={labelMode} onChange={e => { setLabelMode(e.target.checked); field('partner_id', null); }}/>{c.useLabel}</label>{labelMode ? <label>{c.beneficiary}<input className="input" required value={draft.beneficiary_label} onChange={e => field('beneficiary_label', e.target.value)}/></label> : <label>{c.vendors}<select className="input" required value={draft.partner_id ?? ''} onChange={e => field('partner_id', Number(e.target.value) || null)}><option value="">{c.select}</option>{vendors.map(v => <option key={v.partner_id} value={v.partner_id}>{v.name}</option>)}</select></label>}
 {panel === 'create' && !currency && <p role="status" className="expenses-notice">{c.currencyGap}</p>}<button className="btn btn--primary" disabled={busy || (panel === 'create' && !currency)}>{busy ? c.loading : c.save}</button></form>}
 {panel === 'details' && selected && <><Badge tone="blue">{c[selected.approval_state]}</Badge><dl className="expenses-details">{[[c.reference, selected.reference], [c.school, schoolName], [c.description, selected.description], [c.date, selected.expense_date], [c.category, boot?.categories.find(x => x.id === selected.category_id)?.name ?? c.category], [c.beneficiary, selected.beneficiary_label ?? vendors.find(v => v.partner_id === selected.partner_id)?.name ?? c.vendors], [c.amount, `${selected.proposed_amount} ${selected.currency.name}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl><div className="expenses-actions">{canExpenseAction(user, selected, 'edit') && <button className="btn btn--primary" onClick={edit}>{c.edit}</button>}{(['submit', 'reject', 'cancel'] as const).filter(a => canExpenseAction(user, selected, a)).map(a => <button className="btn btn--ghost" key={a} disabled={busy} onClick={() => { setReason(''); retryKey.current = null; setAction(a); }}>{a === 'cancel' ? c.cancelDraft : c[a]}</button>)}<button className="btn btn--ghost" onClick={() => void openDetails(selected.id)}>{c.reload}</button></div></>}
 {panel === 'categories' && <><div className="expenses-toolbar"><button className="btn btn--ghost" onClick={() => void loadCategories(false)}>{c.active}</button><button className="btn btn--ghost" onClick={() => void loadCategories(true)}>{c.archived}</button></div><form onSubmit={saveCategory} className="form-stack"><label>{c.name}<input className="input" required value={catName} onChange={e => setCatName(e.target.value)}/></label><label>{c.code}<input className="input" value={catCode} onChange={e => setCatCode(e.target.value)}/></label><label>{c.parent}<select className="input" value={catParent} onChange={e => setCatParent(e.target.value)}><option value="">{c.select}</option>{boot?.categories.filter(cat => cat.id !== catEdit).map(cat => <option value={cat.id} key={cat.id}>{cat.name}</option>)}</select></label><label>{c.sequence}<input className="input" type="number" step="1" value={catSequence} onChange={e => setCatSequence(e.target.value)}/></label><button className="btn btn--primary" disabled={busy}>{catEdit ? c.confirm : c.add}</button></form><ul className="expenses-category-list">{categories.map(cat => <li key={cat.id}><span>{cat.name}</span><button className="btn btn--ghost" onClick={() => { setCatEdit(cat.id); setCatName(cat.name); setCatCode(cat.code ?? ''); setCatParent(cat.parent_id ? String(cat.parent_id) : ''); setCatSequence(''); }}>{c.edit}</button>{!archived && <button className="btn btn--ghost" disabled={busy} onClick={() => void mutate(() => api.patch<Category>(`${B}/categories/${cat.id}`, { active: false }), () => { void loadCategories(false); })}>{c.archive}</button>}</li>)}</ul></>}
 {panel === 'vendors' && <><p>{c.vendorHint}</p><ul>{vendors.map(v => <li dir="auto" key={v.link_id}>{v.name}</li>)}</ul>{expenseCapability(user, 'vendors.manage') && <section aria-label={c.linkVendor}><h3>{c.linkVendor}</h3><form className="form-stack" onSubmit={searchEligible}><label>{c.vendorSearch}<input className="input" value={vendorQuery} onChange={e => { setVendorQuery(e.target.value); vendorGeneration.current++; setVendorLoading(false); setEligible([]); setVendorSearched(false); }}/></label><button className="btn btn--ghost" disabled={vendorLoading || busy}>{vendorLoading ? c.loading : c.search}</button></form><ul className="expenses-category-list">{eligible.map(v => <li key={v.partner_id}><span dir="auto">{v.name}</span><button className="btn btn--primary" disabled={busy} onClick={() => void linkVendor(v)}>{c.linkVendor}</button></li>)}</ul>{vendorSearched && eligible.length === 0 && <p role="status">{c.noVendors}</p>}</section>}</>}
 {panel === 'readiness' && <>{!readiness ? <p>{c.loading}</p> : <dl className="expenses-details">{(['school_company', 'purchase_journal', 'cash_or_bank_journal'] as const).map((key, i) => <div key={key}><dt>{[expensesReadinessCopy(locale).company, expensesReadinessCopy(locale).purchase, expensesReadinessCopy(locale).payment][i]}</dt><dd>{readiness.accounting_checks[key] ? expensesReadinessCopy(locale).present : expensesReadinessCopy(locale).absent}</dd></div>)}</dl>}<p>{c.later}</p></>}
 {action && <section className="expenses-confirm" aria-label={c.confirm}><h3>{action === 'cancel' ? c.cancelDraft : action === 'reject' ? c.reject : c.submit}</h3><p>{c.confirmBody}</p>{action === 'reject' && <label>{c.reason}<textarea className="input" value={reason} onChange={e => setReason(e.target.value)}/></label>}<div className="expenses-toolbar"><button className="btn btn--primary" disabled={busy || (action === 'reject' && !reason.trim())} onClick={() => void transition()}>{c.confirm}</button><button className="btn btn--ghost" disabled={busy} onClick={() => setAction(null)}>{c.cancel}</button></div></section>}
 </dialog>
 </div>;
}
