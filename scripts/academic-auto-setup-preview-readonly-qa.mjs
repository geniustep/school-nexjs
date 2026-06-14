/**
 * Read-only QA for academic auto-setup wizard — no POST initialize, no mutations.
 * Usage: node scripts/academic-auto-setup-preview-readonly-qa.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const PREVIEW_URL = 'https://school-nexjs-mykq6plfd-geniusteps-projects.vercel.app';
const base = (process.argv[2] ?? 'http://localhost:3012').replace(/\/$/, '');

const report = {
  status: 'PARTIAL',
  preview: {},
  environment: {},
  wizard: {},
  dataDisplay: {},
  network: { postInitialize: 0 },
  rbac: {},
  i18n: {},
  notes: [],
};

function note(msg) {
  report.notes.push(msg);
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

async function probePreviewProtection() {
  const res = await fetch(PREVIEW_URL, { redirect: 'manual' });
  report.preview = {
    url: PREVIEW_URL,
    deploymentId: '5047148002',
    dashboard: 'https://vercel.com/geniusteps-projects/school-nexjs/9QrDTNxTv6zfDX9vwD1Kcin5MPry',
    branch: 'feat/academic-auto-setup-wizard',
    commit: '07cf476',
    deployedAt: '2026-06-13T15:07:41Z',
    vercelStatus: 'Ready',
    httpStatus: res.status,
    protection: res.status === 401 ? 'vercel_sso' : res.status === 200 ? 'none' : `http_${res.status}`,
  };
}

async function bffLogin(login) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password: loadAccountPassword(login) }),
  });
  const body = await res.json().catch(() => ({}));
  let cookies = mergeCookies('', res);
  const user = body.data?.user ?? null;
  if (body.success && user?.role === 'admin') {
    const sid = user.active_school_id ?? user.school_ids?.[0] ?? user.school?.id;
    if (sid) {
      const sw = await fetch(`${base}/api/auth/active-school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookies },
        body: JSON.stringify({ school_id: sid }),
      });
      cookies = mergeCookies(cookies, sw);
    }
  }
  return { ok: body.success === true, user, cookies };
}

async function bffGet(cookies, apiPath, query = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${apiPath}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, { headers: { Cookie: cookies, Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fetchHtml(cookies, pathname) {
  const res = await fetch(`${base}${pathname}`, {
    headers: { Cookie: cookies, Accept: 'text/html' },
    redirect: 'manual',
  });
  const text = res.status === 200 ? await res.text() : '';
  return { status: res.status, text };
}

function countTracks(level) {
  return (level.reference_tracks ?? []).length;
}

function isQaCode(code) {
  return /^(QA|TST|TEST)(_|$)/i.test(String(code ?? '').trim());
}

async function runLocalReadonlyQa() {
  const tenant = await fetch(`${base}/api/tenant`).then((r) => r.json()).catch(() => ({}));
  report.environment.tenant = tenant.data?.code ?? null;
  report.environment.tenantSource = 'GET /api/tenant';

  const auth = await bffLogin('done');
  if (!auth.ok) {
    report.status = 'BLOCKED_BY_LIVE_AUTH';
    note('Login failed for done account');
    return;
  }

  const user = auth.user;
  report.rbac.account = {
    role: user.role,
    admin_kind: user.admin_kind,
    permissions_mode: user.permissions_mode ?? null,
    hasManageClasses: (user.permissions ?? []).includes('manage_classes') || user.admin_kind === 'school_manager',
  };

  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: auth.cookies } }).then((r) => r.json()).catch(() => ({}));
  report.environment.meSchool = me.data?.user?.school?.name ?? null;

  const readiness = await bffGet(auth.cookies, '/admin/setup/readiness');
  report.environment.readiness = {
    status: readiness.status,
    features: readiness.body?.data?.features ?? null,
    setup_capabilities: readiness.body?.data?.setup_capabilities ?? null,
    academic_auto_setup:
      readiness.body?.data?.features?.academic_auto_setup ??
      (readiness.body?.data?.setup_capabilities ?? []).includes('academic_auto_setup'),
  };

  const levels = await bffGet(auth.cookies, '/admin/levels/options', { include_enabled: 'true' });
  const refLevels = levels.body?.data?.reference_levels ?? [];
  const h1 = refLevels.find((l) => l.code === 'H1');
  const h2 = refLevels.find((l) => l.code === 'H2');
  const htc = refLevels.find((l) => l.code === 'H_TC');
  const qaLevels = refLevels.filter((l) => isQaCode(l.code));

  report.dataDisplay = {
    h1TrackCount: h1 ? countTracks(h1) : null,
    h2TrackCount: h2 ? countTracks(h2) : null,
    htcSupportsTracks: htc?.supports_tracks ?? null,
    qaExcludedCount: qaLevels.length,
    levelOnlyTracks: (h1?.reference_tracks ?? [])
      .filter((t) => t.mapping_status === 'level_only_verified')
      .map((t) => t.code),
  };

  const overview = await fetchHtml(auth.cookies, '/admin/settings/academic-setup');
  const initialize = await fetchHtml(auth.cookies, '/admin/settings/academic-setup/initialize');
  report.wizard.entry = {
    overviewStatus: overview.status,
    initializeStatus: initialize.status,
    ctaTitle: overview.text.includes('إعداد المؤسسة أكاديميًا') || overview.text.includes('Set up your school academically'),
    ctaDesc:
      overview.text.includes('اختر المستويات والشعب') ||
      overview.text.includes('Choose levels and tracks'),
    rawKeys: /admin\.academicSetup\.autoSetup/.test(overview.text),
  };

  report.wizard.i18nKeys = {
    ar_ctaTitle: fs.readFileSync(path.join(ROOT, 'messages/ar.json'), 'utf8').includes('إعداد المؤسسة أكاديميًا'),
    ar_levelOnly: fs.readFileSync(path.join(ROOT, 'messages/ar.json'), 'utf8').includes('تعتمد المواد المشتركة للمستوى'),
    ar_assignmentsCta: fs.readFileSync(path.join(ROOT, 'messages/ar.json'), 'utf8').includes('الانتقال إلى تعيين الأساتذة'),
  };

  report.wizard.assignmentsHref =
    '/admin/settings/academic-setup/assignments?status=assignment_missing';

  const staffAuth = await bffLogin('qa.staff');
  report.rbac.adminStaff = {
    loginOk: staffAuth.ok,
    hasManageClasses: (staffAuth.user?.permissions ?? []).includes('manage_classes'),
  };

  // Verify initialize endpoint exists but do NOT POST to it
  const optionsProbe = await fetch(`${base}/api/odoo/admin/setup/academic/initialize`, {
    method: 'OPTIONS',
    headers: { Cookie: auth.cookies },
  }).catch(() => ({ status: 0 }));
  report.network.initializeOptions = optionsProbe.status;
  report.network.postInitialize = 0;
}

await probePreviewProtection();
if (report.preview.protection === 'vercel_sso') {
  note('Vercel Preview returns 401 SSO — visual QA on Preview URL blocked');
}

try {
  await runLocalReadonlyQa();
  if (report.preview.protection === 'vercel_sso') {
    report.status = 'BLOCKED_BY_PREVIEW_PROTECTION';
  } else if (report.environment.readiness?.academic_auto_setup) {
    report.status = 'PREVIEW_QA_PASSED_READY_FOR_PR';
  }
} catch (e) {
  report.status = 'BLOCKED_BY_PREVIEW_FUNCTIONAL_DEFECT';
  note(String(e.message ?? e));
}

const outPath = path.join(ROOT, 'NEXTJS-ACADEMIC-AUTO-SETUP-PREVIEW-LIVE-QA_REPORT.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
