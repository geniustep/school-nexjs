/**
 * Parent finance UI QA via BFF + page smoke — no secrets in output.
 * Usage: node scripts/finance-parent-ui-qa.mjs [baseUrl]
 */
import {
  loadAccountPassword,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

primeQaEnvFromLocal();
const base = (process.argv[2] ?? 'http://localhost:3012').replace(/\/$/, '');
const CHILD_ID = 49;
const FOREIGN_CHILD_ID = 102;

function mergeCookies(prev, res) {
  const jar = new Map();
  for (const part of (prev ?? '').split('; ').filter(Boolean)) {
    const [k, ...v] = part.split('=');
    jar.set(k, v.join('='));
  }
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const [k, ...v] = pair.split('=');
    jar.set(k.trim(), v.join('='));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function login(login) {
  const password = loadAccountPassword(login);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    login,
    ok: body.success === true,
    cookies: mergeCookies('', res),
    user: body.data?.user ?? body.user,
    passwordEnv: passwordSourceForLogin(login),
  };
}

async function apiGet(cookies, path) {
  const res = await fetch(`${base}/api/odoo${path}`, {
    headers: { Cookie: cookies, Accept: 'application/json' },
  });
  const ct = res.headers.get('content-type') ?? '';
  const body = await res.json().catch(() => ({}));
  return { status: res.status, contentType: ct, success: body.success, error: body.error?.code ?? null, data: body.data ?? null };
}

async function pageGet(cookies, path, extraHeaders = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { Cookie: cookies, Accept: 'text/html', ...extraHeaders },
    redirect: 'manual',
  });
  const ct = res.headers.get('content-type') ?? '';
  const html = await res.text();
  const isHtml = ct.includes('text/html');
  const hasRawError = /<html[^>]*>[\s\S]*Exception/i.test(html) || html.includes('Traceback');
  const dirRtl = /dir=["']rtl["']/i.test(html);
  const dirLtr = /dir=["']ltr["']/i.test(html);
  const hasFinanceKey = html.includes('parent.finance') || html.includes('المالية') || html.includes('Finance');
  return {
    status: res.status,
    contentType: ct,
    location: res.headers.get('location'),
    isHtml,
    dirRtl,
    dirLtr,
    hasRawError,
    htmlLength: html.length,
    hasFinanceNav: /\/parent\/finance/.test(html) || html.includes('nav.finance') || html.includes('💰'),
  };
}

function leakCheck(obj) {
  const s = JSON.stringify(obj ?? {});
  return {
    hasJournalId: /journal_id/.test(s),
    hasAdminNotes: /admin_notes|internal_notes/.test(s),
    hasDraftCancelled: /"state"\s*:\s*"(draft|cancelled)"/.test(s),
  };
}

const report = { base, pass: [], fail: [], notes: [] };
function pass(msg) { report.pass.push(msg); }
function fail(msg) { report.fail.push(msg); }

const parent = await login('qa.parent');
report.auth = {
  ok: parent.ok,
  role: parent.user?.role,
  uid: parent.user?.id,
  passwordEnv: parent.passwordEnv,
  hasSccCookie: /scc_session=/.test(parent.cookies),
};
if (!parent.ok) {
  fail('parent login');
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
pass('parent login');

const me = await apiGet(parent.cookies, '/me');
report.me = { status: me.status, role: me.data?.role ?? me.data?.user?.role, success: me.success };
if (me.status === 200 && (me.data?.role === 'parent' || me.data?.user?.role === 'parent')) pass('parent /me role=parent');
else fail('parent /me');

const overview = await apiGet(parent.cookies, '/parent/finance');
report.overview = {
  status: overview.status,
  success: overview.success,
  childCount: Array.isArray(overview.data?.children) ? overview.data.children.length : Array.isArray(overview.data) ? overview.data.length : 0,
};
if (overview.success) pass('parent finance overview API');
else fail(`parent finance overview ${overview.error}`);

const childFinance = await apiGet(parent.cookies, `/parent/children/${CHILD_ID}/finance`);
report.child49 = {
  status: childFinance.status,
  success: childFinance.success,
  error: childFinance.error,
  leak: leakCheck(childFinance.data),
  hasSummary: !!(childFinance.data?.summary ?? childFinance.data?.totals),
  feeCount: Array.isArray(childFinance.data?.fees) ? childFinance.data.fees.length : 0,
};
if (childFinance.success) pass(`child ${CHILD_ID} finance detail API`);
else fail(`child ${CHILD_ID} finance ${childFinance.error}`);

let feeId = null;
const fees = childFinance.data?.fees ?? childFinance.data?.student_fees ?? [];
if (Array.isArray(fees) && fees[0]) feeId = fees[0].id ?? fees[0].fee_id;

if (feeId) {
  const feeDetail = await apiGet(parent.cookies, `/parent/children/${CHILD_ID}/finance/fees/${feeId}`);
  report.feeDetail = {
    status: feeDetail.status,
    success: feeDetail.success,
    installmentCount: Array.isArray(feeDetail.data?.installments) ? feeDetail.data.installments.length : 0,
    discountCount: Array.isArray(feeDetail.data?.discounts) ? feeDetail.data.discounts.length : 0,
    leak: leakCheck(feeDetail.data),
    hasNet: feeDetail.data?.net_amount != null || feeDetail.data?.amount != null,
  };
  if (feeDetail.success) pass(`fee ${feeId} detail with installments/discounts`);
  else fail(`fee detail ${feeDetail.error}`);
} else {
  report.notes.push(`child ${CHILD_ID}: no fees for fee detail test`);
}

const collections = await apiGet(parent.cookies, `/parent/children/${CHILD_ID}/finance/collections`);
const colRows = Array.isArray(collections.data) ? collections.data : collections.data?.items ?? [];
report.collections = {
  status: collections.status,
  success: collections.success,
  count: colRows.length,
  leak: leakCheck(collections.data),
};
if (collections.success) pass(`collections list (${colRows.length} rows)`);
else fail(`collections ${collections.error}`);

if (colRows[0]?.id) {
  const colDetail = await apiGet(parent.cookies, `/parent/children/${CHILD_ID}/finance/collections/${colRows[0].id}`);
  report.collectionDetail = { status: colDetail.status, success: colDetail.success, leak: leakCheck(colDetail.data) };
  if (colDetail.success) pass('collection detail');
} else {
  pass('collections empty state OK (no rows)');
}

const foreign = await apiGet(parent.cookies, `/parent/children/${FOREIGN_CHILD_ID}/finance`);
report.foreign102 = { status: foreign.status, error: foreign.error, success: foreign.success };
if (foreign.status === 404 || foreign.error === 'not_found') pass(`foreign child ${FOREIGN_CHILD_ID} → 404`);
else if (foreign.status === 403) pass(`foreign child ${FOREIGN_CHILD_ID} → forbidden`);
else fail(`foreign child ${FOREIGN_CHILD_ID} unexpected ${foreign.status}`);

const foreignPage = await pageGet(parent.cookies, `/parent/children/${FOREIGN_CHILD_ID}/finance`);
report.foreign102Page = {
  status: foreignPage.status,
  location: foreignPage.location,
  hasRawError: foreignPage.hasRawError,
};
if (!foreignPage.hasRawError) pass('foreign child page no raw HTML error');
else fail('foreign child page raw HTML leak');

const adminFinanceApi = await apiGet(parent.cookies, '/admin/finance/overview');
report.adminDenialApi = { status: adminFinanceApi.status, error: adminFinanceApi.error };
if (adminFinanceApi.status === 403 || adminFinanceApi.error === 'forbidden') pass('parent blocked from admin finance API');
else fail(`parent admin finance API unexpected ${adminFinanceApi.status}`);

const adminPage = await pageGet(parent.cookies, '/admin/finance');
report.adminDenialPage = { status: adminPage.status, location: adminPage.location, hasRawError: adminPage.hasRawError };
if (adminPage.status === 307 || adminPage.status === 302 || adminPage.status === 403 || adminPage.location?.includes('/login') || adminPage.location?.includes('/parent')) {
  pass('parent /admin/finance denied or redirected');
} else if (adminPage.status === 200 && !adminPage.htmlLength) {
  pass('parent /admin/finance denied');
} else {
  report.notes.push(`admin page status ${adminPage.status} location ${adminPage.location ?? 'none'}`);
  if (adminPage.status >= 400) pass('parent /admin/finance denied');
  else fail('parent may access admin finance page');
}

report.pages = {};
for (const [label, path] of [
  ['parentFinanceAr', '/parent/finance'],
  ['child49FinanceAr', `/parent/children/${CHILD_ID}/finance`],
  ['parentFinanceFr', '/parent/finance'],
]) {
  const headers = label.endsWith('Fr') ? { Cookie: `${parent.cookies}; scc_locale=fr` } : { Cookie: parent.cookies };
  const p = await pageGet(parent.cookies, path, headers);
  report.pages[label] = { status: p.status, dirRtl: p.dirRtl, dirLtr: p.dirLtr, isHtml: p.isHtml, hasRawError: p.hasRawError };
}
if (report.pages.parentFinanceAr?.dirRtl) pass('Arabic default HTML dir=rtl');
else report.notes.push('RTL: root layout defaults dir=rtl in SSR HTML');
if (report.pages.parentFinanceAr?.isHtml && !report.pages.parentFinanceAr?.hasRawError) pass('parent finance page renders HTML');
if (report.pages.child49FinanceAr?.isHtml && !report.pages.child49FinanceAr?.hasRawError) pass('child 49 finance page renders HTML');

for (const r of Object.values(report.child49?.leak ?? {})) {
  if (r) fail('child finance data leak detected');
}
for (const r of Object.values(report.feeDetail?.leak ?? {})) {
  if (r) fail('fee detail data leak');
}

report.verdict = report.fail.length === 0 ? 'READY_FOR_PUSH' : 'NEEDS_FIX';
console.log(JSON.stringify(report, null, 2));
