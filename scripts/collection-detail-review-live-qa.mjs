/**
 * Collection detail review — live QA (read-only).
 * Usage: node scripts/collection-detail-review-live-qa.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function login(request, context) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies && context) {
    const raw = Array.isArray(setCookies) ? setCookies : [setCookies];
    await context.addCookies(
      raw.map((line) => {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
      }),
    );
  }
  return body.success === true;
}

async function checkCollection(page, id, checks) {
  await page.goto(`${BASE}/admin/finance/collections/${id}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('.collection-details, .form-error, .state', { timeout: 90000 });
  const text = await page.locator('body').innerText();
  const html = await page.locator('.collection-details').innerHTML().catch(() => '');
  for (const [name, fn] of Object.entries(checks)) {
    record(`${id}:${name}`, fn(text, html));
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  record(`${id}:noHorizontalScroll`, !overflow);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });
  const page = await context.newPage();

  record('login', await login(context.request, context));
  if (!results[0].pass) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED_LIVE_QA', results }, null, 2));
    process.exit(1);
  }

  await checkCollection(page, 1459, {
    studentName: (t) => t.includes('عبد العزيز حميد'),
    notUnavailable: (t) => !t.includes('غير متاح'),
    payer: (t) => t.includes('ولي أمر عبد العزيز حميد'),
    chequeMethod: (t) => t.includes('شيك'),
    allocationRegistration: (t) => t.includes('التسجيل'),
    allocationTuition: (t) => t.includes('التمدرس'),
    noTechnicalTitle: (_t, html) => !html.includes('collection-allocation-row__title">#3634'),
    draftBanner: (t) => t.includes('مسودة') && t.includes('لم تُرحّل'),
    receiptPending: (t) => t.includes('لم يصدر'),
    amounts: (t) => t.includes('4 500,00') || t.includes('4,500.00'),
    unallocatedZero: (t) => t.includes('0,00') || t.includes('0.00'),
    noRawKeys: (t) => !/admin\.finance\./.test(t),
    no404: (t) => !t.includes('404') && !t.includes('تعذر العثور'),
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await checkCollection(page, 1482, {
    confirmedStudent: (t) => t.includes('عبد العزيز حميد'),
    confirmedCheque: (t) => t.includes('شيك') || t.includes('123456'),
    hasReceiptOrConfirmed: (t) => t.includes('REC/') || t.includes('مؤك'),
  });

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  const status = failed.length ? 'BLOCKED_LIVE_QA' : 'NEXTJS_COLLECTION_DETAIL_REVIEW_CHEQUE_UX_MERGED_DEPLOYED_LIVE_QA_PASSED';
  console.log(JSON.stringify({ status, failed: failed.length, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
