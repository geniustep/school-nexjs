/**
 * Finance collection/cheque UX — short browser QA.
 * Usage: node scripts/finance-collection-cheque-browser-qa.mjs [baseUrl]
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
const SHOT_DIR = path.resolve(ROOT, '..', 'qa-screenshots-finance-collection-cheque-ux-1');
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

  const financeUrl = `${LOCAL_BASE}/admin/students/${STUDENT_ID}?tab=finance`;
  await page.goto(financeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.student-finance-tab', { timeout: 60000 });
  record('student_finance_load', page.url().includes('tab=finance'));

  const collectBtn = page.locator('button', { hasText: 'تسجيل تحصيل' });
  record('collection_button_visible', await collectBtn.isVisible().catch(() => false));
  if (await collectBtn.isVisible()) {
    await collectBtn.click();
    await page.waitForSelector('.finance-collection-workflow', { timeout: 15000 });
    record('collection_drawer_open', true);
    await capture(page, 'student-finance-collection-drawer-ar', { width: 1440, height: 900 });
    await page.keyboard.press('Escape');
  }

  await page.goto(`${LOCAL_BASE}/admin/finance/cheques`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.data, .state', { timeout: 60000 });
  record('cheques_page_load', !page.url().includes('/login'));
  await capture(page, 'cheque-list-mobile-ar', { width: 390, height: 844 });

  const frContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
  });
  await frContext.addInitScript(() => {
    localStorage.setItem('scc_locale', 'fr');
    document.cookie = 'scc_locale=fr;path=/;max-age=31536000;SameSite=Lax';
  });
  await loginViaApi(frContext.request, frContext);
  const frPage = await frContext.newPage();
  await frPage.goto(financeUrl, { waitUntil: 'domcontentloaded' });
  await frPage.waitForTimeout(2000);
  record('fr_ltr', (await frPage.locator('html').getAttribute('dir')) === 'ltr');
  await frContext.close();

  const significant = consoleErrors.filter(
    (e) => !/webpack|favicon|ERR_ABORTED|ResizeObserver|hydration/i.test(e),
  );
  record('console_clean', significant.length === 0, { count: significant.length });

  await browser.close();
  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'COMPLETED_BROWSER_QA_PASSED' : 'LIVE_QA_FAILED',
        localBase: LOCAL_BASE,
        screenshotDir: SHOT_DIR,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
