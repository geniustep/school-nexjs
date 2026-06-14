/**
 * Student 360 layout/loading — production smoke (read-only).
 * Detects flash of empty state on finance/agreement tabs.
 * Usage: node scripts/student-360-loading-production-smoke.mjs
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = 'https://school.raqeem.ma';
const HOST = 'school.raqeem.ma';
const LOGIN = 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function loginViaApi(request, context) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies && context) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
    });
    await context.addCookies(cookies);
  }
  return body.success === true;
}

async function pollTabState(page, opts) {
  const { emptyPatterns, skeletonSelector, contentSelector, maxMs = 8000, intervalMs = 100 } = opts;
  const samples = [];
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const body = await page.locator('.student-finance-tab, .student-360-tab-panel').first().innerText().catch(() => '');
    const hasSkeleton = skeletonSelector
      ? (await page.locator(skeletonSelector).count()) > 0
      : false;
    const hasEmpty = emptyPatterns.some((re) => re.test(body));
    const hasContent = contentSelector
      ? (await page.locator(contentSelector).count()) > 0
      : body.length > 60 && !hasEmpty;
    samples.push({ t: Date.now() - start, hasEmpty, hasSkeleton, hasContent, len: body.length });
    if (hasContent && !hasEmpty) break;
    await page.waitForTimeout(intervalMs);
  }
  return samples;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });

  const page = await context.newPage();
  const loginOk = await loginViaApi(context.request, context);
  record('login', loginOk);
  if (!loginOk) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  // Overview — unified readiness checklist
  await page.goto(`${BASE}/admin/students/617`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.student-readiness__list, .student-360-header', { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(2000);
  const readinessList = (await page.locator('.student-readiness__list').count()) > 0;
  const oldStatusCards = (await page.locator('.student-status-card').count()) > 0;
  record('overview_readiness_checklist', readinessList, { readinessList });
  record('overview_no_old_status_cards', !oldStatusCards, { oldStatusCardsCount: await page.locator('.student-status-card').count() });

  // 617 agreement — no flash of empty before content
  await page.goto(`${BASE}/admin/students/617?tab=financial-agreement`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const agreementSamples = await pollTabState(page, {
    emptyPatterns: [/لا يوجد اتفاق مالي/i, /لم يتم إنشاء/i],
    skeletonSelector: '.student-360-agreement-skeleton, .student-360-tab-content-skeleton',
    contentSelector: '.student-finance-agreement-header, .student-360-metric-grid',
    maxMs: 12000,
  });
  const earlyEmptyAgreement = agreementSamples.slice(0, 5).some((s) => s.hasEmpty && !s.hasSkeleton && !s.hasContent);
  const finalAgreement = agreementSamples[agreementSamples.length - 1];
  record('617_agreement_no_early_empty_flash', !earlyEmptyAgreement, {
    earlySamples: agreementSamples.slice(0, 8),
    final: finalAgreement,
  });
  record('617_agreement_loaded', finalAgreement?.hasContent === true, { final: finalAgreement });

  // 617 finance — no flash of zero KPIs / empty installments
  await page.goto(`${BASE}/admin/students/617?tab=finance`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const financeSamples = await pollTabState(page, {
    emptyPatterns: [/لا توجد أقساط/i, /لا توجد رسوم/i],
    skeletonSelector: '.student-finance-skeleton, .student-360-skeleton',
    contentSelector: '.student-360-metric-grid, .student-finance-billing-grid',
    maxMs: 12000,
  });
  const earlyEmptyFinance = financeSamples.slice(0, 5).some((s) => s.hasEmpty && !s.hasSkeleton && !s.hasContent);
  const finalFinance = financeSamples[financeSamples.length - 1];
  record('617_finance_no_early_empty_flash', !earlyEmptyFinance, {
    earlySamples: financeSamples.slice(0, 8),
    final: finalFinance,
  });
  record('617_finance_loaded', finalFinance?.hasContent === true, { final: finalFinance });

  // 727 agreement + finance
  for (const tab of ['financial-agreement', 'finance']) {
    await page.goto(`${BASE}/admin/students/727?tab=${tab}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const samples = await pollTabState(page, {
      emptyPatterns: [/لا يوجد اتفاق/i, /لا توجد أقساط/i],
      skeletonSelector: '.student-360-agreement-skeleton, .student-360-finance-skeleton, .student-360-tab-content-skeleton',
      contentSelector: '.student-finance-tab .student-360-section, .student-360-metric-grid',
      maxMs: 10000,
    });
    const earlyEmpty = samples.slice(0, 5).some((s) => s.hasEmpty && !s.hasSkeleton && !s.hasContent);
    record(`727_${tab}_no_early_empty_flash`, !earlyEmpty, { samples: samples.slice(0, 6) });
  }

  // Documents summary bar
  await page.goto(`${BASE}/admin/students/617?tab=documents`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  const docSummaryBar = (await page.locator('.student-doc-summary-bar').count()) > 0;
  const docMetricCards = (await page.locator('.student-doc-tab .student-360-metric-grid .student-360-metric-card').count()) > 0;
  record('documents_summary_bar', docSummaryBar);
  record('documents_no_four_metric_cards', !docMetricCards);

  // Mobile overflow
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/students/617?tab=finance`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  record('mobile_no_horizontal_overflow', !overflow);

  // French LTR
  const frContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
  });
  await frContext.addInitScript(() => {
    localStorage.setItem('scc_locale', 'fr');
    document.cookie = 'scc_locale=fr;path=/;max-age=31536000;SameSite=Lax';
  });
  await loginViaApi(frContext.request, frContext);
  const frPage = await frContext.newPage();
  await frPage.goto(`${BASE}/admin/students/617?tab=finance`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await frPage.waitForTimeout(3000);
  const frDir = await frPage.locator('html').getAttribute('dir');
  record('french_ltr', frDir === 'ltr', { dir: frDir });
  await frContext.close();

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  const status = failed.length === 0 ? 'STUDENT_360_LAYOUT_SIMPLIFIED_LOADING_STABILIZED_MERGED_DEPLOYED_LIVE_QA_PASSED' : 'LIVE_QA_FAILED_REQUIRES_FIX';
  console.log(JSON.stringify({ status, base: BASE, commit: '333aa7b', results, failedCount: failed.length }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
