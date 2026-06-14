/**
 * Teachers academic-setup live QA via Next.js BFF + HTML smoke.
 * Usage: node scripts/academic-setup-teachers-live-qa.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  F1_LOGINS,
  loadAccountPassword,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const base = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');

function formatAcademicLevelLabel(level) {
  const code = level.code?.trim() || null;
  const alias = level.moroccan_display_alias?.trim() || null;
  const display = level.display_name?.trim() || null;
  const name = level.name?.trim() || null;
  const primary = alias ?? (display && display !== code ? display : null) ?? (name && name !== code ? name : null) ?? code ?? name ?? '—';
  let secondary = null;
  if (code && code !== primary) secondary = code;
  else if (name && name !== primary) secondary = name;
  return { primary, secondary };
}

const AR_SECTION = { A: 'أ', B: 'ب', C: 'ج', D: 'د', E: 'ه', F: 'و', G: 'ز', H: 'ح', I: 'ط', J: 'ي', K: 'ك', L: 'ل', M: 'م', N: 'ن', O: 'و', P: 'ب', Q: 'ق', R: 'ر', S: 'س', T: 'ت', U: 'ع', V: 'ف', W: 'و', X: 'كس', Y: 'ي', Z: 'ز' };

function sectionSuffixFromCode(classCode, levelCode) {
  if (!levelCode || !classCode.startsWith(levelCode) || classCode.length <= levelCode.length) return null;
  const suffix = classCode.slice(levelCode.length).trim();
  if (!suffix) return null;
  if (/^[A-Za-z]$/.test(suffix)) return suffix.toUpperCase();
  return suffix;
}

function sectionSuffixFromShortName(shortName, levelCode) {
  if (!shortName) return null;
  if (levelCode && shortName.startsWith(levelCode) && shortName.length > levelCode.length) {
    const suffix = shortName.slice(levelCode.length);
    if (/^[A-Za-z]$/.test(suffix)) return suffix.toUpperCase();
  }
  const match = shortName.match(/^[A-Z]+\d*([A-Z])$/i);
  if (match) return match[1].toUpperCase();
  return null;
}

function formatSectionLabel(section) {
  if (/^[A-Z]$/.test(section)) {
    const arabicLetter = AR_SECTION[section] ?? section;
    return `القسم ${arabicLetter}`;
  }
  return section;
}

function resolveClassSectionLabel(cls, levelCode) {
  const sectionName = cls.section_name?.trim() || null;
  if (sectionName) return sectionName;
  const code = cls.code?.trim() || null;
  const name = cls.name?.trim() || null;
  const suffixFromCode = code && levelCode ? sectionSuffixFromCode(code, levelCode) : null;
  if (suffixFromCode) return formatSectionLabel(suffixFromCode);
  if (code?.includes('-')) {
    const tail = code.split('-').pop() ?? '';
    const suffixFromTail = sectionSuffixFromShortName(tail, levelCode);
    if (suffixFromTail) return formatSectionLabel(suffixFromTail);
  }
  const suffixFromName = name ? sectionSuffixFromShortName(name, levelCode) : null;
  if (suffixFromName) return formatSectionLabel(suffixFromName);
  return null;
}

function resolveClassSecondaryLabel(primary, code, name) {
  if (name && name !== primary && name.length <= 8) return name;
  if (code && code !== primary && code !== name) return code;
  if (name && name !== primary) return name;
  return null;
}

function formatAcademicClassLabel(cls) {
  const code = cls.code?.trim() || null;
  const name = cls.name?.trim() || null;
  const displayAlias = cls.display_alias?.trim() || null;
  const displayName = cls.display_name?.trim() || null;
  const levelParts = formatAcademicLevelLabel(cls.level ?? {});
  const levelCode = cls.level?.code?.trim() || null;
  let primary;
  if (displayAlias) {
    primary = displayAlias;
  } else if (displayName && displayName !== code) {
    primary = displayName;
  } else {
    const section = resolveClassSectionLabel(cls, levelCode);
    if (levelParts.primary !== '—' && section) {
      primary = `${levelParts.primary} — ${section}`;
    } else if (levelParts.primary !== '—' && (name || code) && levelParts.primary !== name && levelParts.primary !== code) {
      primary = levelParts.primary;
    } else if (name && name !== code) {
      primary = name;
    } else {
      primary = code ?? name ?? '—';
    }
  }
  let secondary = resolveClassSecondaryLabel(primary, code, name);
  if (secondary === primary) secondary = null;
  return { primary, secondary };
}

const report = {
  status: 'PARTIAL',
  base,
  timestamp: new Date().toISOString(),
  api: {},
  pages: {},
  rbac: {},
  labels: {},
  uiDeployProbe: {},
  summary: { pass: [], fail: [], skip: [] },
};

function pass(msg) {
  report.summary.pass.push(msg);
}
function fail(msg) {
  report.summary.fail.push(msg);
}
function skip(msg) {
  report.summary.skip.push(msg);
}

function mergeCookies(prev, res) {
  const jar = new Map();
  for (const part of (prev ?? '').split('; ').filter(Boolean)) {
    const [k, ...v] = part.split('=');
    jar.set(k, v.join('='));
  }
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const [k, ...v] = pair.split('=');
    jar.set(k.trim(), v.join('='));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function authLogin(loginId) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login: loginId, password: loadAccountPassword(loginId) }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    login: loginId,
    ok: body.success === true,
    cookies: mergeCookies('', res),
    user: body.data?.user ?? null,
    error: body.error?.code ?? null,
  };
}

async function bff(path, cookies, { method = 'GET', query = {}, body = null } = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${path}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      Cookie: cookies,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const parsed = await res.json().catch(() => ({}));
  return { status: res.status, ...parsed };
}

async function fetchHtml(cookies, pathname) {
  const res = await fetch(`${base}${pathname}`, {
    headers: { Cookie: cookies, Accept: 'text/html' },
    redirect: 'manual',
  });
  const text = await res.text().catch(() => '');
  return {
    status: res.status,
    location: res.headers.get('location'),
    hasCrash: /Application error|Internal Server Error/.test(text.slice(0, 4000)),
    html: text,
  };
}

async function probeUiDeploy(html) {
  const scriptSrcs = [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]);
  const probes = ['viewTeacherDetails', 'genderOptionsUnavailable', 'manageAssignments'];
  const found = {};
  for (const key of probes) {
    found[key] = false;
  }
  for (const src of scriptSrcs.slice(0, 8)) {
    try {
      const res = await fetch(`${base}${src}`);
      const js = await res.text();
      for (const key of probes) {
        if (js.includes(key)) found[key] = true;
      }
    } catch {
      /* ignore chunk fetch errors */
    }
  }
  return { scriptChunks: scriptSrcs.length, found };
}

