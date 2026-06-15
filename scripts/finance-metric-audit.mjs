/**
 * Finance dashboard metric audit — no credentials or PII in output.
 * Usage: node scripts/finance-metric-audit.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const base = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const login = process.env.FINANCE_QA_LOGIN ?? 'done';

async function auth() {
  const password = loadAccountPassword(login);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = (typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [])
    .map((raw) => raw.split(';')[0])
    .join('; ');
  return { ok: body.success === true, cookies };
}

async function bffGet(cookies, path, query = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${path}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, { headers: { Cookie: cookies, Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    success: body.success === true,
    data: body.data ?? null,
    meta: body.meta ?? null,
  };
}

function moneyFields(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number' && /amount|paid|due|collected|remaining|overdue|total|confirmed|cleared|pending|rejected/i.test(k)) {
      out[key] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v) && prefix.split('.').length < 2) {
      Object.assign(out, moneyFields(v, key));
    }
  }
  return out;
}

function collectionState(row) {
  return row.state ?? row.status ?? 'unknown';
}

function sumByState(rows) {
  const buckets = {};
  for (const row of rows) {
    const state = collectionState(row);
    const amount = Number(row.amount ?? row.total_amount ?? 0);
    if (!buckets[state]) buckets[state] = { count: 0, amount: 0 };
    buckets[state].count += 1;
    buckets[state].amount += amount;
  }
  return buckets;
}

const session = await auth();
if (!session.ok) {
  console.log(JSON.stringify({ status: 'BLOCKED', reason: 'auth_failed' }, null, 2));
  process.exit(1);
}

const dateFrom = '2026-05-16';
const dateTo = '2026-06-15';

const overview = await bffGet(session.cookies, '/admin/finance/overview');
const collectionsAll = await bffGet(session.cookies, '/admin/finance/payment-collections', {
  date_from: dateFrom,
  date_to: dateTo,
  page: 1,
  page_size: 100,
});
const collectionsConfirmed = await bffGet(session.cookies, '/admin/finance/payment-collections', {
  date_from: dateFrom,
  date_to: dateTo,
  state: 'confirmed',
  page: 1,
  page_size: 100,
});

const rowsAll = Array.isArray(collectionsAll.data) ? collectionsAll.data : [];
const rowsConfirmed = Array.isArray(collectionsConfirmed.data) ? collectionsConfirmed.data : [];
const pagination = collectionsAll.meta?.pagination ?? collectionsAll.meta ?? null;

const audit = {
  status: 'OK',
  base,
  period: { dateFrom, dateTo },
  overviewMoneyFields: moneyFields(overview.data),
  overviewTopLevel: overview.data
    ? {
        total_due: overview.data.total_due ?? overview.data.totals?.total_due,
        total_collected: overview.data.total_collected ?? overview.data.totals?.total_collected,
        confirmed_paid: overview.data.confirmed_paid ?? overview.data.totals?.confirmed_paid,
        total_paid: overview.data.total_paid ?? overview.data.totals?.total_paid,
        total_remaining: overview.data.total_remaining ?? overview.data.totals?.total_remaining,
        total_overdue: overview.data.total_overdue ?? overview.data.totals?.total_overdue,
        total_collected_period:
          overview.data.total_collected_period ?? overview.data.totals?.total_collected_period,
        period_collections_amount:
          overview.data.period_collections_amount ?? overview.data.totals?.period_collections_amount,
      }
    : null,
  reconciliation: {
    settledOnReceivables:
      overview.data?.confirmed_paid ??
      overview.data?.totals?.total_paid ??
      overview.data?.totals?.confirmed_paid ??
      null,
    rawPeriodSumAllStates: rowsAll.reduce((s, r) => s + Number(r.amount ?? r.total_amount ?? 0), 0),
    confirmedPeriodSum: rowsConfirmed.reduce((s, r) => s + Number(r.amount ?? r.total_amount ?? 0), 0),
    collectionRateIfSettled:
      overview.data?.totals?.total_due || overview.data?.total_due
        ? Math.round(
            ((overview.data?.confirmed_paid ??
              overview.data?.totals?.total_paid ??
              0) /
              (overview.data?.totals?.total_due ?? overview.data?.total_due)) *
              1000,
          ) / 10
        : null,
  },
  collectionsPagination: pagination,
  collectionsPageCount: rowsAll.length,
  collectionsByState: sumByState(rowsAll),
  collectionsConfirmedPageCount: rowsConfirmed.length,
  collectionsConfirmedByState: sumByState(rowsConfirmed),
  collectionsRawSumAll: rowsAll.reduce((s, r) => s + Number(r.amount ?? r.total_amount ?? 0), 0),
  collectionsRawSumConfirmed: rowsConfirmed.reduce((s, r) => s + Number(r.amount ?? r.total_amount ?? 0), 0),
  collectionsByMethodAll: rowsAll.reduce((acc, r) => {
    const m = r.payment_method ?? r.method ?? 'unknown';
    acc[m] = (acc[m] ?? 0) + Number(r.amount ?? r.total_amount ?? 0);
    return acc;
  }, {}),
};

console.log(JSON.stringify(audit, null, 2));
