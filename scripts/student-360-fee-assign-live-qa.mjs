/**
 * Student 360 fee plan assignment drawer — browser Live QA (school tenant).
 * Usage: node scripts/student-360-fee-assign-live-qa.mjs [localBase]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_360_QA_LOCAL_URL ?? 'http://localhost:3010').replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const STUDENT_ID = process.env.STUDENT_360_FEE_ASSIGN_STUDENT_ID ?? '617';
const PASSWORD = loadAccountPassword(LOGIN);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const report = { status: 'PENDING', studentId: STUDENT_ID, checks: [], passed: true, emptyPlansObserved: false };

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
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
  return { ok: body.success === true, status: res.status() };
}

async function openFinanceTab(page) {
  await page.goto(`${LOCAL_BASE}/admin/students/${STUDENT_ID}?tab=finance`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('.student-finance-tab', { timeout: 60000 });
}

async function testLocale(page, locale, viewport) {
  const prefix = `${locale}_${viewport.name}`;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await openFinanceTab(page);

  const assignLabels = {
    ar: 'إسناد خطة رسوم',
    fr: 'Attribuer un plan de frais',
  };
  const assignBtn = page.getByRole('button', { name: assignLabels[locale], exact: true }).first();
  check(`${prefix}_assign_button`, await assignBtn.isVisible().catch(() => false));

  await assignBtn.click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 15000 });
  check(`${prefix}_drawer_open`, await page.locator('.academic-setup-drawer').isVisible());

  const inlineForm = await page.locator('.student-finance-assign-card').count();
  check(`${prefix}_no_inline_form`, inlineForm === 0, { inlineForm });

  const bodyOverflow = await page.evaluate(() => document.body.style.overflow === 'hidden');
  check(`${prefix}_scroll_lock`, bodyOverflow);

  const yearSelect = page.locator('.student-finance-assign-form select').first();
  check(`${prefix}_year_select`, await yearSelect.isVisible());

  const yearValue = await yearSelect.inputValue();
  if (yearValue) {
    await page.waitForTimeout(1500);
    const loading = await page.locator('.student-finance-assign-form').getByText(/Chargement|Loading|جاري|Cargando/i).count();
    const empty = await page.locator('.student-finance-assign-form__state .muted').count();
    const planSelect = page.locator('.student-finance-assign-form select').nth(1);
    const hasPlanSelect = (await planSelect.count()) > 0 && (await planSelect.isVisible().catch(() => false));
    check(`${prefix}_plans_state`, loading > 0 || empty > 0 || hasPlanSelect, { loading, empty, hasPlanSelect });
    if (empty > 0) report.emptyPlansObserved = true;
  }

  const closeLabel = locale === 'ar' ? 'إغلاق' : 'Fermer';
  await page.getByRole('button', { name: closeLabel, exact: true }).click();
  await page.waitForTimeout(400);
  check(`${prefix}_drawer_closed`, (await page.locator('.academic-setup-drawer').count()) === 0);

  const dir = await page.locator('html').getAttribute('dir');
  check(`${prefix}_dir`, locale === 'ar' ? dir === 'rtl' : dir === 'ltr', { dir });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const locale of ['fr', 'ar']) {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
      locale: locale === 'ar' ? 'ar-MA' : 'fr-FR',
    });
    await context.addInitScript((loc) => {
      localStorage.setItem('scc_locale', loc);
      document.cookie = `scc_locale=${loc};path=/;max-age=31536000;SameSite=Lax`;
    }, locale);
    const page = await context.newPage();
    const login = await loginViaApi(context.request, context);
    check(`${locale}_login`, login.ok, login);
    if (!login.ok) {
      await browser.close();
      report.status = 'BLOCKED_BY_AUTHENTICATION';
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    for (const vp of VIEWPORTS) {
      await testLocale(page, locale, vp);
    }
    await context.close();
  }

  await browser.close();
  report.status = report.passed ? 'COMPLETED_LIVE_QA_PASSED' : 'LIVE_QA_FAILED_REQUIRES_FIX';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