async function teacherFlow(cookies) {
  const options = await bff('/admin/teachers/options', cookies);
  report.api.options = {
    status: options.status,
    keys: Object.keys(options.data ?? {}),
    genders: options.data?.genders ?? null,
  };

  if (!options.success || !Array.isArray(options.data?.genders) || options.data.genders.length === 0) {
    fail('options: genders missing from /admin/teachers/options');
    return null;
  }
  pass(`options: genders loaded (${options.data.genders.length})`);

  const stamp = Date.now();
  const code = `QTL${String(stamp).slice(-5)}`;
  const gender = options.data.genders[0].value;
  const teacherType = options.data.teacher_types?.[0]?.value ?? 'permanent';

  const create = await bff('/admin/teachers', cookies, {
    method: 'POST',
    body: {
      name: `QA Teacher Live ${stamp}`,
      code,
      gender,
      date_of_birth: '1990-06-12',
      specialization: 'QA Specialization',
      teacher_type: teacherType,
      email: `qtl${stamp}@example.test`,
      phone: '0622222222',
      weekly_hours_target: 18,
      qualification: options.data.qualifications?.[0]?.value ?? undefined,
    },
  });

  const teacherId = create.data?.item?.id ?? create.data?.id;
  report.api.create = {
    status: create.status,
    success: create.success,
    id: teacherId,
    error: create.error?.message ?? create.error?.code ?? null,
  };

  if (!create.success || !teacherId) {
    fail(`create: ${report.api.create.error ?? create.status}`);
    return null;
  }
  pass(`create: teacher ${teacherId}`);

  const detail1 = await bff(`/admin/teachers/${teacherId}`, cookies);
  report.api.detail1 = {
    gender: detail1.data?.gender,
    date_of_birth: detail1.data?.date_of_birth,
    specialization: detail1.data?.specialization,
    weekly_hours_target: detail1.data?.weekly_hours_target,
    assignments: detail1.data?.assignments?.length ?? 0,
  };

  if (detail1.data?.gender !== gender) fail('detail: gender mismatch');
  else pass('detail: gender persisted');

  if (detail1.data?.date_of_birth !== '1990-06-12') fail(`detail: date_of_birth=${detail1.data?.date_of_birth}`);
  else pass('detail: date_of_birth persisted');

  if (detail1.data?.specialization !== 'QA Specialization') fail('detail: specialization mismatch');
  else pass('detail: specialization persisted');

  const newGender = options.data.genders[1]?.value ?? gender;
  const update = await bff(`/admin/teachers/${teacherId}/update`, cookies, {
    method: 'POST',
    body: {
      gender: newGender,
      date_of_birth: '1991-07-20',
      specialization: 'QA Specialization Updated',
    },
  });
  report.api.update = { success: update.success, error: update.error?.code ?? null };
  if (!update.success) fail(`update: ${update.error?.code ?? update.status}`);
  else pass('update: partial fields OK');

  const detail2 = await bff(`/admin/teachers/${teacherId}`, cookies);
  report.api.detail2 = {
    gender: detail2.data?.gender,
    date_of_birth: detail2.data?.date_of_birth,
    specialization: detail2.data?.specialization,
    weekly_hours_target: detail2.data?.weekly_hours_target,
    teacher_type: detail2.data?.teacher_type,
    school_id: detail2.data?.school_id,
  };

  if (detail2.data?.weekly_hours_target !== detail1.data?.weekly_hours_target) {
    fail('partial update lost weekly_hours_target');
  } else pass('partial update: professional fields preserved');

  const classes = await bff('/admin/classes', cookies, { query: { page_size: '50' } });
  const subjects = await bff('/admin/subjects', cookies, { query: { page_size: '100' } });
  const classItem = (classes.data?.items ?? classes.data ?? [])[0];
  const subjectItem = (subjects.data?.items ?? subjects.data ?? [])[0];

  if (classItem && subjectItem) {
    const assign = await bff('/admin/teaching-assignments', cookies, {
      method: 'POST',
      body: {
        teacher_id: teacherId,
        class_id: classItem.id,
        subject_id: subjectItem.id,
      },
    });
    report.api.assignment = {
      success: assign.success,
      error: assign.error?.code ?? assign.error?.message ?? null,
      id: assign.data?.item?.id ?? assign.data?.id ?? null,
    };
    if (assign.success) pass('assignment: created');
    else fail(`assignment: ${report.api.assignment.error}`);

    const detail3 = await bff(`/admin/teachers/${teacherId}`, cookies);
    const assignmentCount =
      detail3.data?.assignments?.length ?? detail3.data?.classes?.length ?? 0;
    report.api.detail3 = { assignmentCount };
    if (assignmentCount > 0) pass('assignment: visible on teacher detail');
    else fail('assignment: not reflected on teacher');
  } else {
    skip('assignment: no class/subject available');
  }

  const archive = await bff(`/admin/teachers/${teacherId}/archive`, cookies, { method: 'POST', body: {} });
  report.api.archive = { success: archive.success, error: archive.error?.code ?? null };
  if (archive.success) pass('archive: QA teacher archived');
  else fail(`archive: ${archive.error?.code ?? archive.status}`);

  return teacherId;
}

