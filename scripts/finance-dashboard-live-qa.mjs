/**
 * Live QA for finance decision dashboard — no secrets in output.
 * Usage: node scripts/finance-dashboard-live-qa.mjs [baseUrl]
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
  return { ok: body.success === true, cookies, role: body.data?.user?.role ?? body.user?.role ?? null };
}

async function bffGet(cookies, path, query = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${path}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, { headers: { Cookie: cookies, Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success === true, data: body.data ?? null };
}

const session = await auth();
const report = { base, login, sessionOk: session.ok, checks: {} };

if (!session.ok) {
  console.log(JSON.stringify({ status: 'BLOCKED', report }, null, 2));
  process.exit(1);
}

const overview = await bffGet(session.cookies, '/admin/finance/overview');
report.checks.overview = {
  ok: overview.success,
  totalDue: overview.data?.total_due ?? overview.data?.totals?.total_due ?? null,
  hasUpcoming: Array.isArray(overview.data?.upcoming_installments) && overview.data.upcoming_installments.length > 0,
};

const collections = await bffGet(session.cookies, '/admin/finance/payment-collections', {
  page_size: 100,
  date_from: '2026-05-16',
  date_to: '2026-06-15',
});
report.checks.collections = {
  ok: collections.success,
  count: Array.isArray(collections.data) ? collections.data.length : 0,
};

const page = await fetch(`${base}/admin/finance`, {
  headers: { Cookie: session.cookies, Accept: 'text/html' },
});
const html = await page.text();
report.checks.page = {
  status: page.status,
  noRecentCollectionsText: !html.includes('recentCollections') && !html.includes('آخر التحصيلات'),
  bundleIncludesNewPage: html.includes('admin/finance/page') || html.includes('finance-hub'),
};

const refresh = await fetch(`${base}/admin/finance`, {
  headers: { Cookie: session.cookies, Accept: 'text/html' },
});
report.checks.sessionRefresh = { status: refresh.status, stillAuthed: !refresh.url.includes('/login') };

const failed = Object.values(report.checks).some((row) => row.ok === false || row.status >= 400);
report.status = failed ? 'FAILED' : 'PASSED';
console.log(JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
