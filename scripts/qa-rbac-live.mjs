import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const BASE = process.argv[2] ?? 'http://localhost:3001';

async function cookieJarFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function doLogin(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json();
  if (!body.success) return { ok: false, status: res.status, error: body.error };
  let jar = await cookieJarFrom(res);
  const user = body.data.user;
  const school = user.active_school_id ?? user.school_ids?.[0];
  if (user.role === 'admin' && school) {
    const sw = await fetch(`${BASE}/api/auth/active-school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: jar },
      body: JSON.stringify({ school_id: school }),
    });
    jar = await cookieJarFrom(sw, jar);
  }
  return { ok: true, user, jar };
}

async function api(jar, path) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    headers: { Accept: 'application/json', Cookie: jar },
  });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    success: body.success === true,
    code: body.error?.code,
  };
}

async function switchSchool(jar, schoolId) {
  const res = await fetch(`${BASE}/api/auth/active-school`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar },
    body: JSON.stringify({ school_id: schoolId }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success, code: body.error?.code, jar: await cookieJarFrom(res, jar) };
}

async function adminPage(jar, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: jar }, redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location') ?? '' };
}

function has(user, p) {
  return user.permissions?.includes(p);
}

const ENDPOINTS = [
  ['students', '/admin/students?page_size=1', 'view_students'],
  ['parents', '/admin/parents?page_size=1', 'view_parents'],
  ['teachers', '/admin/teachers?page_size=1', 'view_teachers'],
  ['classes', '/admin/classes?page_size=1', 'view_classes'],
  ['attendance', '/admin/attendance?page_size=1', 'view_attendance'],
  ['channels', '/admin/channels?page_size=1', 'view_channels'],
  ['homeworks', '/admin/homeworks?page_size=1', 'view_homeworks'],
  ['resources', '/admin/resources?page_size=1', 'view_resources'],
  ['exams', '/admin/exams?page_size=1', 'view_exams'],
  ['exam-results', '/admin/exam-results?page_size=1', 'view_exam_results'],
  ['timetable', '/admin/timetable?page_size=1', 'view_timetable'],
  ['dashboard', '/admin/dashboard', 'view_dashboard'],
];

async function testAdmin(name, login, password, hooks) {
  const row = { name, login };
  const lg = await doLogin(login, password);
  if (!lg.ok) {
    row.loginFail = lg.error;
    return row;
  }
  const { user, jar } = lg;
  row.role = user.role;
  row.admin_kind = user.admin_kind;
  row.school_ids = user.school_ids;
  row.permissions = user.permissions;

  if (user.role !== 'admin') {
    row.adminDashboard = await adminPage(jar, '/admin/dashboard');
    return row;
  }

  row.api = {};
  for (const [label, path, perm] of ENDPOINTS) {
    const r = await api(jar, path);
    const expect = has(user, perm);
    row.api[label] = {
      expect,
      status: r.status,
      ok: r.success,
      forbidden: r.code === 'forbidden' || r.code === 'permission_denied' || r.status === 403,
    };
  }
  if (hooks) row.extra = await hooks(user, jar);
  return row;
}

const results = [];
results.push(
  await testAdmin('qa.pm', 'qa.pm', loadAccountPassword('qa.pm'), async (user, jar) => {
    const extra = {};
    for (const sid of [9, 10]) {
      const sw = await switchSchool(jar, sid);
      const st = await api(sw.jar, '/admin/students?page_size=1');
      extra[`school_${sid}`] = { switch: sw.status, students: st.success ? 'OK' : st.code ?? st.status };
    }
    extra.switch_999 = await switchSchool(jar, 999);
    return extra;
  }),
);
results.push(
  await testAdmin('qa.schoolmgr', 'qa.schoolmgr', loadAccountPassword('qa.schoolmgr'), async (_u, jar) => ({
    switch_9: await switchSchool(jar, 9),
    switch_10: await switchSchool(jar, 10),
  })),
);
results.push(await testAdmin('qa.staff', 'qa.staff', loadAccountPassword('qa.staff')));
results.push(await testAdmin('qa.supervisor', 'qa.supervisor', loadAccountPassword('qa.supervisor')));
if (process.env.QA_PASSWORD_LEGACY) {
  results.push(await testAdmin('done', 'done', process.env.QA_PASSWORD_LEGACY));
}
for (const l of ['qa.teacher', 'qa.parent', 'qa.student']) {
  results.push(await testAdmin(l, l, loadAccountPassword(l)));
}

console.log(JSON.stringify(results, null, 2));
