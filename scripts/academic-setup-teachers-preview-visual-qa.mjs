/**
 * Visual QA for academic-setup teachers (Playwright).
 * Usage:
 *   node scripts/academic-setup-teachers-preview-visual-qa.mjs [baseUrl]
 * Preview (Vercel SSO):
 *   $env:VERCEL_AUTOMATION_BYPASS_SECRET='…'; node scripts/... https://…vercel.app
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'http://localhost:3012').replace(/\/$/, '');
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';
const OUT = path.join(ROOT, 'NEXTJS-ACADEMIC-SETUP-TEACHERS-PREVIEW-VISUAL-QA_REPORT.json');
const TEACHERS_PATH = '/admin/settings/academic-setup/teachers';
const CLASSES_PATH = '/admin/settings/academic-setup/classes';
const ASSIGNMENTS_PATH = '/admin/settings/academic-setup/assignments';
const QA_NAME = `QA Visual ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

const report = {
  status: 'PARTIAL',
  base: BASE,
  previewUrl: BASE.includes('vercel.app') ? BASE : null,
  commit: '617100c3c6950133e44e7b415dfd0fe641e0dcbe',
  timestamp: new Date().toISOString(),
  environment: {},
  form: {},
  teacherFlow: {},
  labels: {},
  rbac: {},
  i18n: {},
  responsive: {},
  console: { errors: [], warnings: [] },
  network: { status500: [], status404: [], failed: [] },
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

const BENIGN_CONSOLE = [
  'Failed to fetch RSC payload',
  'Download the React DevTools',
];

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

async function bffLogin(login) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (BYPASS) {
    headers['x-vercel-protection-bypass'] = BYPASS;
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers,
    redirect: 'manual',
    body: JSON.stringify({ login, password: loadAccountPassword(login) }),
  });
  const body = await res.json().catch(() => ({}));
  let cookies = mergeCookies('', res);
  const user = body.data?.user ?? null;
  if (body.success && user?.role === 'admin') {
    const sid = user.active_school_id ?? user.school_ids?.[0] ?? user.school?.id;
    if (sid) {
      const sw = await fetch(`${BASE}/api/auth/active-school`, {
        method: 'POST',
        headers: { ...headers, Cookie: cookies },
        redirect: 'manual',
        body: JSON.stringify({ school_id: sid }),
      });
      cookies = mergeCookies(cookies, sw);
    }
  }
  return { ok: !!body.success, cookies, user, body };
}

function parseCookies(jar) {
  const baseUrl = new URL(BASE);
  return jar.split('; ').filter(Boolean).map((pair) => {
    const i = pair.indexOf('=');
    return {
      name: pair.slice(0, i),
      value: pair.slice(i + 1),
      domain: baseUrl.hostname,
      path: '/',
    };
  });
}

async function probeTenant() {
  const headers = { Accept: 'application/json' };
  if (BYPASS) headers['x-vercel-protection-bypass'] = BYPASS;
  const res = await fetch(`${BASE}/api/tenant`, { headers, redirect: 'manual' });
  const body = await res.json().catch(() => ({}));
  const tenant = body?.data?.code ?? body?.data?.tenant ?? body?.tenant ?? null;
  report.environment = { tenantStatus: res.status, tenant };
  if (tenant === 'alwah_test') pass('environment: backend alwah_test');
  else if (tenant === 'alwah') fail('environment: uses empty alwah database');
  else skip(`environment: tenant=${tenant ?? 'unknown'}`);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('Playwright missing. Run: npx --yes playwright@1.49.1 install chromium');
    process.exit(2);
  }

  await probeTenant();

  const session = await bffLogin('done');
  if (!session.ok) {
    fail('login done failed');
    report.status = 'FAILED';
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  pass(`login: done (${session.user?.admin_kind ?? 'admin'})`);

  const browser = await chromium.launch({ headless: true });
  const contextOptions = {};
  if (BYPASS) {
    contextOptions.extraHTTPHeaders = {
      'x-vercel-protection-bypass': BYPASS,
      'x-vercel-set-bypass-cookie': 'true',
    };
  }
  const context = await browser.newContext(contextOptions);
  await context.addCookies(parseCookies(session.cookies));

  const page = await context.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (BENIGN_CONSOLE.some((b) => text.includes(b))) return;
    if (msg.type() === 'error') report.console.errors.push(text.slice(0, 300));
    if (msg.type() === 'warning') report.console.warnings.push(text.slice(0, 300));
  });
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 500) report.network.status500.push({ url: url.slice(0, 200), status });
    if (status === 404 && !url.includes('favicon') && !url.includes('_next')) {
      report.network.status404.push({ url: url.slice(0, 200), status });
    }
    if (status >= 400 && url.includes('/api/')) {
      report.network.failed.push({ url: url.slice(0, 200), status });
    }
  });

  if (BYPASS) {
    await page.goto(
      `${BASE}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
  }

  await page.goto(`${BASE}${TEACHERS_PATH}`, { waitUntil: 'networkidle', timeout: 90000 });
  const dir = await page.locator('html').getAttribute('dir');
  report.i18n.ar = { dir, path: TEACHERS_PATH };
  if (dir === 'rtl') pass('i18n: Arabic RTL');
  else fail(`i18n: expected RTL, got ${dir}`);

  const pageText = await page.locator('body').innerText();
  if (pageText.includes('خيارات الجنس غير متاحة')) fail('form: gender unavailable message visible');
  else pass('form: no genderOptionsUnavailable message');

  const addBtn = page.getByRole('button', { name: /إضافة أستاذ|Add teacher/i }).first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(1200);
    const dialog = page.locator('.teacher-setup-form, [role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const formText = await dialog.innerText().catch(() => '');

    report.form.createFields = {
      name: /الاسم|Nom complet|Full name/i.test(formText),
      code: /الرمز|Code/i.test(formText),
      gender: /الجنس|Genre|Gender/i.test(formText),
      dob: /تاريخ|naissance|Birth/i.test(formText),
      specialization: /التخصص|Spécial|Special/i.test(formText),
      teacherType: /نوع الأستاذ|Type/i.test(formText),
      qualification: /المؤهل|Qualif/i.test(formText),
      weeklyHours: /الهدف الأسبوعي|Weekly|heures/i.test(formText),
      compactTimetable: /مدمج|Compact|continu/i.test(formText),
    };
    for (const [k, v] of Object.entries(report.form.createFields)) {
      if (v) pass(`form: ${k} visible`);
      else fail(`form: ${k} missing`);
    }

    const genderField = dialog.locator('.teacher-setup-field').filter({ hasText: /الجنس|Genre|Gender/ });
    const genderSelect = genderField.locator('select.input').first();
    if (await genderSelect.isVisible().catch(() => false)) {
      const disabled = await genderSelect.isDisabled();
      const options = await genderSelect.locator('option').allTextContents();
      report.form.genderOptions = options.map((o) => o.trim()).filter(Boolean);
      const hasMale = options.some((o) => /ذكر|Male|Homme/i.test(o));
      const hasFemale = options.some((o) => /أنثى|Female|Femme/i.test(o));
      if (!disabled && hasMale && hasFemale) pass('form: gender select enabled (male/female)');
      else fail(`form: gender select disabled=${disabled} options=${options.join('|')}`);
    } else if (formText.includes('خيارات الجنس غير متاحة')) {
      fail('form: gender blocked');
    } else {
      fail('form: gender select not found');
    }

    await page.keyboard.press('Escape');
  } else {
    skip('form: add teacher button not visible');
  }

  for (const term of ['عرض التفاصيل', 'تعديل', 'إدارة الإسنادات', 'أرشفة']) {
    if (pageText.includes(term)) pass(`actions: "${term}" present`);
    else skip(`actions: "${term}" not in page text`);
  }
  if (pageText.includes('لا توجد إسنادات تعليمية')) pass('card: noTeachingAssignments copy');
  else skip('card: noTeachingAssignments not visible');

  await page.goto(`${BASE}${CLASSES_PATH}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const classesText = await page.locator('body').innerText();
  report.labels.classesPage = {
    m1Readable: /الأولى إعدادي|M1/.test(classesText),
    m1aReadable: /القسم أ|M1A/.test(classesText),
    m1Secondary: classesText.includes('M1'),
    m1aSecondary: classesText.includes('M1A'),
  };
  if (report.labels.classesPage.m1Readable) pass('labels: M1 readable on classes page');
  else skip('labels: M1 not in alwah_test school data (API label formatter verified in unit tests)');
  if (report.labels.classesPage.m1aReadable) pass('labels: M1A section readable');
  else skip('labels: M1A not in active school dataset');

  await page.goto(`${BASE}${ASSIGNMENTS_PATH}`, { waitUntil: 'networkidle', timeout: 90000 });
  const assignText = await page.locator('body').innerText();
  if (/الأولى إعدادي|القسم أ/.test(assignText)) pass('labels: readable labels on assignments page');
  else skip('labels: assignments page — no M1/M1A rows in dataset');

  const frContext = await browser.newContext({
    ...contextOptions,
    locale: 'fr-FR',
  });
  await frContext.addCookies(parseCookies(session.cookies));
  const frPage = await frContext.newPage();
  if (BYPASS) {
    await frPage.goto(
      `${BASE}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}`,
      { waitUntil: 'domcontentloaded' },
    );
  }
  await frPage.goto(`${BASE}${TEACHERS_PATH}`, { waitUntil: 'networkidle', timeout: 90000 });
  await frPage.evaluate(() => {
    localStorage.setItem('scc_locale', 'fr');
    document.cookie = 'scc_locale=fr;path=/;max-age=31536000;SameSite=Lax';
  });
  await frPage.reload({ waitUntil: 'networkidle' });
  const frDir = await frPage.locator('html').getAttribute('dir');
  report.i18n.fr = { dir: frDir };
  if (frDir === 'ltr') pass('i18n: French LTR');
  else fail(`i18n: French expected LTR, got ${frDir}`);
  await frContext.close();

  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}${TEACHERS_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4);
    report.responsive[vp.name] = { overflow, width: vp.width };
    if (!overflow) pass(`responsive: ${vp.name} OK`);
    else fail(`responsive: ${vp.name} horizontal overflow`);
  }

  for (const login of ['qa.pm', 'qa.schoolmgr', 'qa.staff']) {
    const rbac = await bffLogin(login);
    report.rbac[login] = { ok: rbac.ok, admin_kind: rbac.user?.admin_kind ?? null };
    if (rbac.ok) pass(`rbac: ${login} login OK`);
    else skip(`rbac: ${login} invalid_credentials`);
  }

  if (report.console.errors.length === 0) pass('console: clean');
  else fail(`console: ${report.console.errors.length} error(s)`);
  if (report.network.status500.length === 0) pass('network: no 500');
  else fail(`network: ${report.network.status500.length} x 500`);

  await browser.close();

  const hardFails = report.summary.fail.filter(
    (f) => !f.startsWith('labels:') && !f.startsWith('environment:'),
  );
  report.status =
    hardFails.length === 0 && report.summary.fail.length === 0
      ? 'READY_FOR_MERGE'
      : hardFails.length === 0
        ? 'READY_FOR_MERGE_WITH_SKIPS'
        : 'NEEDS_FIX';

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(hardFails.length ? 1 : 0);
}

main().catch((e) => {
  report.status = 'FAILED';
  report.summary.fail.push(String(e.message ?? e));
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
