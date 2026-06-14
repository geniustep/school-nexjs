/**
 * Student 360 finance live QA via Next BFF — database school only.
 * Usage: node scripts/student-360-finance-live-qa.mjs [baseUrl] [studentId]
 */
import {
  loadAccountPassword,
  loadOdooTarget,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

primeQaEnvFromLocal();
const target = loadOdooTarget();
const base = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const studentId = process.argv[3] ?? '727';

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
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = mergeCookies('', res);
  return {
    ok: body.success === true,
    status: res.status,
    cookies,
    user: body.data?.user ?? body.user ?? null,
    error: body.error?.code ?? null,
    passwordEnv: passwordSourceForLogin(login),
  };
}

async function bffGet(cookies, path, query = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${path}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, { headers: { Cookie: cookies, Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    success: body.success,
    error: body.error?.code ?? null,
    data: body.data ?? null,
  };
}

function listLen(data) {
  if (Array.isArray(data)) return data.length;
  if (!data || typeof data !== 'object') return 0;
  for (const k of ['items', 'results']) {
    if (Array.isArray(data[k])) return data[k].length;
  }
  return 0;
}

async function main() {
  const report = {
    task: 'STUDENT-360-FINANCE-NEXTJS-1',
    base,
    database: target.database,
    studentId,
    timestamp: new Date().toISOString(),
    checks: [],
    passed: true,
  };

  const login = await bffLogin('done');
  report.checks.push({
    name: 'auth_login',
    ok: login.ok,
    status: login.status,
    role: login.user?.role ?? null,
    financePerms: (login.user?.permissions ?? []).filter((p) => String(p).startsWith('finance.')),
    passwordEnv: login.passwordEnv,
    error: login.error,
  });
  if (!login.ok) {
    report.passed = false;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const cookies = login.cookies;
  const details = await bffGet(cookies, `/admin/students/${studentId}`);
  report.checks.push({
    name: 'student_details',
    ok: details.success,
    status: details.status,
    can_view_finance: details.data?.capabilities?.can_view_finance ?? null,
    has_finance_summary: !!details.data?.finance_summary,
    error: details.error,
  });

  const yearId =
    details.data?.current_enrollment?.academic_year?.id ??
    details.data?.finance_summary?.academic_year_id ??
    1;

  const summaryMissingYear = await bffGet(cookies, `/admin/students/${studentId}/finance/summary`);
  report.checks.push({
    name: 'finance_summary_requires_year',
    ok: summaryMissingYear.error === 'academic_year_not_found',
    status: summaryMissingYear.status,
    error: summaryMissingYear.error,
  });

  const summary = await bffGet(cookies, `/admin/students/${studentId}/finance/summary`, {
    academic_year_id: String(yearId),
  });
  report.checks.push({
    name: 'finance_summary',
    ok: summary.success,
    status: summary.status,
    academic_year: summary.data?.academic_year?.name ?? null,
    total_assessed: summary.data?.summary?.total_assessed ?? null,
    billing_profile: summary.data?.billing_profile ?? null,
    financial_responsible: summary.data?.financial_responsible ?? null,
    capabilities: summary.data?.capabilities ?? null,
    error: summary.error,
  });

  const fees = await bffGet(cookies, `/admin/finance/students/${studentId}/fees`, {
    academic_year_id: String(yearId),
    page_size: '10',
  });
  report.checks.push({
    name: 'student_fees',
    ok: fees.success,
    status: fees.status,
    count: listLen(fees.data),
    error: fees.error,
  });

  const payments = await bffGet(cookies, `/admin/finance/payment-collections`, {
    student_id: String(studentId),
    academic_year_id: String(yearId),
    page_size: '10',
  });
  report.checks.push({
    name: 'payment_collections',
    ok: payments.success,
    status: payments.status,
    count: listLen(payments.data),
    error: payments.error,
  });

  for (const c of report.checks) {
    if (!c.ok) report.passed = false;
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
