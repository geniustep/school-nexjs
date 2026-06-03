/**
 * RBAC smoke test against local Next.js (npm run dev).
 * Usage: node scripts/qa-rbac-check.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const BASE = process.argv[2] ?? 'http://localhost:3000';

const ACCOUNTS = [
  { login: 'qa.pm', label: 'qa.pm' },
  { login: 'qa.schoolmgr', label: 'qa.schoolmgr' },
  { login: 'qa.supervisor', label: 'qa.supervisor' },
  { login: 'qa.staff', label: 'qa.staff' },
  {
    login: 'done',
    label: 'done',
    password:
      process.env.QA_PASSWORD_LEGACY ??
      (() => {
        try {
          return loadAccountPassword('done');
        } catch {
          return null;
        }
      })(),
  },
  { login: 'qa.teacher', label: 'qa.teacher' },
  { login: 'qa.parent', label: 'qa.parent' },
  { login: 'qa.student', label: 'qa.student' },
];

const ADMIN_PAGES = [
  ['/admin/dashboard', 'view_dashboard'],
  ['/admin/students', 'view_students'],
  ['/admin/parents', 'view_parents'],
  ['/admin/teachers', 'view_teachers'],
  ['/admin/classes', 'view_classes'],
  ['/admin/attendance', 'view_attendance'],
  ['/admin/channels', 'view_channels'],
  ['/admin/homeworks', 'view_homeworks'],
  ['/admin/resources', 'view_resources'],
  ['/admin/exams', 'view_exams'],
  ['/admin/exam-results', 'view_exam_results'],
  ['/admin/timetable', 'view_timetable'],
];

const ADMIN_API = [
  ['/admin/dashboard', 'view_dashboard'],
  ['/admin/students?page_size=1', 'view_students'],
  ['/admin/parents?page_size=1', 'view_parents'],
  ['/admin/teachers?page_size=1', 'view_teachers'],
  ['/admin/classes?page_size=1', 'view_classes'],
  ['/admin/attendance?page_size=1', 'view_attendance'],
  ['/admin/channels?page_size=1', 'view_channels'],
  ['/admin/homeworks?page_size=1', 'view_homeworks'],
  ['/admin/resources?page_size=1', 'view_resources'],
  ['/admin/exams?page_size=1', 'view_exams'],
  ['/admin/exam-results?page_size=1', 'view_exam_results'],
  ['/admin/timetable?page_size=1', 'view_timetable'],
];

function parseSetCookie(header) {
  if (!header) return '';
  const parts = Array.isArray(header) ? header : [header];
  return parts.map((c) => c.split(';')[0]).join('; ');
}

async function login(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json();
  const cookie = parseSetCookie(res.headers.getSetCookie?.() ?? res.headers.get('set-cookie'));
  return { status: res.status, body, cookie, ok: res.ok && body.success };
}

async function get(path, cookie, extraQuery = '') {
  const url = `${BASE}/api/odoo${path}${extraQuery ? (path.includes('?') ? '&' : '?') + extraQuery : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', Cookie: cookie } });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { parseError: true };
  }
  return { status: res.status, success: json?.success, code: json?.error?.code, message: json?.error?.message };
}

async function postActiveSchool(schoolId, cookie) {
  const res = await fetch(`${BASE}/api/auth/active-school`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Cookie: cookie },
    body: JSON.stringify({ school_id: schoolId }),
  });
  const body = await res.json();
  return { status: res.status, success: body?.success, code: body?.error?.code };
}

async function getAdminPage(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie, Accept: 'text/html' },
    redirect: 'manual',
  });
  const loc = res.headers.get('location') ?? '';
  return {
    status: res.status,
    redirect: loc,
    blocked: res.status === 307 || res.status === 302 ? !loc.includes('/admin') : false,
    htmlForbidden: res.status === 200 ? false : null,
  };
}

function hasPerm(user, p) {
  return (user.permissions ?? []).includes(p);
}

async function runAccount(acc) {
  const out = { account: acc.label, login: acc.login, errors: [] };
  const pw =
    acc.password ??
    (() => {
      try {
        return loadAccountPassword(acc.login);
      } catch {
        return null;
      }
    })();
  if (!pw) {
    return { account: acc.label, login: acc.login, skip: 'no_password_config' };
  }
  const lg = await login(acc.login, pw);
  if (!lg.ok) {
    out.login = { ok: false, status: lg.status, code: lg.body?.error?.code, message: lg.body?.error?.message };
    return out;
  }
  const user = lg.body.data?.user ?? lg.body.user;
  out.login = { ok: true, role: user.role, admin_kind: user.admin_kind, school_ids: user.school_ids, permissions: user.permissions };
  out.cookie = lg.cookie;

  if (user.role !== 'admin') {
    const dash = await getAdminPage('/admin/dashboard', lg.cookie);
    out.nonAdminAdminAccess = dash;
    return out;
  }

  out.multiSchool = (user.school_ids?.length ?? 0) > 1;

  if (acc.label === 'qa.pm' && out.multiSchool) {
    const sw9 = await postActiveSchool(9, lg.cookie);
    const dash9 = await get('/admin/dashboard', lg.cookie);
    const sw10 = await postActiveSchool(10, lg.cookie);
    const dash10 = await get('/admin/dashboard', lg.cookie);
    const sw999 = await postActiveSchool(999, lg.cookie);
    const dash999 = await get('/admin/dashboard', lg.cookie, 'active_school_id=999');
    out.schoolSwitcher = { sw9, dash9: dash9.status, sw10, dash10: dash10.status, sw999, dash999 };
  }

  if (acc.label === 'qa.schoolmgr') {
    const sw9 = await postActiveSchool(9, lg.cookie);
    const api9 = await get('/admin/students?page_size=1', lg.cookie);
    const sw10 = await postActiveSchool(10, lg.cookie);
    const api10 = await get('/admin/students?page_size=1', lg.cookie);
    out.schoolmgr = { sw9, api9, sw10, api10, school_ids: user.school_ids };
  }

  out.api = {};
  for (const [path, perm] of ADMIN_API) {
    const r = await get(path, lg.cookie);
    const expected = hasPerm(user, perm);
    const got403 = r.status === 403 || r.code === 'permission_denied' || r.code === 'forbidden';
    const ok = r.success === true;
    out.api[path.split('?')[0]] = {
      perm,
      hasPerm: expected,
      status: r.status,
      ok,
      forbidden: got403,
      mismatch: expected && !ok && !got403 ? 'expected_ok' : !expected && ok ? 'unexpected_ok' : null,
    };
  }

  out.pages = {};
  for (const [path, perm] of ADMIN_PAGES) {
    const r = await getAdminPage(path, lg.cookie);
    const expected = hasPerm(user, perm);
    out.pages[path] = { hasPerm: expected, status: r.status, redirect: r.redirect };
  }

  return out;
}

async function main() {
  console.log('QA base:', BASE);
  const results = [];
  for (const acc of ACCOUNTS) {
    try {
      results.push(await runAccount(acc));
    } catch (e) {
      results.push({ account: acc.label, fatal: String(e) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
