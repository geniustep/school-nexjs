/**
 * F-1 RBAC live probe — no hardcoded passwords, no cookie output in repo.
 * Usage: node scripts/qa-f1-probe.mjs [baseUrl]
 * Credentials: QA_PASSWORD | QA_*_PASSWORD | ODOO_QA_* | QA_PASSWORD_FILE | .env.qa.local
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAccountPassword, passwordSourceForLogin, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = process.argv[2] ?? 'http://localhost:3001';

const ACCOUNTS = [
  'qa.pm',
  'qa.schoolmgr',
  'qa.supervisor',
  'qa.staff',
  'qa.teacher',
  'qa.parent',
  'qa.student',
];

const NAV_MAP = [
  ['dashboard', 'view_dashboard', '/admin/dashboard'],
  ['students', 'view_students', '/admin/students'],
  ['parents', 'view_parents', '/admin/parents'],
  ['teachers', 'view_teachers', '/admin/teachers'],
  ['classes', 'view_classes', '/admin/classes'],
  ['attendance', 'view_attendance', '/admin/attendance'],
  ['channels', 'view_channels', '/admin/channels'],
  ['homeworks', 'view_homeworks', '/admin/homeworks'],
  ['resources', 'view_resources', '/admin/resources'],
  ['exams', 'view_exams', '/admin/exams'],
  ['exam-results', 'view_exam_results', '/admin/exam-results'],
  ['timetable', 'view_timetable', '/admin/timetable'],
];

function visibleModules(user) {
  const p = new Set(user.permissions ?? []);
  return NAV_MAP.filter(([, perm]) => p.has(perm)).map(([label]) => label);
}

function blockedModules(user) {
  const p = new Set(user.permissions ?? []);
  return NAV_MAP.filter(([, perm]) => !p.has(perm)).map(([label]) => label);
}

function landingRoute(user) {
  if (user.role !== 'admin') return `/${user.role}/dashboard`;
  const p = new Set(user.permissions ?? []);
  if (p.has('view_dashboard')) return '/admin/dashboard';
  const first = NAV_MAP.find(([, perm]) => p.has(perm));
  return first ? first[2] : '/admin/dashboard';
}

async function cookieJarFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function login(loginName) {
  let password;
  let passwordEnv;
  try {
    password = loadAccountPassword(loginName);
    passwordEnv = passwordSourceForLogin(loginName);
  } catch (e) {
    return {
      ok: false,
      code: 'no_password_config',
      status: 0,
      message: e.message,
      passwordEnv: null,
    };
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.success) {
    return {
      ok: false,
      code: body.error?.code,
      status: res.status,
      message: body.error?.message,
      passwordEnv,
    };
  }
  let jar = await cookieJarFrom(res);
  const user = body.data?.user ?? body.user;
  const me = {
    role: user.role,
    admin_kind: user.admin_kind,
    school_ids: user.school_ids,
    active_school_id: user.active_school_id,
    default_school_id: user.default_school_id,
    scope_type: user.scope_type ?? user.scope?.type,
    scopes_count: user.scopes_count ?? user.scopes?.length,
    permissionCount: user.permissions?.length ?? 0,
  };
  const school = user.active_school_id ?? user.default_school_id ?? user.school_ids?.[0];
  if (user.role === 'admin' && school) {
    const sw = await fetch(`${BASE}/api/auth/active-school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: jar },
      body: JSON.stringify({ school_id: school }),
    });
    jar = await cookieJarFrom(sw, jar);
  }
  return { ok: true, user, me, jar, landing: landingRoute(user), passwordEnv };
}

async function apiGet(jar, path) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    headers: { Accept: 'application/json', Cookie: jar },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    return { status: res.status, success: false, code: 'parse_error', parseError: true };
  }
  return {
    status: res.status,
    success: body?.success === true,
    code: body?.error?.code,
    parseError: false,
  };
}

async function pageGet(jar, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: jar, Accept: 'text/html' }, redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  const html = res.status === 200 ? await res.text() : '';
  const crash = /Internal Server Error|Unhandled Runtime Error|Application error/.test(html);
  const forbidden =
    /forbiddenTitle|admin\.pageForbidden|الوصول مقيّد|Access restricted|Accès restreint/.test(html);
  const rawHtmlLeak =
    html.length > 0 && html.includes('<!DOCTYPE') && !forbidden && !crash && html.includes('<html');
  return { status: res.status, redirect: loc, crash, forbidden, rawHtmlLeak };
}

async function switchSchool(jar, schoolId) {
  const res = await fetch(`${BASE}/api/auth/active-school`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar },
    body: JSON.stringify({ school_id: schoolId }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success === true, code: body.error?.code };
}

const summary = { base: BASE, ranAt: new Date().toISOString(), accounts: [] };

for (const loginName of ACCOUNTS) {
  const row = { account: loginName };
  const lg = await login(loginName);
  if (!lg.ok) {
    row.loginResult = {
      ok: false,
      error: lg.code ?? lg.status,
      message: lg.message,
      passwordEnv: lg.passwordEnv ?? null,
    };
    row.landingRoute = null;
    row.visibleModules = [];
    row.blockedModules = NAV_MAP.map(([l]) => l);
    summary.accounts.push(row);
    continue;
  }
  const { user, me, jar, landing } = lg;
  row.loginResult = { ok: true, passwordEnv: lg.passwordEnv ?? null };
  row.me = me;
  row.landingRoute = landing;
  row.visibleModules = visibleModules(user);
  row.blockedModules = blockedModules(user);
  row.multiSchool = (user.school_ids?.length ?? 0) > 1;
  row.unexpected = [];

  if (user.role === 'admin') {
    row.apiChecks = {};
    for (const [label, perm, apiPath] of NAV_MAP) {
      const has = (user.permissions ?? []).includes(perm);
      const checkPath =
        apiPath === '/admin/dashboard' ? '/admin/dashboard' : `${apiPath}?page_size=1`;
      const apiRes = await apiGet(jar, checkPath);
      row.apiChecks[label] = {
        hasPermission: has,
        status: apiRes.status,
        ok: apiRes.success,
        code: apiRes.code,
        mismatch:
          has && !apiRes.success && apiRes.code !== 'permission_denied' && apiRes.code !== 'forbidden'
            ? 'expected_ok'
            : !has && apiRes.success
              ? 'expected_denied'
              : null,
      };
      if (!has && apiRes.success) row.unexpected.push(`api_${label}_allowed_without_perm`);
    }
    row.pageChecks = {};
    for (const [label, perm, pagePath] of NAV_MAP) {
      const has = (user.permissions ?? []).includes(perm);
      const pg = await pageGet(jar, pagePath.split('?')[0]);
      row.pageChecks[label] = {
        hasPermission: has,
        status: pg.status,
        forbidden: pg.forbidden,
        crash: pg.crash,
        rawHtmlLeak: pg.rawHtmlLeak,
      };
      if (pg.crash) row.unexpected.push(`page_crash_${label}`);
      if (pg.rawHtmlLeak) row.unexpected.push(`raw_html_${label}`);
      if (!has && !pg.forbidden && pg.status === 200 && !pg.crash) {
        row.unexpected.push(`page_${label}_no_forbidden_ui`);
      }
    }
    if (loginName === 'qa.pm') {
      row.schoolSwitch = { to9: await switchSchool(jar, 9), to999: await switchSchool(jar, 999) };
    }
    if (loginName === 'qa.schoolmgr') {
      row.schoolSwitch = { to9: await switchSchool(jar, 9), to10: await switchSchool(jar, 10) };
    }
  } else {
    const adminPg = await pageGet(jar, '/admin/dashboard');
    row.adminAccess = {
      status: adminPg.status,
      redirect: adminPg.redirect,
      forbidden: adminPg.forbidden,
    };
    row.portal = await pageGet(jar, `/${user.role}/dashboard`);
    if (adminPg.status === 200 && !adminPg.forbidden && !adminPg.redirect.includes('/login')) {
      row.unexpected.push('non_admin_reached_admin_html');
    }
  }

  summary.accounts.push(row);
}

const repoOut = path.join(path.dirname(fileURLToPath(import.meta.url)), 'qa-f1-live-results.json');
fs.writeFileSync(repoOut, JSON.stringify(summary, null, 2));
const outDir = path.join(os.tmpdir(), 'school-nexjs-qa');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `qa-f1-probe-${Date.now()}.json`);
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.error(`(gitignored: scripts/qa-f1-live-results.json; temp: ${outFile})`);
