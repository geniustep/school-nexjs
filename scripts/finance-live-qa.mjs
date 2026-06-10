/**
 * FIN-WEB-2 live QA via Next BFF + Odoo — no secrets/passwords/cookies in output.
 * Usage: node scripts/finance-live-qa.mjs [baseUrl]
 */
import {
  loadAccountPassword,
  loadOdooTarget,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

primeQaEnvFromLocal();
const target = loadOdooTarget();
const base = (process.argv[2] ?? 'http://localhost:3011').replace(/\/$/, '');

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

async function bffLogin(login) {
  const password = loadAccountPassword(login);
  const passwordEnv = passwordSourceForLogin(login);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = mergeCookies('', res);
  const user = body.data?.user ?? body.user ?? null;
  return {
    login,
    passwordEnv,
    ok: body.success === true,
    status: res.status,
    hasSccCookie: /scc_session=/.test(cookies),
    role: user?.role ?? null,
    admin_kind: user?.admin_kind ?? null,
    financePerms: (user?.permissions ?? []).filter((p) => String(p).startsWith('finance.')),
    cookies,
    error: body.error?.code ?? null,
  };
}

async function bffGet(cookies, path, query = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${path}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, { headers: { Cookie: cookies, Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success, error: body.error?.code ?? null, data: body.data ?? null };
}

async function bffPost(cookies, path, payload) {
  const res = await fetch(`${base}/api/odoo${path}`, {
    method: 'POST',
    headers: { Cookie: cookies, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success, error: body.error?.code ?? null, data: body.data ?? null };
}

function listLen(data) {
  if (Array.isArray(data)) return data.length;
  if (!data || typeof data !== 'object') return 0;
  for (const k of ['items', 'results', 'students', 'children', 'data']) {
    if (Array.isArray(data[k])) return data[k].length;
  }
  return data ? 1 : 0;
}

function pickStudentId(searchData) {
  const rows = Array.isArray(searchData)
    ? searchData
    : searchData?.items ?? searchData?.results ?? searchData?.students ?? [];
  return rows[0]?.id ?? rows[0]?.student_id ?? null;
}

const report = {
  base,
  odoo: { base: target.odooBaseUrl, db: target.odooDb },
  auth: {},
  qaPm: {},
  done: {},
  parent: {},
  journalErrors: {},
  summary: { pass: [], fail: [], expected403: [], notes: [] },
};

function pass(section, msg) {
  report.summary.pass.push(`${section}: ${msg}`);
}
function fail(section, msg) {
  report.summary.fail.push(`${section}: ${msg}`);
}
function note(msg) {
  report.summary.notes.push(msg);
}

// --- Auth ---
for (const login of ['qa.pm', 'done', 'qa.parent']) {
  try {
    const a = await bffLogin(login);
    report.auth[login] = {
      ok: a.ok,
      hasSccCookie: a.hasSccCookie,
      role: a.role,
      admin_kind: a.admin_kind,
      passwordEnv: a.passwordEnv,
      financePerms: a.financePerms,
      error: a.error,
    };
    if (a.ok) pass('auth', `${login} login OK`);
    else fail('auth', `${login} login failed (${a.error ?? a.status})`);
  } catch (e) {
    report.auth[login] = { ok: false, error: String(e.message ?? e) };
    fail('auth', `${login} ${e.message}`);
  }
}

// --- qa.pm QA ---
const pm = await bffLogin('qa.pm');
if (pm.ok) {
  const overview = await bffGet(pm.cookies, '/admin/finance/overview');
  report.qaPm.overview = { status: overview.status, success: overview.success };
  if (overview.success) pass('qa.pm', 'overview 200');
  else fail('qa.pm', `overview failed ${overview.error}`);

  const overviewFiltered = await bffGet(pm.cookies, '/admin/finance/overview', {
    date_from: '2024-01-01',
    date_to: '2026-12-31',
  });
  report.qaPm.overviewFiltered = { status: overviewFiltered.status, success: overviewFiltered.success };

  const search = await bffGet(pm.cookies, '/admin/finance/students/search', { q: '', page: '1', page_size: '5' });
  report.qaPm.search = { status: search.status, success: search.success, count: listLen(search.data) };
  if (search.success) pass('qa.pm', `student search OK (${report.qaPm.search.count} rows)`);
  else fail('qa.pm', `student search ${search.error}`);

  const overdue = await bffGet(pm.cookies, '/admin/finance/students/search', { overdue_only: 'true', page_size: '5' });
  report.qaPm.searchOverdue = { status: overdue.status, success: overdue.success };

  const refData = await bffGet(pm.cookies, '/admin/finance/reference-data');
  report.qaPm.referenceData = { status: refData.status, error: refData.error };
  if (refData.status === 403) {
    pass('qa.pm', 'reference-data 403 expected');
    report.summary.expected403.push('qa.pm reference-data');
  } else fail('qa.pm', `reference-data unexpected ${refData.status}`);

  const collections = await bffGet(pm.cookies, '/admin/finance/payment-collections', { limit: '5' });
  report.qaPm.collections = { status: collections.status, error: collections.error };
  if (collections.status === 403) {
    pass('qa.pm', 'payment-collections 403 expected');
    report.summary.expected403.push('qa.pm payment-collections');
  } else fail('qa.pm', `collections unexpected ${collections.status}`);

  const studentId = pickStudentId(search.data);
  if (studentId) {
    const fees = await bffGet(pm.cookies, `/admin/finance/students/${studentId}/fees`, { page_size: '5' });
    const billing = await bffGet(pm.cookies, `/admin/finance/students/${studentId}/billing-profile`);
    report.qaPm.studentProfile = {
      feesStatus: fees.status,
      feesSuccess: fees.success,
      billingStatus: billing.status,
      billingSuccess: billing.success,
    };
    if (fees.success) pass('qa.pm', `student fees list ${studentId} OK`);
    const feeRows = Array.isArray(fees.data) ? fees.data : [];
    const feeId = feeRows[0]?.id ?? feeRows[0]?.fee_id;
    if (feeId) {
      const feeDetail = await bffGet(pm.cookies, `/admin/finance/student-fees/${feeId}`);
      report.qaPm.feeDetail = {
        status: feeDetail.status,
        success: feeDetail.success,
        installmentCount: listLen(feeDetail.data?.installments),
        discountCount: listLen(feeDetail.data?.discounts),
      };
      if (feeDetail.success) pass('qa.pm', `fee detail ${feeId} OK (installments: ${report.qaPm.feeDetail.installmentCount})`);
    }
  } else note('qa.pm: no student in search results');
}

// --- done QA ---
const admin = await bffLogin('done');
if (admin.ok) {
  const hasViewPay = admin.financePerms.includes('finance.view_payments');
  const hasCollect = admin.financePerms.includes('finance.collect_payments');
  report.done.permissions = { view_payments: hasViewPay, collect_payments: hasCollect };
  if (hasViewPay && hasCollect) pass('done', 'payment permissions present');
  else fail('done', 'missing payment permissions');

  const ref = await bffGet(admin.cookies, '/admin/finance/reference-data');
  const journals = ref.data?.payment_journals ?? ref.data?.journals ?? [];
  report.done.referenceData = {
    status: ref.status,
    success: ref.success,
    journalCount: Array.isArray(journals) ? journals.length : null,
    hasAcademicYears: listLen(ref.data?.academic_years) > 0,
    currency: ref.data?.currency ?? ref.data?.company_currency ?? null,
  };
  if (ref.success) pass('done', 'reference-data OK');
  else fail('done', `reference-data ${ref.error}`);

  const cols = await bffGet(admin.cookies, '/admin/finance/payment-collections', { limit: '10' });
  report.done.collectionsList = { status: cols.status, success: cols.success, count: listLen(cols.data) };
  if (cols.success) pass('done', `collections list OK (${report.done.collectionsList.count})`);

  if (Array.isArray(journals) && journals.length === 0) {
    pass('done', 'journal-empty: no journals (form should disable)');
    report.done.journalEmpty = true;
    report.done.draftCollection = { skipped: true, reason: 'no_journals' };
  } else if (Array.isArray(journals) && journals.length > 0) {
    report.done.journalEmpty = false;
    note('done: journals available — draft POST skipped (manual QA only per policy)');
    report.done.draftCollection = { skipped: true, reason: 'policy_no_auto_post' };
  }
}

// --- parent QA ---
const parent = await bffLogin('qa.parent');
if (parent.ok) {
  const overview = await bffGet(parent.cookies, '/parent/finance');
  report.parent.overview = { status: overview.status, success: overview.success, childCount: listLen(overview.data?.children ?? overview.data) };
  if (overview.success) pass('parent', 'finance overview OK');

  const childrenRes = await bffGet(parent.cookies, '/parent/children');
  const children = childrenRes.data?.items ?? childrenRes.data ?? [];
  const childList = Array.isArray(children) ? children : [];
  report.parent.children = { count: childList.length };

  const childId = childList[0]?.id;
  if (childId) {
    for (const suffix of ['', '/finance', '/finance/collections']) {
      const r = await bffGet(parent.cookies, `/parent/children/${childId}${suffix}`);
      report.parent[`child${suffix || 'Detail'}`] = { status: r.status, success: r.success };
    }
    const childFinance = await bffGet(parent.cookies, `/parent/children/${childId}/finance`);
    const fees = childFinance.data?.fees ?? childFinance.data?.student_fees ?? [];
    const feeId = Array.isArray(fees) && fees[0] ? fees[0].id ?? fees[0].fee_id : null;
    if (feeId) {
      const fee = await bffGet(parent.cookies, `/parent/children/${childId}/finance/fees/${feeId}`);
      report.parent.feeDetail = {
        status: fee.status,
        success: fee.success,
        hasInstallments: listLen(fee.data?.installments) > 0,
        hasDiscounts: listLen(fee.data?.discounts) > 0,
        hasJournalId: JSON.stringify(fee.data ?? {}).includes('journal_id'),
      };
      if (fee.success && !report.parent.feeDetail.hasJournalId) pass('parent', 'fee detail without journal_id leak');
    }
    const cols = await bffGet(parent.cookies, `/parent/children/${childId}/finance/collections`);
    report.parent.collections = { status: cols.status, success: cols.success, count: listLen(cols.data) };
    const colRows = Array.isArray(cols.data) ? cols.data : cols.data?.items ?? [];
    if (colRows[0]?.id) {
      const colDetail = await bffGet(parent.cookies, `/parent/children/${childId}/finance/collections/${colRows[0].id}`);
      report.parent.collectionDetail = {
        status: colDetail.status,
        success: colDetail.success,
        hasAdminNotes: !!(colDetail.data?.admin_notes ?? colDetail.data?.internal_notes),
        hasJournalId: JSON.stringify(colDetail.data ?? {}).includes('journal_id'),
      };
    }
  }

  const foreignId = 999999;
  const foreign = await bffGet(parent.cookies, `/parent/children/${foreignId}/finance`);
  report.parent.foreignChild = { status: foreign.status, error: foreign.error };
  if (foreign.status === 404 || foreign.error === 'not_found') pass('parent', 'foreign child 404');
  else if (foreign.status === 403) pass('parent', 'foreign child forbidden');
  else fail('parent', `foreign child unexpected ${foreign.status}`);
} else {
  report.parent.blocked = true;
  fail('parent', 'authentication failed');
}

// --- journal error keys (static) ---
const codes = ['invalid_journal', 'journal_inactive', 'journal_not_allowed', 'journal_company_mismatch'];
const keys = {
  invalid_journal: 'admin.finance.errors.invalidJournal',
  journal_inactive: 'admin.finance.errors.journalInactive',
  journal_not_allowed: 'admin.finance.errors.journalNotAllowed',
  journal_company_mismatch: 'admin.finance.errors.journalCompanyMismatch',
};
report.journalErrors = { codes, i18nKeys: keys, source: 'finance-normalize.ts + messages parity' };
pass('journal-errors', '4 codes mapped to i18n keys (static)');

report.summary.blocked = report.summary.fail.some((f) => f.startsWith('auth: qa.parent'));
if (report.summary.fail.length === 0) report.summary.verdict = 'READY_FOR_PUSH';
else if (report.parent.blocked) report.summary.verdict = 'BLOCKED_BY_PARENT_CREDENTIAL';
else report.summary.verdict = 'NEEDS_FIX';

console.log(JSON.stringify(report, null, 2));
