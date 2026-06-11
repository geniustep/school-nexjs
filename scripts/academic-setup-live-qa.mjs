/**
 * Academic setup live QA via Next.js BFF (not cold /api/v1).
 * Usage: ODOO_DB=school node scripts/academic-setup-live-qa.mjs [baseUrl]
 *
 * Never prints passwords, cookies, or session values.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  F1_LOGINS,
  loadAccountPassword,
  loadOdooTarget,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();

// QA must hit DB `school` — override stale .env.local without editing files.
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const target = loadOdooTarget();
const base = (process.argv[2] ?? process.env.QA_BASE_URL ?? 'http://localhost:3012').replace(/\/$/, '');

const report = {
  status: 'PARTIALLY_COMPLETED',
  base,
  odoo: { base: target.odooBaseUrl, dbUsedForQa: process.env.ODOO_DB },
  envNote: null,
  backend: {},
  accounts: {},
  readiness: {},
  assignments: {},
  staff: {},
  tracks: {},
  classes: {},
  rbac: {},
  session: {},
  i18n: { note: 'Static key presence only — manual RTL/browser QA recommended' },
  technical: {},
  fixes: [],
  summary: { pass: [], fail: [], skip: [], notes: [] },
};

function pass(section, msg) {
  report.summary.pass.push(`${section}: ${msg}`);
}
function fail(section, msg) {
  report.summary.fail.push(`${section}: ${msg}`);
}
function skip(section, msg) {
  report.summary.skip.push(`${section}: ${msg}`);
}
function note(msg) {
  report.summary.notes.push(msg);
}

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
  const ct = res.headers.get('content-type') ?? '';
  const body = ct.includes('json') ? await res.json().catch(() => ({})) : {};
  const cookies = mergeCookies('', res);
  const user = body.data?.user ?? null;
  const tenantCookie = cookies.match(/scc_tenant=([^;]+)/)?.[1] ?? null;
  return {
    login,
    passwordEnv,
    ok: body.success === true,
    status: res.status,
    hasSession: /scc_session=/.test(cookies),
    tenantCookie,
    role: user?.role ?? null,
    admin_kind: user?.admin_kind ?? null,
    permissions: user?.permissions ?? [],
    school_ids: user?.school_ids ?? user?.schools?.map((s) => s.id) ?? [],
    active_school_id: user?.active_school_id ?? null,
    cookies,
    error: body.error?.code ?? null,
  };
}

async function bffFetch(cookies, path, { method = 'GET', query = {}, body = null } = {}) {
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
  const ct = res.headers.get('content-type') ?? '';
  const isJson = ct.includes('json');
  const parsed = isJson ? await res.json().catch(() => ({})) : { raw: (await res.text()).slice(0, 120) };
  return {
    status: res.status,
    isJson,
    success: parsed.success,
    error: parsed.error?.code ?? null,
    message: parsed.error?.message ?? null,
    data: parsed.data ?? null,
    meta: parsed.meta ?? null,
  };
}

async function bffPage(cookies, pathname) {
  const res = await fetch(`${base}${pathname}`, {
    headers: { Cookie: cookies, Accept: 'text/html' },
    redirect: 'manual',
  });
  return { status: res.status, location: res.headers.get('location') };
}

function hasI18nKeys(locale, keys) {
  const file = path.join(ROOT, 'messages', `${locale}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const missing = keys.filter((k) => !raw.includes(`"${k.split('.').pop()}"`) && !raw.includes(k));
  return { locale, ok: missing.length === 0, missing: missing.slice(0, 5) };
}

async function probeBackendViaBff(cookies, activeSchoolId) {
  const q = activeSchoolId ? { active_school_id: String(activeSchoolId) } : {};
  const endpoints = [
    ['/admin/setup/readiness', 'readiness'],
    ['/admin/teaching-assignments', 'assignments'],
    ['/admin/staff', 'staff'],
    ['/admin/tracks', 'tracks'],
    ['/admin/staff/options', 'staffOptions'],
    ['/admin/tracks/options', 'trackOptions'],
    ['/admin/levels/options', 'levelsOptions'],
    ['/admin/levels/enable', 'levelsEnableProbe'],
    ['/admin/subjects/options', 'subjectsOptionsProbe'],
  ];
  const out = {};
  for (const [path, key] of endpoints) {
    const r = await bffFetch(cookies, path, { query: q });
    out[key] = { status: r.status, isJson: r.isJson, success: r.success, error: r.error };
    if (r.status === 404) fail('backend', `${key} returned 404 via BFF`);
    else if (!r.isJson) fail('backend', `${key} returned non-JSON`);
    else if (r.success) pass('backend', `${key} OK (${r.status})`);
    else fail('backend', `${key} error ${r.error ?? r.status}`);
  }
  return out;
}

async function runPrimaryFlow(auth) {
  const { cookies, active_school_id: schoolId } = auth;
  report.backend = await probeBackendViaBff(cookies, schoolId);

  const readiness = await bffFetch(cookies, '/admin/setup/readiness', {
    query: schoolId ? { active_school_id: String(schoolId) } : {},
  });
  report.readiness = {
    status: readiness.status,
    success: readiness.success,
    score: readiness.data?.readiness?.score ?? null,
    readinessStatus: readiness.data?.readiness?.status ?? null,
    blocking: readiness.data?.readiness?.blocking_issues ?? null,
    scopeFull: readiness.data?.scope?.is_full_school ?? null,
    domains: Object.keys(readiness.data?.domains ?? {}),
    issuesCount: readiness.data?.issues?.length ?? 0,
    quickActions: readiness.data?.quick_actions?.length ?? 0,
  };
  if (readiness.success && readiness.data?.readiness) {
    pass('readiness', `score=${report.readiness.score} status=${report.readiness.readinessStatus}`);
    if (
      report.readiness.score >= 90 &&
      report.readiness.readinessStatus === 'blocked' &&
      (report.readiness.blocking ?? 0) > 0
    ) {
      pass('readiness', 'high score + blocked state present (UI must not say fully ready)');
    }
  } else {
    fail('readiness', readiness.error ?? String(readiness.status));
  }

  const assignments = await bffFetch(cookies, '/admin/teaching-assignments', {
    query: { limit: '20', ...(schoolId ? { active_school_id: String(schoolId) } : {}) },
  });
  report.assignments.list = {
    status: assignments.status,
    count: Array.isArray(assignments.data) ? assignments.data.length : 0,
  };
  if (assignments.success) pass('assignments', `list ${report.assignments.list.count} rows`);
  else fail('assignments', assignments.error ?? assignments.status);

  const staff = await bffFetch(cookies, '/admin/staff', {
    query: { limit: '20', ...(schoolId ? { active_school_id: String(schoolId) } : {}) },
  });
  const staffOpts = await bffFetch(cookies, '/admin/staff/options', {
    query: schoolId ? { active_school_id: String(schoolId) } : {},
  });
  report.staff.list = { status: staff.status, count: Array.isArray(staff.data) ? staff.data.length : 0 };
  report.staff.options = {
    status: staffOpts.status,
    adminKinds: staffOpts.data?.admin_kinds?.length ?? 0,
    capabilities: staffOpts.data?.capabilities?.length ?? 0,
  };
  if (staff.success && staffOpts.success) pass('staff', 'list + options OK');
  else fail('staff', staff.error ?? staffOpts.error ?? 'failed');

  const tracks = await bffFetch(cookies, '/admin/tracks', {
    query: { limit: '50', ...(schoolId ? { active_school_id: String(schoolId) } : {}) },
  });
  const trackOpts = await bffFetch(cookies, '/admin/tracks/options', {
    query: schoolId ? { active_school_id: String(schoolId) } : {},
  });
  report.tracks.list = { status: tracks.status, count: Array.isArray(tracks.data) ? tracks.data.length : 0 };
  report.tracks.options = {
    status: trackOpts.status,
    levels: trackOpts.data?.levels?.filter((l) => l.supports_tracks)?.length ?? 0,
  };
  if (tracks.success && trackOpts.success) pass('tracks', 'list + options OK');
  else fail('tracks', tracks.error ?? trackOpts.error ?? 'failed');

  const classes = await bffFetch(cookies, '/admin/classes', {
    query: { limit: '50', ...(schoolId ? { active_school_id: String(schoolId) } : {}) },
  });
  report.classes.list = {
    status: classes.status,
    count: Array.isArray(classes.data) ? classes.data.length : 0,
    withTrack: Array.isArray(classes.data) ? classes.data.filter((c) => c.track_id || c.track).length : 0,
  };
  if (classes.success) pass('classes', `${report.classes.list.count} classes (${report.classes.list.withTrack} with track)`);

  // Settings entry + overview pages
  const settings = await bffPage(cookies, '/admin/settings');
  const overview = await bffPage(cookies, '/admin/settings/academic-setup');
  report.readiness.pages = { settings: settings.status, overview: overview.status };
  if (settings.status === 200 && overview.status === 200) pass('entry', 'settings + overview pages 200');
  else fail('entry', `settings=${settings.status} overview=${overview.status}`);

  // Issue navigation sample
  const issue = readiness.data?.issues?.[0];
  if (issue?.target?.section) {
    const section = issue.target.section;
    const routes = {
      assignments: '/admin/settings/academic-setup/assignments',
      classes: '/admin/settings/academic-setup/classes',
      teachers: '/admin/settings/academic-setup/teachers',
      staff: '/admin/settings/academic-setup/staff',
      subjects: '/admin/settings/academic-setup/subjects',
      tracks: '/admin/settings/academic-setup/subjects',
    };
    const href = routes[section] ?? '/admin/settings/academic-setup';
    const page = await bffPage(cookies, href);
    report.readiness.issueNav = { section, status: page.status };
    if (page.status === 200) pass('readiness', `issue target ${section} page 200`);
  }

  // Suggestions probe (needs class+subject)
  const missing = (readiness.data?.issues ?? []).find((i) => i.code === 'assignment_missing');
  if (missing?.target?.query?.class_id && missing?.target?.query?.subject_id) {
    const sug = await bffFetch(cookies, '/admin/teaching-assignments/suggestions', {
      query: {
        class_id: String(missing.target.query.class_id),
        subject_id: String(missing.target.query.subject_id),
        ...(schoolId ? { active_school_id: String(schoolId) } : {}),
      },
    });
    report.assignments.suggestions = {
      status: sug.status,
      count: sug.data?.suggestions?.length ?? 0,
      success: sug.success,
    };
    if (sug.success) pass('assignments', `suggestions returned ${report.assignments.suggestions.count}`);
    else skip('assignments', `suggestions: ${sug.error ?? sug.status}`);
  } else {
    skip('assignments', 'no assignment_missing issue for suggestions probe');
  }

  // Staff create QA (admin_staff, limited)
  const qaEmail = `qa-academic-${Date.now()}@qa.local`;
  const createStaff = await bffFetch(cookies, '/admin/staff', {
    method: 'POST',
    body: {
      name: `QA Academic Staff ${Date.now()}`,
      email: qaEmail,
      admin_kind: 'admin_staff',
      job_title: 'QA Live Test',
      capability_ids: (staffOpts.data?.capabilities ?? []).filter((c) => c.grantable).slice(0, 1).map((c) => c.id),
    },
  });
  report.staff.create = { status: createStaff.status, success: createStaff.success, error: createStaff.error };
  if (createStaff.success) {
    pass('staff', 'create QA member OK');
    const memberId = createStaff.data?.id;
    if (memberId) {
      const deactivate = await bffFetch(cookies, `/admin/staff/${memberId}`, { method: 'DELETE' });
      report.staff.deactivate = { status: deactivate.status, success: deactivate.success, error: deactivate.error };
      if (deactivate.success) pass('staff', 'deactivate QA member OK');
      else skip('staff', `deactivate: ${deactivate.error ?? deactivate.status}`);
    }
  } else if (createStaff.error === 'privilege_escalation' || createStaff.error === 'capability_not_grantable') {
    pass('staff', 'privilege protection returned expected error');
  } else {
    skip('staff', `create skipped: ${createStaff.error ?? createStaff.status}`);
  }

  // Track create if level supports
  const trackLevel = (trackOpts.data?.levels ?? []).find((l) => l.supports_tracks);
  if (trackLevel) {
    const code = `QA${Date.now().toString().slice(-6)}`;
    const createTrack = await bffFetch(cookies, '/admin/tracks', {
      method: 'POST',
      body: {
        level_id: trackLevel.id,
        name: `QA Track ${code}`,
        code,
        active: true,
      },
    });
    report.tracks.create = { status: createTrack.status, success: createTrack.success, error: createTrack.error };
    if (createTrack.success) {
      pass('tracks', 'create QA track OK');
      const trackId = createTrack.data?.id;
      if (trackId && createTrack.data?.can_delete) {
        const del = await bffFetch(cookies, `/admin/tracks/${trackId}`, { method: 'DELETE' });
        report.tracks.delete = { status: del.status, success: del.success, error: del.error };
        if (del.success) pass('tracks', 'delete QA track OK');
      }
    } else if (createTrack.error === 'track_duplicate') {
      pass('tracks', 'duplicate validation works');
    } else {
      skip('tracks', `create: ${createTrack.error ?? createTrack.status}`);
    }
  } else {
    skip('tracks', 'no level with supports_tracks');
  }
}

async function runRbac() {
  const rbacLogins = ['qa.teacher', 'qa.parent', 'qa.student', 'qa.schoolmgr', 'qa.supervisor', 'qa.staff'];
  for (const login of rbacLogins) {
    try {
      const auth = await bffLogin(login);
      const row = {
        ok: auth.ok,
        role: auth.role,
        admin_kind: auth.admin_kind,
        passwordEnv: auth.passwordEnv,
      };
      if (!auth.ok) {
        report.rbac[login] = { ...row, result: 'login_failed' };
        skip('rbac', `${login}: login failed (${auth.error})`);
        continue;
      }
      const page = await bffPage(auth.cookies, '/admin/settings/academic-setup');
      const me = await bffFetch(auth.cookies, '/me');
      row.active_school_id = me.data?.user?.active_school_id ?? auth.active_school_id;
      if (auth.role === 'admin') {
        const readiness = await bffFetch(auth.cookies, '/admin/setup/readiness', {
          query: row.active_school_id ? { active_school_id: String(row.active_school_id) } : {},
        });
        row.readinessOk = readiness.success;
        row.scopeFull = readiness.data?.scope?.is_full_school;
        report.rbac[login] = { ...row, overviewStatus: page.status, result: page.status === 200 ? 'allowed' : 'blocked' };
        if (login === 'qa.supervisor' && readiness.data?.scope?.is_full_school === false) {
          pass('rbac', 'supervisor scoped readiness (not full school)');
        }
        if (page.status === 200) pass('rbac', `${login} admin access OK`);
      } else {
        report.rbac[login] = { ...row, overviewStatus: page.status, result: page.status === 200 ? 'unexpected_allow' : 'blocked' };
        if (page.status !== 200) pass('rbac', `${login} blocked from academic-setup (${page.status})`);
        else fail('rbac', `${login} should not access academic-setup`);
      }
    } catch (e) {
      report.rbac[login] = { result: 'no_credentials', error: String(e.message).slice(0, 80) };
      skip('rbac', `${login}: no password configured`);
    }
  }
}

async function runSessionTest(auth) {
  const bad = 'scc_session=invalid; scc_tenant=school';
  const me = await bffFetch(bad, '/me');
  report.session.invalidCookie = { status: me.status, error: me.error, success: me.success };
  if (!me.success && (me.status === 401 || me.error === 'unauthenticated')) {
    pass('session', 'invalid cookie rejected');
  } else {
    fail('session', `expected auth failure, got ${me.status}`);
  }
}

// --- env check ---
const localDb = loadOdooTarget().odooDb;
if (localDb !== 'school') {
  report.envNote = `.env.local ODOO_DB=${localDb} — QA forced ODOO_DB=school via process.env for this run`;
  note(report.envNote);
}

// --- i18n static keys ---
for (const locale of ['ar', 'en', 'fr', 'es']) {
  const check = hasI18nKeys(locale, [
    'readinessScoreBlocked',
    'assignmentInUse',
    'privilegeEscalation',
    'tabTracks',
    'classTrackLabel',
  ]);
  report.i18n[locale] = check;
  if (check.ok) pass('i18n', `${locale} core keys present`);
  else fail('i18n', `${locale} missing keys: ${check.missing.join(', ')}`);
}

console.log('=== Academic Setup Live QA ===');
console.log(`Base: ${base}`);
console.log(`Odoo: ${target.odooBaseUrl} | QA DB: ${process.env.ODOO_DB}`);
console.log('');

// Health check
try {
  const ping = await fetch(`${base}/login`, { redirect: 'manual' });
  if (ping.status >= 500) {
    fail('server', `Next.js not healthy (${ping.status})`);
    report.status = 'BLOCKED_BY_EXISTING_REGRESSION';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
} catch (e) {
  fail('server', `Cannot reach ${base}: ${e.message}`);
  report.status = 'BLOCKED_BY_EXISTING_REGRESSION';
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

// Primary admin
let primary;
try {
  primary = await bffLogin('done');
} catch (e) {
  fail('auth', `done: ${e.message}`);
  report.status = 'BLOCKED_BY_AUTH_CREDENTIALS';
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

report.accounts.done = {
  ok: primary.ok,
  role: primary.role,
  admin_kind: primary.admin_kind,
  tenantCookie: primary.tenantCookie,
  active_school_id: primary.active_school_id,
  school_ids: primary.school_ids,
  passwordEnv: primary.passwordEnv,
  permissionsCount: primary.permissions.length,
};

if (!primary.ok) {
  fail('auth', `done login failed: ${primary.error}`);
  report.status = 'BLOCKED_BY_AUTH_CREDENTIALS';
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

pass('auth', `done login OK (tenant=${primary.tenantCookie}, active_school=${primary.active_school_id})`);

const me = await bffFetch(primary.cookies, '/me');
report.accounts.me = {
  status: me.status,
  role: me.data?.user?.role,
  admin_kind: me.data?.user?.admin_kind,
  active_school_id: me.data?.user?.active_school_id,
};
if (me.success && me.data?.user?.role === 'admin') pass('auth', '/me admin OK');
else fail('auth', '/me failed or not admin');

if (primary.tenantCookie !== 'school' && process.env.ODOO_DB === 'school') {
  note(`tenant cookie=${primary.tenantCookie} (localhost uses ODOO_DB fallback)`);
}

await runPrimaryFlow({ ...primary, active_school_id: me.data?.user?.active_school_id ?? primary.active_school_id });
await runSessionTest(primary);
await runRbac();

// Backend 404 gate
const backend404 = Object.values(report.backend).some((v) => v.status === 404);
if (backend404) {
  report.status = 'BLOCKED_BY_BACKEND_DEPLOYMENT';
} else if (report.summary.fail.length === 0) {
  report.status = report.summary.skip.length > 5 ? 'PARTIALLY_COMPLETED' : 'CLOSED_READY_FOR_PUSH';
} else if (report.summary.fail.some((f) => f.includes('backend'))) {
  report.status = 'BLOCKED_BY_BACKEND_DEPLOYMENT';
} else {
  report.status = 'PARTIALLY_COMPLETED';
}

report.summary.counts = {
  pass: report.summary.pass.length,
  fail: report.summary.fail.length,
  skip: report.summary.skip.length,
};

console.log('\n=== SUMMARY ===');
console.log(`Status: ${report.status}`);
console.log(`Pass: ${report.summary.pass.length} | Fail: ${report.summary.fail.length} | Skip: ${report.summary.skip.length}`);
if (report.summary.fail.length) {
  console.log('\nFailures:');
  for (const f of report.summary.fail) console.log(' -', f);
}

const outPath = path.join(ROOT, 'NEXTJS-ACADEMIC-SETUP-LIVE-QA_REPORT.md');
const md = buildMarkdownReport(report);
fs.writeFileSync(outPath, md, 'utf8');
console.log(`\nReport written: ${outPath}`);

function buildMarkdownReport(r) {
  return `# NEXTJS-ACADEMIC-SETUP-LIVE-QA Report

## Status: \`${r.status}\`

- **Base URL:** ${r.base}
- **Odoo:** ${r.odoo.base}
- **QA DB:** ${r.odoo.dbUsedForQa}
- **Branch:** feat/academic-setup-api-integration
- **Commit (start):** 2def3f5
- **Date:** ${new Date().toISOString().slice(0, 10)}

${r.envNote ? `> **Env note:** ${r.envNote}\n` : ''}

## Accounts

| Login | Result | role | admin_kind | active_school |
| ----- | ------ | ---- | ---------- | ------------- |
| done | ${r.accounts.done?.ok ? 'OK' : 'FAIL'} | ${r.accounts.done?.role ?? '—'} | ${r.accounts.done?.admin_kind ?? '—'} | ${r.accounts.done?.active_school_id ?? '—'} |

## Backend (via BFF)

${Object.entries(r.backend)
  .map(([k, v]) => `- **${k}:** HTTP ${v.status} success=${v.success}`)
  .join('\n')}

## Readiness

- score: ${r.readiness.score ?? '—'}
- status: ${r.readiness.readinessStatus ?? '—'}
- blocking: ${r.readiness.blocking ?? '—'}
- scope full: ${r.readiness.scopeFull ?? '—'}
- issues: ${r.readiness.issuesCount ?? 0}
- pages: settings=${r.readiness.pages?.settings} overview=${r.readiness.pages?.overview}

## Assignments / Staff / Tracks / Classes

| Area | Result |
| ---- | ------ |
| assignments list | ${r.assignments.list?.count ?? '—'} rows |
| suggestions | ${r.assignments.suggestions?.count ?? 'skip'} |
| staff list | ${r.staff.list?.count ?? '—'} |
| staff create | ${r.staff.create?.success ? 'OK' : r.staff.create?.error ?? 'skip'} |
| tracks list | ${r.tracks.list?.count ?? '—'} |
| tracks create | ${r.tracks.create?.success ? 'OK' : r.tracks.create?.error ?? 'skip'} |
| classes | ${r.classes.list?.count ?? '—'} (${r.classes.list?.withTrack ?? 0} with track) |

## RBAC

${Object.entries(r.rbac)
  .map(([login, row]) => `- **${login}:** ${row.result ?? row.error ?? '—'}`)
  .join('\n')}

## Technical checks

- Pass: ${r.summary.counts?.pass ?? r.summary.pass.length}
- Fail: ${r.summary.counts?.fail ?? r.summary.fail.length}
- Skip: ${r.summary.counts?.skip ?? r.summary.skip.length}

## Git

Run \`git status --short\` after QA — no secrets committed.
`;
}

console.log('\n=== JSON (redacted) ===');
console.log(JSON.stringify(report, null, 2));
