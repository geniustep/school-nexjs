/**
 * Final Browser QA (SSR HTML + API) for Admin RBAC Restore.
 * Usage: node scripts/qa-browser-rbac.mjs [baseUrl]
 * Credentials: QA_PASSWORD | QA_*_PASSWORD | ODOO_QA_* | .env.qa.local
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const BASE = process.argv[2] ?? 'http://localhost:3001';

const FORBIDDEN_MARKERS = [
  'الوصول مقيّد',
  'Access restricted',
  'Accès restreint',
  'admin.pageForbidden',
  'ليست لديك صلاحية',
];
const CRASH_MARKERS = [
  'Internal Server Error',
  'Application error',
  'Unhandled Runtime Error',
  'This page could not be found',
];
const EXCUSED_MARKERS = ['excused_absence', 'excused'];

const ADMIN_NAV_PATHS = [
  '/admin/dashboard',
  '/admin/students',
  '/admin/parents',
  '/admin/teachers',
  '/admin/classes',
  '/admin/levels',
  '/admin/subjects',
  '/admin/attendance',
  '/admin/channels',
  '/admin/homeworks',
  '/admin/resources',
  '/admin/exams',
  '/admin/exam-results',
  '/admin/timetable',
];

const STAFF_FORBIDDEN_NAV = ADMIN_NAV_PATHS.filter((p) => p !== '/admin/students');

const STAFF_DIRECT_PATHS = [
  '/admin/parents',
  '/admin/teachers',
  '/admin/classes',
  '/admin/attendance?date=today',
  '/admin/channels',
  '/admin/homeworks',
  '/admin/resources',
  '/admin/exams',
  '/admin/exam-results',
  '/admin/timetable',
  '/admin/dashboard',
];

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
  if (!body.success) return { ok: false, error: body.error };
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

async function switchSchool(jar, schoolId) {
  const res = await fetch(`${BASE}/api/auth/active-school`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar },
    body: JSON.stringify({ school_id: schoolId }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    ok: body.success === true,
    jar: await cookieJarFrom(res, jar),
    cookieSchool: (await cookieJarFrom(res, jar)).match(/scc_active_school=(\d+)/)?.[1],
  };
}

async function fetchPage(jar, path, redirect = 'follow') {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: jar }, redirect });
  const html = await res.text();
  return { status: res.status, url: res.url, html, location: res.headers.get('location') };
}

function extractAdminNav(html) {
  const links = [...html.matchAll(/href="(\/admin[^"?#]+)/g)].map((m) => m[1]);
  return [...new Set(links)].filter((h) => ADMIN_NAV_PATHS.some((p) => h === p || h.startsWith(p + '/')));
}

function hasForbidden(html) {
  return FORBIDDEN_MARKERS.some((m) => html.includes(m));
}

function hasCrash(html) {
  return CRASH_MARKERS.some((m) => html.includes(m));
}

function hasExcused(html) {
  return EXCUSED_MARKERS.some((m) => html.includes(m));
}

function hasSchoolSwitcher(html) {
  return html.includes('school-switcher');
}

function hasManageAdd(html) {
  return (
    /btn--primary[^>]*>[\s\S]*?(إضافة|Add|Ajouter)/i.test(html) ||
    /href="\/admin\/[^"]+\/new"/.test(html) ||
    html.includes('admin.add')
  );
}

function expectedNavForUser(user) {
  const perms = new Set(user.permissions ?? []);
  return ADMIN_NAV_PATHS.filter((path) => {
    const map = {
      '/admin/dashboard': 'view_dashboard',
      '/admin/students': 'view_students',
      '/admin/parents': 'view_parents',
      '/admin/teachers': 'view_teachers',
      '/admin/classes': 'view_classes',
      '/admin/levels': 'view_classes',
      '/admin/subjects': 'view_classes',
      '/admin/attendance': 'view_attendance',
      '/admin/channels': 'view_channels',
      '/admin/homeworks': 'view_homeworks',
      '/admin/resources': 'view_resources',
      '/admin/exams': 'view_exams',
      '/admin/exam-results': 'view_exam_results',
      '/admin/timetable': 'view_timetable',
    };
    const perm = map[path];
    return perm && perms.has(perm);
  });
}

const report = { base: BASE, accounts: [], summary: {} };

async function runAccount(cfg) {
  const row = { name: cfg.name, login: cfg.login, checks: [], pass: true };
  let password = cfg.password;
  if (!password) {
    try {
      password = loadAccountPassword(cfg.login);
    } catch (e) {
      row.pass = false;
      row.checks.push({ id: 'login', pass: false, detail: 'no_password_config' });
      report.accounts.push(row);
      return;
    }
  }
  const lg = await doLogin(cfg.login, password);
  if (!lg.ok) {
    row.pass = false;
    row.checks.push({ id: 'login', pass: false, detail: lg.error?.code ?? 'fail' });
    report.accounts.push(row);
    return;
  }
  const { user, jar } = lg;
  row.role = user.role;
  row.permissions = user.permissions;
  row.school_ids = user.school_ids;

  if (user.role !== 'admin') {
    const dash = await fetchPage(jar, '/admin/dashboard', 'manual');
    const redirected =
      dash.status === 307 ||
      dash.status === 302 ||
      (dash.status === 200 && !dash.html.includes('/admin/dashboard'));
    const loc = dash.location ?? '';
    const ok =
      dash.status === 307 ||
      dash.status === 302 ||
      (dash.status === 200 &&
        (loc.includes(cfg.expectPortal ?? '') ||
          dash.url.includes(cfg.expectPortal?.replace(/^\//, '') ?? '___')));
    row.checks.push({
      id: 'no_admin',
      pass: ok || (dash.status >= 300 && dash.status < 400),
      detail: `status=${dash.status} loc=${loc || dash.url}`,
    });
    if (!row.checks[row.checks.length - 1].pass) row.pass = false;
    report.accounts.push(row);
    return;
  }

  // Dashboard load
  const dash = await fetchPage(jar, '/admin/dashboard');
  row.checks.push({
    id: 'dashboard_load',
    pass: dash.status === 200 && !hasCrash(dash.html),
    detail: `status=${dash.status} crash=${hasCrash(dash.html)}`,
  });

  // School switcher
  const multiSchool = (user.school_ids?.length ?? 0) > 1;
  const switcherOnDash = hasSchoolSwitcher(dash.html);
  if (cfg.expectSwitcher === true) {
    row.checks.push({
      id: 'school_switcher',
      pass: switcherOnDash,
      detail: switcherOnDash ? 'visible' : 'missing on dashboard',
    });
  } else if (cfg.expectSwitcher === false) {
    row.checks.push({
      id: 'school_switcher_hidden',
      pass: !switcherOnDash,
      detail: switcherOnDash ? 'unexpected switcher' : 'hidden (single school)',
    });
  }

  // PM school switch 9/10
  if (cfg.testSchoolSwitch) {
    const counts = {};
    for (const sid of [9, 10]) {
      const sw = await switchSchool(jar, sid);
      const st = await fetch(`${BASE}/api/odoo/admin/students?page_size=1`, {
        headers: { Accept: 'application/json', Cookie: sw.jar },
      });
      const body = await st.json().catch(() => ({}));
      counts[sid] = {
        switchStatus: sw.status,
        cookieSchool: sw.cookieSchool,
        studentsOk: body.success === true,
        total: body.data?.pagination?.total ?? body.data?.items?.length,
      };
    }
    const sw999 = await switchSchool(jar, 999);
    row.checks.push({
      id: 'school_switch_9_10',
      pass: counts[9]?.studentsOk && counts[10]?.studentsOk,
      detail: counts,
    });
    row.checks.push({
      id: 'school_switch_999_forbidden',
      pass: sw999.status === 403 || !sw999.ok,
      detail: { status: sw999.status, ok: sw999.ok },
    });
  }

  // Nav on students hub (or first allowed page)
  const hubPath = user.permissions?.includes('view_dashboard')
    ? '/admin/dashboard'
    : '/admin/students';
  const hub = await fetchPage(jar, hubPath);
  const nav = extractAdminNav(hub.html);
  row.navVisible = nav;
  const expected = expectedNavForUser(user);
  const extra = nav.filter((n) => !expected.includes(n) && ADMIN_NAV_PATHS.includes(n));
  const missing = expected.filter((n) => !nav.includes(n));
  row.checks.push({
    id: 'nav_matches_permissions',
    pass: extra.length === 0 && (cfg.relaxedNav || missing.length === 0),
    detail: { expected, visible: nav, extra, missing },
  });

  // Staff-specific forbidden direct URLs
  if (cfg.testStaffForbidden) {
    for (const path of STAFF_DIRECT_PATHS) {
      const p = await fetchPage(jar, path);
      const ok = hasForbidden(p.html) && !hasCrash(p.html);
      row.checks.push({
        id: `forbidden_${path.split('?')[0]}`,
        pass: ok,
        detail: `status=${p.status} forbidden=${hasForbidden(p.html)}`,
      });
      if (!ok) row.pass = false;
    }
    const badNav = STAFF_FORBIDDEN_NAV.filter((n) => nav.includes(n));
    row.checks.push({
      id: 'staff_nav_only_students',
      pass: badNav.length === 0 && nav.includes('/admin/students'),
      detail: { badNav, nav },
    });
  }

  // Supervisor: no manage add on students
  if (cfg.testNoManageButtons) {
    const st = await fetchPage(jar, '/admin/students');
    row.checks.push({
      id: 'no_manage_add_students',
      pass: !hasManageAdd(st.html),
      detail: hasManageAdd(st.html) ? 'manage/add found' : 'clean',
    });
  }

  // Academic page (unprotected?)
  if (cfg.testAcademic) {
    const ac = await fetchPage(jar, '/admin/academic');
    const protected_ = hasForbidden(ac.html);
    row.checks.push({
      id: 'academic_page',
      pass: !hasCrash(ac.html),
      detail: {
        status: ac.status,
        forbidden: protected_,
        loadsContent: ac.html.includes('academicCenter') || ac.html.includes('مركز'),
      },
    });
    row.academicUnprotected = !protected_ && user.role === 'admin';
  }

  // Attendance today
  if (user.permissions?.includes('view_attendance')) {
    const att = await fetchPage(jar, '/admin/attendance?date=today');
    row.checks.push({
      id: 'attendance_today',
      pass: att.status === 200 && !hasCrash(att.html) && !hasExcused(att.html),
      detail: `status=${att.status} excused=${hasExcused(att.html)}`,
    });
  }

  // Channels admin path
  if (user.permissions?.includes('view_channels')) {
    const ch = await fetchPage(jar, '/admin/channels');
    const usesAdmin =
      ch.html.includes('/admin/channels') &&
      !ch.html.match(/href="\/channels"/) &&
      !extractAdminNav(ch.html).includes('/teacher/channels');
    row.checks.push({
      id: 'channels_admin_route',
      pass: ch.status === 200 && !hasCrash(ch.html) && ch.html.includes('/admin/channels'),
      detail: 'uses /admin/channels',
    });
  }

  for (const c of row.checks) {
    if (!c.pass) row.pass = false;
  }
  report.accounts.push(row);
}

await runAccount({
  name: 'qa.pm',
  login: 'qa.pm',
  expectSwitcher: true,
  testSchoolSwitch: true,
  testAcademic: true,
});
await runAccount({
  name: 'qa.staff',
  login: 'qa.staff',
  expectSwitcher: false,
  testStaffForbidden: true,
  relaxedNav: true,
  testAcademic: true,
});
await runAccount({
  name: 'qa.supervisor',
  login: 'qa.supervisor',
  expectSwitcher: false,
  testNoManageButtons: true,
  testAcademic: true,
});
await runAccount({
  name: 'qa.schoolmgr',
  login: 'qa.schoolmgr',
  expectSwitcher: false,
  testAcademic: true,
});
await runAccount({ name: 'qa.teacher', login: 'qa.teacher', expectPortal: '/teacher' });
await runAccount({ name: 'qa.parent', login: 'qa.parent', expectPortal: '/parent' });
await runAccount({ name: 'qa.student', login: 'qa.student', expectPortal: '/student' });

const passCount = report.accounts.filter((a) => a.pass).length;
report.summary = {
  total: report.accounts.length,
  pass: passCount,
  fail: report.accounts.length - passCount,
  academicNeedsPatch: report.accounts.some((a) => a.academicUnprotected),
};

console.log(JSON.stringify(report, null, 2));
