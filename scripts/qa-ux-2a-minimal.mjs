/**
 * RBAC-UX-2A minimal QA — stdout summary only, no secrets written to disk.
 * Usage: node scripts/qa-ux-2a-minimal.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const BASE = process.argv[2] ?? 'http://localhost:3003';
const ACCOUNTS = ['qa.pm', 'qa.schoolmgr', 'qa.supervisor', 'qa.staff'];

async function jarFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function login(name) {
  const password = loadAccountPassword(name);
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login: name, password }),
  });
  const body = await res.json();
  if (!body.success) return { ok: false, code: body.error?.code };
  let jar = await jarFrom(res);
  const user = body.data.user;
  const school = user.active_school_id ?? user.school_ids?.[0];
  if (user.role === 'admin' && school) {
    const sw = await fetch(`${BASE}/api/auth/active-school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: jar },
      body: JSON.stringify({ school_id: school }),
    });
    jar = await jarFrom(sw, jar);
  }
  return { ok: true, user, jar };
}

async function get(jar, path, redirect = 'manual') {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: jar }, redirect });
  const loc = res.headers.get('location') ?? '';
  const html = res.status === 200 ? await res.text() : '';
  return { status: res.status, loc, html, url: res.url };
}

const FORBIDDEN =
  /forbiddenTitle|staffNoDashboard|staffNoDashboardTitle|الوصول مقيّد|لوحة التحكم غير متاحة|Dashboard not available|Accès restreint/;

const results = [];

for (const acct of ACCOUNTS) {
  const row = {
    account: acct,
    pass: false,
    login: false,
    adminRedirect: null,
    dashboardDirectForbidden: null,
    multiSchoolSwitcher: null,
    portfolioNotice: null,
    scopedNavLabel: null,
    visibleNavApprox: [],
    error: null,
  };
  try {
    const L = await login(acct);
    if (!L.ok) {
      row.error = L.code;
      results.push(row);
      continue;
    }
    row.login = true;

    const adminHit = await get(L.jar, '/admin', 'manual');
    row.adminRedirect = adminHit.loc || null;

    const dash = await get(L.jar, '/admin/dashboard');
    row.dashboardDirectForbidden = FORBIDDEN.test(dash.html);

    const multi = (L.user.school_ids?.length ?? 0) > 1;
    const landing = await get(L.jar, row.adminRedirect ?? '/admin/dashboard', 'follow');
    row.multiSchoolSwitcher = multi ? /school-switcher/.test(landing.html) : false;
    row.portfolioNotice =
      L.user.admin_kind === 'project_manager' && multi
        ? /multiSchoolPortfolioPending|portfolio/.test(landing.html)
        : null;

    row.scopedNavLabel =
      L.user.admin_kind === 'general_supervisor'
        ? /adminScopedOperations|périmètre limité|نطاق محدود|limited scope|ámbito limitado/.test(
            landing.html,
          )
        : null;

    const navPaths = [
      'dashboard',
      'students',
      'parents',
      'teachers',
      'classes',
      'attendance',
      'channels',
    ];
    for (const key of navPaths) {
      const pg = await get(L.jar, `/admin/${key}`);
      if (pg.status === 200 && !FORBIDDEN.test(pg.html)) row.visibleNavApprox.push(key);
    }

    row.pass =
      row.login &&
      (acct === 'qa.staff'
        ? row.adminRedirect === '/admin/students' && row.dashboardDirectForbidden
        : row.adminRedirect === '/admin/dashboard') &&
      (acct !== 'qa.pm' || row.multiSchoolSwitcher === true) &&
      (acct === 'qa.schoolmgr' ? row.multiSchoolSwitcher === false : true);

    if (acct === 'qa.staff') {
      row.pass =
        row.login &&
        row.adminRedirect === '/admin/students' &&
        row.dashboardDirectForbidden &&
        row.visibleNavApprox.length <= 2;
    }
  } catch (e) {
    row.error = e.message;
  }
  results.push(row);
}

const summary = {
  base: BASE,
  pass: results.filter((r) => r.pass).length,
  total: results.length,
  accounts: results,
};
console.log(JSON.stringify(summary, null, 2));
