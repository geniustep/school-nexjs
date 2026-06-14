/**
 * Student 360 documents & finance UX — browser Live QA (local Next.js + school tenant).
 * Usage: node scripts/student-360-documents-finance-ux-live-qa.mjs [localBase]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_360_QA_LOCAL_URL ?? 'http://localhost:3010').replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const STUDENT_ID = process.env.STUDENT_360_QA_STUDENT_ID ?? '727';
const PASSWORD = loadAccountPassword(LOGIN);

const LABELS = {
  ar: { documents: 'الوثائق', finance: 'المالية', addDocument: 'إضافة وثيقة', close: 'إغلاق' },
  fr: { documents: 'Documents', finance: 'Finance', addDocument: 'Ajouter un document', close: 'Fermer' },
};

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const report = { status: 'PENDING', localBase: LOCAL_BASE, studentId: STUDENT_ID, checks: [], passed: true };

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
  return { ok: body.success === true, status: res.status(), error: body.error?.code };
}

async function openTab(page, tabQuery) {
  await page.goto(`${LOCAL_BASE}/admin/students/${STUDENT_ID}?tab=${tabQuery}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(2500);
}

async function assertNoPageOverflow(page, tag) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  check(`${tag}_no_horizontal_overflow`, !overflow);
}

async function testDocumentsUx(page, locale, viewportName) {
  const prefix = `${locale}_${viewportName}_documents`;
  const labels = LABELS[locale];
  await openTab(page, 'documents');

  await page.waitForSelector('.student-doc-tab', { timeout: 30000 });
  check(`${prefix}_panel`, await page.locator('.student-doc-tab').isVisible());
  check(`${prefix}_section_header`, await page.locator('.student-360-section-header').first().isVisible());
  check(`${prefix}_metric_grid`, await page.locator('.student-360-metric-grid').isVisible());
  check(`${prefix}_no_raw_file_input_visible`, (await page.locator('input[type="file"]:visible').count()) === 0);

  const addBtn = page.getByRole('button', { name: labels.addDocument, exact: true });
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await page.waitForSelector('.academic-setup-drawer', { timeout: 10000 });
    check(`${prefix}_drawer_open`, await page.locator('.academic-setup-drawer').isVisible());
    check(`${prefix}_hidden_file_input`, (await page.locator('.student-doc-file-upload__input').count()) === 1);
    check(`${prefix}_upload_prompt`, (await page.locator('.student-doc-file-upload__prompt').textContent())?.trim().length > 0);
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow === 'hidden');
    check(`${prefix}_body_scroll_lock`, bodyOverflow);
    await page.getByRole('button', { name: labels.close, exact: true }).click();
    await page.waitForTimeout(400);
    check(`${prefix}_drawer_closed`, (await page.locator('.academic-setup-drawer').count()) === 0);
  }

  await assertNoPageOverflow(page, prefix);
}

async function testFinanceUx(page, locale, viewportName) {
  const prefix = `${locale}_${viewportName}_finance`;
  await openTab(page, 'finance');

  check(`${prefix}_panel`, await page.locator('.student-finance-tab').isVisible());
  check(`${prefix}_section_header`, await page.locator('.student-360-section-header').first().isVisible());
  check(`${prefix}_four_metrics`, (await page.locator('.student-360-metric-grid .student-360-metric-card').count()) === 4);
  check(`${prefix}_year_select`, await page.locator('.student-finance-year-select select').isVisible());
  check(`${prefix}_billing_grid`, await page.locator('.student-finance-billing-grid').isVisible());
  check(`${prefix}_fees_section`, await page.locator('.student-finance-tab .student-360-section').first().isVisible());

  const giantEmpty = await page.locator('.empty-state').count();
  check(`${prefix}_no_full_page_empty`, giantEmpty === 0, { emptyStateCount: giantEmpty });

  await assertNoPageOverflow(page, prefix);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const locale of ['ar', 'fr']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
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

    await page.goto(`${LOCAL_BASE}/admin/students/${STUDENT_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const dir = await page.locator('html').getAttribute('dir');
    check(`${locale}_html_dir`, locale === 'ar' ? dir === 'rtl' : dir === 'ltr', { dir });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await testDocumentsUx(page, locale, vp.name);
      await testFinanceUx(page, locale, vp.name);
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
