'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import type { ListParams } from '@/types/api';

type Category = 'all' | 'guardian' | 'teacher' | 'staff';
type AccountStatus = '' | 'active' | 'inactive' | 'suspended' | 'no_account';
type ActivityState = '' | 'authenticated' | 'never_authenticated' | 'no_account';
type Row = {
  entry_key: string;
  user_categories: Category[];
  person: { display_name: string; guardian_id: number | null; teacher_id: number | null };
  account: { status: string; login?: string | null };
  activity: { activity_state: string; last_authenticated_at: string | null; activity_confidence?: string | null };
};

const words = {
  ar: {
    title: 'نشاط الحسابات', subtitle: 'آخر تسجيل دخول موثّق، وليس آخر استعمال فعلي للتطبيق',
    name: 'المستخدم', category: 'الفئة', account: 'حالة الحساب', activity: 'تسجيل الدخول', last: 'آخر تسجيل دخول',
    search: 'بحث بالاسم أو معرّف الدخول', all: 'جميع الفئات', guardian: 'أولياء الأمور', teacher: 'الأساتذة', staff: 'الطاقم',
    allAccounts: 'جميع حالات الحساب', active: 'نشط', inactive: 'غير نشط', suspended: 'معلّق', no_account: 'دون حساب',
    allActivities: 'جميع حالات الدخول', authenticated: 'سجّل الدخول', never_authenticated: 'لم يسبق له الدخول',
    empty: 'لا توجد نتائج مطابقة', unknown: 'غير متوفر', reset: 'مسح الفلاتر',
    note: 'هذه البيانات تستند إلى المصادقة فقط. قد ينتمي الحساب الواحد إلى أكثر من فئة.',
  },
  fr: {
    title: 'Activité des comptes', subtitle: 'Dernière connexion authentifiée, pas la dernière utilisation de l’application',
    name: 'Utilisateur', category: 'Profil', account: 'État du compte', activity: 'Connexion', last: 'Dernière connexion',
    search: 'Nom ou identifiant', all: 'Tous les profils', guardian: 'Parents', teacher: 'Enseignants', staff: 'Personnel',
    allAccounts: 'Tous les états', active: 'Actif', inactive: 'Inactif', suspended: 'Suspendu', no_account: 'Sans compte',
    allActivities: 'Toutes les connexions', authenticated: 'Déjà connecté', never_authenticated: 'Jamais connecté',
    empty: 'Aucun résultat', unknown: 'Indisponible', reset: 'Effacer les filtres',
    note: 'Les données concernent uniquement l’authentification. Un compte peut relever de plusieurs profils.',
  },
} as const;

export default function UserActivityPage() {
  const { locale } = useLocale();
  const t = locale === 'fr' ? words.fr : words.ar;
  const [category, setCategory] = useState<Category>('all');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('');
  const [activityState, setActivityState] = useState<ActivityState>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 350);
  useEffect(() => { setPage(1); }, [category, accountStatus, activityState, debounced]);

  const query = useMemo((): ListParams => ({
    page, limit: 20, user_category: category,
    ...(accountStatus ? { account_status: accountStatus } : {}),
    ...(activityState ? { activity_state: activityState } : {}),
    ...(debounced.trim() ? { search: debounced.trim() } : {}),
  }), [page, category, accountStatus, activityState, debounced]);

  // useAdminResource owns active school scoping; Odoo remains authoritative for RBAC.
  const state = useAdminResource<Row[]>('/admin/user-activity', query, { keepPreviousData: false });
  const pagination = state.meta?.pagination;
  const date = (value: string | null): string => {
    if (!value) return t.unknown;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? t.unknown : new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'ar-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  };
  const labels: Record<string, string> = {
    guardian: t.guardian, teacher: t.teacher, staff: t.staff,
    active: t.active, inactive: t.inactive, suspended: t.suspended, no_account: t.no_account,
    authenticated: t.authenticated, never_authenticated: t.never_authenticated,
  };
  const columns: Column<Row>[] = [
    { key: 'name', header: t.name, render: (r) => {
      const href = r.person.guardian_id && r.user_categories.includes('guardian')
        ? '/admin/parents/' + r.person.guardian_id
        : r.person.teacher_id && r.user_categories.includes('teacher')
          ? '/admin/teachers/' + r.person.teacher_id : null;
      return <div><strong dir="auto">{href ? <Link href={href}>{r.person.display_name}</Link> : r.person.display_name}</strong>{r.account.login ? <div className="text-muted" dir="auto">{r.account.login}</div> : null}</div>;
    }},
    { key: 'category', header: t.category, render: (r) => <span>{r.user_categories.map(c => labels[c] ?? c).join(' · ')}</span> },
    { key: 'account', header: t.account, render: (r) => <Badge tone={r.account.status === 'active' ? 'blue' : r.account.status === 'suspended' ? 'amber' : 'slate'}>{labels[r.account.status] ?? t.unknown}</Badge> },
    { key: 'activity', header: t.activity, render: (r) => <span>{labels[r.activity.activity_state] ?? t.unknown}</span> },
    { key: 'last', header: t.last, render: (r) => <time dateTime={r.activity.last_authenticated_at ?? undefined}>{date(r.activity.last_authenticated_at)}</time> },
  ];
  const reset = () => { setCategory('all'); setAccountStatus(''); setActivityState(''); setSearch(''); setPage(1); };

  return <div className="admin-workspace">
    <PageHeader title={t.title} subtitle={t.subtitle} />
    <div className="toolbar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} aria-label={t.search} />
      <select className="input" value={category} onChange={e => setCategory(e.target.value as Category)} aria-label={t.category}>
        <option value="all">{t.all}</option><option value="guardian">{t.guardian}</option><option value="teacher">{t.teacher}</option><option value="staff">{t.staff}</option>
      </select>
      <select className="input" value={accountStatus} onChange={e => setAccountStatus(e.target.value as AccountStatus)} aria-label={t.account}>
        <option value="">{t.allAccounts}</option><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option><option value="suspended">{t.suspended}</option><option value="no_account">{t.no_account}</option>
      </select>
      <select className="input" value={activityState} onChange={e => setActivityState(e.target.value as ActivityState)} aria-label={t.activity}>
        <option value="">{t.allActivities}</option><option value="authenticated">{t.authenticated}</option><option value="never_authenticated">{t.never_authenticated}</option><option value="no_account">{t.no_account}</option>
      </select>
      <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>{t.reset}</button>
    </div>
    <p className="text-muted" style={{ marginBlock: '0.75rem' }}>{t.note}</p>
    <ResourceView state={state} isEmpty={r => r.length === 0} empty={<EmptyState title={t.empty} />}>
      {rows => <><DataTable columns={columns} rows={rows} rowKey={r => r.entry_key} />{pagination ? <Pagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} pageSize={20} onPage={setPage} /> : null}</>}
    </ResourceView>
  </div>;
}
