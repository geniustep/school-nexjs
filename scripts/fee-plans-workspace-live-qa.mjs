/**
 * Fee plans workspace — short visual QA (school DB).
 * Usage: node scripts/fee-plans-workspace-live-qa.mjs [localBase]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_360_QA_LOCAL_URL ?? 'http://localhost:3015').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const report = { status: 'PENDING', checks: [], passed: true };

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

async function loginContext(browser, locale) {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    locale: locale === 'ar' ? 'ar-MA' : 'fr-FR',
  });
  await context.addInitScript((loc) => {
    localStorage.setItem('scc_locale', loc);
    document.cookie = `scc_locale=${loc};path=/;max-age=31536000;SameSite=Lax`;
  }, locale);
  const res = await context.request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: LOCAL_BASE };
    });
    await context.addCookies(cookies);
  }
  return { context, ok: body.success === true };
}

async function runLocale(browser, locale, prefix) {
  const { context, ok } = await loginContext(browser, locale);
  check(`${prefix}_login`, ok);
  if (!ok) {
    await context.close();
    return;
  }

  const page = await context.newPage();
  const width = prefix.includes('mobile') ? 390 : 1440;
  const height = prefix.includes('mobile') ? 844 : 900;
  await page.setViewportSize({ width, height });

  await page.goto(`${LOCAL_BASE}/admin/finance/fee-plans`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const inlineForm = await page.locator('form.fee-plan-form').count();
  check(`${prefix}_no_inline_form`, inlineForm === 0, { inlineForm });

  const recordsText = await page.locator('.pagination').textContent().catch(() => '');
  check(`${prefix}_no_records_zero`, !/records\s+0/i.test(recordsText ?? ''), { recordsText });

  const addLabel =
    locale === 'ar' ? 'إضافة خطة رسوم' : locale === 'fr' ? 'Ajouter un plan de frais' : 'Add fee plan';
  const addBtn = page.getByRole('button', { name: addLabel, exact: true }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 20000 });
  await addBtn.click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 15000 });
  check(`${prefix}_drawer_open`, true);

  const addLineLabel =
    locale === 'ar' ? 'إضافة بند' : locale === 'fr' ? 'Ajouter une ligne' : 'Add line';
  await page.getByRole('button', { name: addLineLabel, exact: true }).click();
  await page.waitForSelector('.confirmation-dialog', { timeout: 10000 });
  check(`${prefix}_line_dialog`, true);

  const cancelLabel = locale === 'ar' ? 'إلغاء' : 'Annuler';
  await page.locator('.confirmation-dialog').getByRole('button', { name: cancelLabel, exact: true }).click();
  await page.waitForSelector('.confirmation-dialog', { state: 'hidden', timeout: 5000 }).catch(() => null);
  await page.locator('.academic-setup-drawer__head').getByRole('button', { name: locale === 'ar' ? 'إغلاق' : 'Fermer', exact: true }).click();
  await page.waitForTimeout(500);
  const drawerClosed = (await page.locator('.academic-setup-drawer').count()) === 0;
  check(`${prefix}_cancel_closes_drawer`, drawerClosed);

  if (locale === 'ar') {
    const dir = await page.locator('html').getAttribute('dir');
    check(`${prefix}_rtl`, dir === 'rtl', { dir });
  }
  if (locale === 'fr') {
    const dir = await page.locator('html').getAttribute('dir');
    check(`${prefix}_ltr`, dir === 'ltr', { dir });
  }

  if (prefix.includes('mobile')) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    check(`${prefix}_no_overflow`, !overflow);
  }

  await context.close();
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    await runLocale(browser, 'ar', 'desktop_ar');
    await runLocale(browser, 'fr', 'desktop_fr');
    await runLocale(browser, 'ar', 'mobile_ar');
    report.status = report.passed ? 'PASSED' : 'FAILED';
  } catch (err) {
    report.status = 'BLOCKED_BY_LIVE_QA';
    report.error = String(err?.message ?? err);
    report.passed = false;
  } finally {
    if (browser) await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main();