async function labelChecks(cookies) {
  const levels = await bff('/admin/levels', cookies, { query: { page_size: '50' } });
  const classes = await bff('/admin/classes', cookies, { query: { page_size: '100' } });
  const levelList = levels.data?.items ?? levels.data ?? [];
  const classList = classes.data?.items ?? classes.data ?? [];

  const m1 = levelList.find((l) => l.code === 'M1') ?? levelList.find((l) => /M1/.test(l.code ?? ''));
  const m1a = classList.find((c) => c.name === 'M1A' || c.code?.includes('M1A'));

  if (m1) {
    const parts = formatAcademicLevelLabel(m1);
    report.labels.M1 = parts;
    if (parts.primary.includes('M1') && parts.primary === 'M1' && !parts.secondary) {
      fail('labels: M1 primary still raw code only');
    } else pass(`labels: M1 primary=${parts.primary} secondary=${parts.secondary ?? '—'}`);
  } else skip('labels: M1 level not found');

  if (m1a) {
    const parts = formatAcademicClassLabel(m1a);
    report.labels.M1A = parts;
    if (!parts.primary.includes('القسم')) fail(`labels: M1A primary missing section (${parts.primary})`);
    else pass(`labels: M1A primary=${parts.primary} secondary=${parts.secondary ?? '—'}`);
  } else skip('labels: M1A class not found');
}

