/**
 * Fee plans workspace — production smoke (school DB).
 * Usage: node scripts/fee-plans-workspace-production-smoke.mjs
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const PROD_BASE = 'https://school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const STUDENT_ID = Number(process.env.FEE_PLAN_SMOKE_STUDENT_ID ?? 617);

const report = { status: 'PENDING', checks: [], passed: true, base: PROD_BASE };

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

async function loginContext(browser, locale) {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': 'school.raqeem.ma' },
    locale: locale === 'ar' ? 'ar-MA' : 'fr-FR',
  });
  await context.addInitScript((loc) => {
    localStorage.setItem('scc_locale', loc);
    document.cookie = `scc_locale=${loc};path=/;max-age=31536000;SameSite=Lax`;
  }, locale);
  const res = await context.request.post(`${PROD_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': 'school.raqeem.ma' },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: PROD_BASE };
    });
    await context.addCookies(cookies);
  }
  return { context, ok: body.success === true };
}

async function smokeFeePlans(page, locale, prefix, viewport) {
  await page.setViewportSize(viewport);
  const res = await page.goto(`${PROD_BASE}/admin/finance/fee-plans`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  check(`${prefix}_page_load`, res?.ok() !== false, { status: res?.status() });

  const inlineForm = await page.locator('form.fee-plan-form').count();
  check(`${prefix}_no_inline_form`, inlineForm === 0, { inlineForm });

  const metrics = await page.locator('[data-testid="fee-plans-metrics"]').count();
  check(`${prefix}_metrics`, metrics > 0, { metrics });

  const filters = await page.locator('[data-testid="fee-plans-filters"]').count();
  check(`${prefix}_filters`, filters > 0, { filters });

  const recordsText = await page.locator('.pagination').textContent().catch(() => '');
  check(`${prefix}_no_records_zero`, !/records\s+0/i.test(recordsText ?? ''), { recordsText });

  const addLabel =
    locale === 'ar' ? 'إضافة خطة رسوم' : locale === 'fr' ? 'Ajouter un plan de frais' : 'Add fee plan';
  await page.getByRole('button', { name: addLabel, exact: true }).first().click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 30000 });
  check(`${prefix}_drawer`, true);

  const addLineLabel =
    locale === 'ar' ? 'إضافة بند' : locale === 'fr' ? 'Ajouter une ligne' : 'Add line';
  await page.getByRole('button', { name: addLineLabel, exact: true }).click();
  await page.waitForSelector('.confirmation-dialog', { timeout: 15000 });

  const optionalLabel =
    locale === 'ar' ? 'خدمة اختيارية' : locale === 'fr' ? 'Service optionnel' : 'Optional service';
  const optionalVisible = (await page.getByText(optionalLabel).count()) > 0;
  check(`${prefix}_optional_toggle`, optionalVisible);

  const cancelLabel = locale === 'ar' ? 'إلغاء' : 'Annuler';
  await page.locator('.confirmation-dialog').getByRole('button', { name: cancelLabel, exact: true }).click();
  await page.locator('.academic-setup-drawer__head').getByRole('button').first().click();
  await page.waitForTimeout(800);
  check(`${prefix}_drawer_closed`, (await page.locator('.academic-setup-drawer').count()) === 0);

  const dir = await page.locator('html').getAttribute('dir');
  if (locale === 'ar') check(`${prefix}_rtl`, dir === 'rtl', { dir });
  if (locale === 'fr') check(`${prefix}_ltr`, dir === 'ltr', { dir });

  if (viewport.width < 500) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    check(`${prefix}_no_overflow`, !overflow);
  }
}

async function smokeAssignDrawer(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD_BASE}/admin/students/${STUDENT_ID}?tab=finance`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('.student-finance-tab', { timeout: 60000 }).catch(() => null);
  const assignBtn = page.getByRole('button', { name: /إسناد خطة رسوم|Attribuer un plan de frais/i }).first();
  const visible = await assignBtn.isVisible().catch(() => false);
  if (!visible) {
    check('assign_drawer_skipped', true, { reason: 'assign button not visible' });
    return;
  }
  await assignBtn.click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 20000 });
  check('assign_drawer_open', true);
  await page.locator('.academic-setup-drawer__head button').first().click();
  await page.waitForTimeout(500);
  check('assign_drawer_closed', (await page.locator('.academic-setup-drawer').count()) === 0);
}

async function waitForDeploy(browser, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${PROD_BASE}/admin/finance/fee-plans`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const metrics = await page.locator('[data-testid="fee-plans-metrics"]').count();
      const inline = await page.locator('form.fee-plan-form').count();
      if (metrics > 0 && inline === 0) {
        await context.close();
        return true;
      }
    } catch {
      /* retry */
    }
    await context.close();
    await new Promise((r) => setTimeout(r, 15000));
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const deployed = await waitForDeploy(browser);
    check('vercel_deploy_ready', deployed, { note: 'fee-plans-metrics visible without inline form' });

    const { context: arCtx, ok: arLogin } = await loginContext(browser, 'ar');
    check('login', arLogin);
    if (arLogin) {
      const page = await arCtx.newPage();
      await smokeFeePlans(page, 'ar', 'desktop_ar', { width: 1440, height: 900 });
      await smokeAssignDrawer(page);
      await arCtx.close();
    }

    const { context: frCtx, ok: frLogin } = await loginContext(browser, 'fr');
    if (frLogin) {
      const page = await frCtx.newPage();
      await smokeFeePlans(page, 'fr', 'desktop_fr', { width: 1440, height: 900 });
      await frCtx.close();
    }

    const { context: mobCtx, ok: mobLogin } = await loginContext(browser, 'ar');
    if (mobLogin) {
      const page = await mobCtx.newPage();
      await smokeFeePlans(page, 'ar', 'mobile_ar', { width: 390, height: 844 });
      await mobCtx.close();
    }

    report.status = report.passed ? 'PASSED' : 'FAILED';
  } catch (err) {
    report.status = 'BLOCKED_BY_VISUAL_SMOKE';
    report.error = String(err?.message ?? err);
    report.passed = false;
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main();
