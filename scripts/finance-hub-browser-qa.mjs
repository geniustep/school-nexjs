/**
 * Finance hub integration — browser QA.
 * Usage: node scripts/finance-hub-browser-qa.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_FINANCE_QA_LOCAL_URL ?? 'http://localhost:3030').replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const SHOT_DIR = path.resolve(ROOT, '..', 'qa-screenshots-finance-hub-integration-1');
const STUDENT_ID = process.env.STUDENT_FINANCE_QA_AGREEMENT_ID ?? '617';

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function loginViaApi(request, context) {
  const res = await request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies && context) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: LOCAL_BASE };
    });
    await context.addCookies(cookies);
  }
  return { ok: body.success === true };
}

async function capture(page, name, viewport) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  if (viewport) await page.setViewportSize(viewport);
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const login = await loginViaApi(context.request, context);
  record('login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const routes = [
    '/admin/finance',
    `/admin/finance/agreements?student_id=${STUDENT_ID}`,
    `/admin/finance/installments?student_id=${STUDENT_ID}`,
    '/admin/finance/collections',
    '/admin/finance/cheques',
    '/admin/finance/services',
    `/admin/students/${STUDENT_ID}?tab=finance`,
    `/admin/students/${STUDENT_ID}?tab=financial-agreement`,
  ];

  for (const route of routes) {
    await page.goto(`${LOCAL_BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    record(`route_${route.split('?')[0].replace(/\//g, '_')}`, !page.url().includes('/login'));
  }

  await page.goto(`${LOCAL_BASE}/admin/finance`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.finance-hub-grid, .finance-metrics-grid', { timeout: 60000 });
  record('finance_hub_kpis', true);
  await capture(page, 'finance-hub-desktop-ar', { width: 1440, height: 900 });

  await page.goto(`${LOCAL_BASE}/admin/finance/agreements?student_id=${STUDENT_ID}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('table, .finance-hub-student-bar, .state', { timeout: 60000 });
  await capture(page, 'agreements-list-desktop-ar', { width: 1440, height: 900 });

  await page.goto(`${LOCAL_BASE}/admin/finance/installments?student_id=${STUDENT_ID}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('table, .finance-hub-student-bar, .state', { timeout: 60000 });
  await capture(page, 'installments-list-desktop-ar', { width: 1440, height: 900 });

  const frContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
  });
  await frContext.addInitScript(() => {
    localStorage.setItem('scc_locale', 'fr');
    document.cookie = 'scc_locale=fr;path=/;max-age=31536000;SameSite=Lax';
  });
  const frPage = await frContext.newPage();
  await loginViaApi(frContext.request, frContext);
  await frPage.goto(`${LOCAL_BASE}/admin/finance/collections`, { waitUntil: 'domcontentloaded' });
  await frPage.waitForSelector('table, .state', { timeout: 60000 });
  await capture(frPage, 'collections-list-desktop-fr', { width: 1440, height: 900 });

  await page.goto(`${LOCAL_BASE}/admin/finance/cheques`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table, .state', { timeout: 60000 });
  await capture(page, 'cheques-list-mobile-ar', { width: 390, height: 844 });

  await page.goto(`${LOCAL_BASE}/admin/finance/services`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.finance-hub-tabs, .state', { timeout: 60000 });
  await capture(page, 'services-tariffs-desktop-ar', { width: 1440, height: 900 });

  const failed = results.filter((r) => !r.pass);
  const criticalConsoleErrors = consoleErrors.filter(
    (msg) => !/404 \(Not Found\)/.test(msg) && !/favicon/.test(msg),
  );
  const status = failed.length === 0 && criticalConsoleErrors.length === 0 ? 'PASSED' : failed.length === 0 ? 'PASSED_WITH_CONSOLE_NOISE' : 'FAILED';
  console.log(
    JSON.stringify(
      {
        status,
        baseUrl: LOCAL_BASE,
        shotDir: SHOT_DIR,
        studentId: STUDENT_ID,
        consoleErrors,
        criticalConsoleErrors,
        results,
      },
      null,
      2,
    ),
  );
  await browser.close();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