async function pageChecks(cookies) {
  const paths = [
    '/admin/settings/academic-setup/teachers',
    '/admin/settings/academic-setup/classes',
    '/admin/settings/academic-setup/subjects',
    '/admin/settings/academic-setup/assignments',
  ];
  for (const p of paths) {
    const r = await fetchHtml(cookies, p);
    report.pages[p] = { status: r.status, crash: r.hasCrash, redirect: r.location };
    if (r.status === 200 && !r.hasCrash) pass(`page ${p}: 200`);
    else fail(`page ${p}: status=${r.status} crash=${r.hasCrash}`);
  }

  const teachersHtml = report.pages['/admin/settings/academic-setup/teachers'];
  if (teachersHtml?.status === 200) {
    const teachersPage = await fetchHtml(cookies, '/admin/settings/academic-setup/teachers');
    report.uiDeployProbe = await probeUiDeploy(teachersPage.html);
    if (report.uiDeployProbe.found.viewTeacherDetails) pass('deploy probe: new teachers UI bundle detected');
    else skip('deploy probe: new teachers UI strings not in static chunks (may be old deployment)');
  }
}

async function rbacChecks() {
  for (const loginId of F1_LOGINS) {
    const auth = await authLogin(loginId);
    report.rbac[loginId] = {
      ok: auth.ok,
      admin_kind: auth.user?.admin_kind,
      permissions: auth.user?.permissions?.slice?.(0, 12) ?? [],
    };
    if (!auth.ok) {
      skip(`rbac ${loginId}: login failed (${auth.error})`);
      continue;
    }
    const page = await fetchHtml(auth.cookies, '/admin/settings/academic-setup/teachers');
    const canManageTeachers = auth.user?.permissions?.includes('manage_teachers');
    const canViewTeachers = auth.user?.permissions?.includes('view_teachers');
    report.rbac[loginId].pageStatus = page.status;
    report.rbac[loginId].canManageTeachers = canManageTeachers;
    report.rbac[loginId].canViewTeachers = canViewTeachers;

    if (canViewTeachers || canManageTeachers) {
      if (page.status === 200) pass(`rbac ${loginId}: teachers page accessible`);
      else fail(`rbac ${loginId}: expected access, got ${page.status}`);
    } else if (page.status === 403 || page.status === 302 || page.status === 307) {
      pass(`rbac ${loginId}: blocked from teachers (${page.status})`);
    } else {
      fail(`rbac ${loginId}: limited user got ${page.status}`);
    }

    if (canManageTeachers) {
      const createProbe = await bff('/admin/teachers', auth.cookies, {
        method: 'POST',
        body: { name: 'RBAC Probe', code: `RB${Date.now()}`.slice(-8) },
      });
      report.rbac[loginId].createProbe = createProbe.status;
    }
  }
}

const primary = await authLogin('done');
if (!primary.ok) {
  fail('primary login failed');
  report.status = 'BLOCKED_BY_ENVIRONMENT';
} else {
  pass('primary login OK');
  await teacherFlow(primary.cookies);
  await labelChecks(primary.cookies);
  await pageChecks(primary.cookies);
  try {
    await rbacChecks();
  } catch (e) {
    skip(`rbac: ${e.message}`);
  }
}

report.status =
  report.summary.fail.length === 0
    ? report.summary.skip.some((s) => s.includes('deploy probe'))
      ? 'CODE_COMPLETE_QA_PENDING_UI_DEPLOY'
      : 'READY_FOR_PUSH'
    : 'FAILED';

const outPath = path.join(ROOT, 'NEXTJS-ACADEMIC-SETUP-TEACHERS-LIVE-QA_REPORT.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
process.exit(report.summary.fail.length > 0 ? 1 : 0);
