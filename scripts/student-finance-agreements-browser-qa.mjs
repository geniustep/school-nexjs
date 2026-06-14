/**
 * Student finance agreements closure — browser QA (local Next.js + BFF).
 *
 * Usage:
 *   node scripts/student-finance-agreements-browser-qa.mjs [baseUrl]
 *
 * Screenshots: ../qa-screenshots-student-finance-closure-1/ (outside repo, not committed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_FINANCE_QA_LOCAL_URL ?? 'http://localhost:3002').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const SHOT_DIR = path.resolve(ROOT, '..', 'qa-screenshots-student-finance-closure-1');

const STUDENTS = {
  empty: process.env.STUDENT_FINANCE_QA_EMPTY_ID ?? '725',
  withAgreement: process.env.STUDENT_FINANCE_QA_AGREEMENT_ID ?? '617',
};

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
      return {
        name: pair.slice(0, eq),
        value: pair.slice(eq + 1),
        url: LOCAL_BASE,
      };
    });
    await context.addCookies(cookies);
  }
  return { ok: body.success === true, status: res.status(), error: body.error?.code };
}

async function waitFinancePanel(page) {
  await page.waitForSelector('.student-finance-tab, .student-finance-section, .state', { timeout: 60000 });
  await page.waitForTimeout(1500);
}

async function capture(page, name, viewport) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  if (viewport) await page.setViewportSize(viewport);
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function hasBadUiText(text) {
  return (
    /placeholder/i.test(text) ||
    /Application error/i.test(text) ||
    /\[object Object\]/i.test(text) ||
    /Traceback/i.test(text)
  );
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
  page.on('pageerror', (err) => consoleErrors.push(String(err.message ?? err)));

  const login = await loginViaApi(context.request, context);
  record('local_api_login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED_BY_AUTHENTICATION', results }, null, 2));
    process.exit(1);
  }

  // Student 725 — empty agreement
  const emptyUrl = `${LOCAL_BASE}/admin/students/${STUDENTS.empty}?tab=financial-agreement`;
  await page.goto(emptyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFinancePanel(page);
  record('725_agreement_load', page.url().includes('tab=financial-agreement'), { url: page.url() });
  const emptyTitle = await page.locator('.student-finance-card-empty, .student-finance-zero-hint').first().isVisible().catch(() => false);
  const body725 = await page.locator('.student-finance-tab').innerText().catch(() => '');
  record('725_empty_state', emptyTitle || body725.includes('لا يوجد اتفاق'), { emptyTitle });
  record('725_no_placeholder', !hasBadUiText(body725));
  await page.reload({ waitUntil: 'domcontentloaded' });
  record('725_refresh_keeps_tab', page.url().includes('tab=financial-agreement'));

  // Student 617 — agreement tab
  const agreementUrl = `${LOCAL_BASE}/admin/students/${STUDENTS.withAgreement}?tab=financial-agreement`;
  await page.goto(agreementUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFinancePanel(page);
  const agreementBody = await page.locator('.student-finance-tab').innerText().catch(() => '');
  record('617_agreement_load', page.url().includes('tab=financial-agreement'), { url: page.url() });
  record('617_agreement_content', agreementBody.length > 80 && !hasBadUiText(agreementBody));
  record('617_no_placeholder', !/placeholder/i.test(agreementBody));
  const shotAgreement = await capture(page, 'student-agreement-desktop-ar', { width: 1440, height: 900 });
  record('screenshot_agreement_ar', fs.existsSync(shotAgreement), { path: shotAgreement });

  // Finance tab 617
  const financeUrl = `${LOCAL_BASE}/admin/students/${STUDENTS.withAgreement}?tab=finance`;
  await page.goto(financeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFinancePanel(page);
  const financeBody = await page.locator('.student-finance-tab').innerText().catch(() => '');
  record('617_finance_load', page.url().includes('tab=finance'), { url: page.url() });
  record('617_finance_kpis', /إجمالي المستحق|المحصل فعليًا|شيكات قيد التحصيل/.test(financeBody));
  record('617_dual_status_badges', (await page.locator('.student-finance-dual-badges, .student-finance-status-group').count()) > 0);
  record('617_no_placeholder_finance', !/placeholder/i.test(financeBody));
  const shotFinanceDesktop = await capture(page, 'student-finance-desktop-ar', { width: 1440, height: 900 });
  record('screenshot_finance_desktop_ar', fs.existsSync(shotFinanceDesktop), { path: shotFinanceDesktop });

  // Mobile finance
  const shotFinanceMobile = await capture(page, 'student-finance-mobile-ar', { width: 390, height: 844 });
  const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  record('617_mobile_no_overflow', !overflowMobile, { viewport: '390x844' });
  record('screenshot_finance_mobile_ar', fs.existsSync(shotFinanceMobile), { path: shotFinanceMobile });

  // Back / forward between tabs
  await page.goto(agreementUrl, { waitUntil: 'domcontentloaded' });
  await page.goto(financeUrl, { waitUntil: 'domcontentloaded' });
  await page.goBack({ waitUntil: 'commit' }).catch(() => null);
  record('617_back_to_agreement', page.url().includes('tab=financial-agreement'));
  await page.goForward({ waitUntil: 'commit' }).catch(() => null);
  record('617_forward_to_finance', page.url().includes('tab=finance'));

  // French desktop finance
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
  await frPage.goto(financeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFinancePanel(frPage);
  const frDir = await frPage.locator('html').getAttribute('dir');
  const frBody = await frPage.locator('.student-finance-tab').innerText().catch(() => '');
  record('fr_ltr_finance', frDir === 'ltr', { dir: frDir });
  record('fr_no_raw_keys', !/admin\.student360\./.test(frBody));
  const shotFinanceFr = await capture(frPage, 'student-finance-desktop-fr', { width: 1440, height: 900 });
  record('screenshot_finance_desktop_fr', fs.existsSync(shotFinanceFr), { path: shotFinanceFr });
  await frContext.close();

  // Cancel future drawer screenshot (intercept allowed_actions when API omits it)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/api/odoo/admin/**', async (route) => {
    const response = await route.fetch();
    const contentType = response.headers()['content-type'] ?? '';
    if (!contentType.includes('application/json')) {
      await route.fulfill({ response });
      return;
    }
    const body = await response.json();
    const patchAgreementPayload = (data) => {
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data)) {
        data.forEach(patchAgreementPayload);
        return;
      }
      if ('allowed_actions' in data || ('state' in data && 'id' in data)) {
        data.allowed_actions = { ...(data.allowed_actions ?? {}), cancel_future_installments: true };
      }
      for (const key of ['current_agreement', 'agreement', 'financial_agreement']) {
        if (data[key]) patchAgreementPayload(data[key]);
      }
    };
    patchAgreementPayload(body.data);
    await route.fulfill({ response, json: body });
  });
  await page.goto(agreementUrl, { waitUntil: 'domcontentloaded' });
  await waitFinancePanel(page);
  const cancelFutureBtn = page.locator('button', { hasText: 'إلغاء الأقساط المستقبلية' });
  if (await cancelFutureBtn.isVisible().catch(() => false)) {
    await cancelFutureBtn.click();
    await page.waitForSelector('.student-finance-cancel-future-drawer', { timeout: 10000 });
    const shotDrawer = await capture(page, 'cancel-future-installments-drawer-ar', { width: 1440, height: 900 });
    record('screenshot_cancel_future_drawer', fs.existsSync(shotDrawer), { path: shotDrawer });
    await page.keyboard.press('Escape').catch(() => null);
  } else {
    record('cancel_future_drawer_skipped', false, { note: 'button not visible after route patch' });
  }
  await page.unroute('**/api/odoo/admin/**');

  const significantConsoleErrors = consoleErrors.filter(
    (e) => !/ERR_ABORTED|Failed to fetch|webpack|PackFileCacheStrategy|favicon/i.test(e),
  );
  record('console_clean', significantConsoleErrors.length === 0, {
    count: significantConsoleErrors.length,
    samples: significantConsoleErrors.slice(0, 5),
  });

  await browser.close();

  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'COMPLETED_BROWSER_QA_PASSED' : 'LIVE_QA_FAILED_REQUIRES_FIX',
        localBase: LOCAL_BASE,
        screenshotDir: SHOT_DIR,
        students: STUDENTS,
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
