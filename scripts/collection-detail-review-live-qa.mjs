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
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.waitForSelector('.collection-details__title', { timeout: 120000 });
  const text = await page.locator('.collection-details').innerText();
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
    draftBanner: (t) => t.includes('مسودة') && (t.includes('لم تُرحّل') || t.includes('لم تؤثر')),
    receiptPending: (t) => t.includes('لم يصدر'),
    amounts: (t) => t.includes('4 500,00') || t.includes('4,500.00'),
    unallocatedZero: (t) => t.includes('0,00') || t.includes('0.00'),
    noRawKeys: (t) => !/admin\.finance\./.test(t),
    no404: (t) => !t.includes('404') && !t.includes('تعذر العثور'),
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await checkCollection(page, 1482, {
    titleConfirmedCheque: (t) => t.includes('تحصيل مؤكد بالشيك'),
    notOldTitle: (t) => !t.includes('مؤكد تحصيل بشيك'),
    confirmedStudent: (t) => t.includes('عبد العزيز حميد'),
    receiptNumberLabel: (t) => t.includes('رقم الإيصال'),
    notGenericNumber: (t) => !/\bالرقم\b/.test(t) || t.includes('رقم الإيصال'),
    receiptValue: (t) => t.includes('REC/RAQEEM/2026/000007'),
    chequeNumberOnce: (t) => (t.match(/123456/g) ?? []).length <= 2,
    chequeStatus: (t) => t.includes('قيد التحصيل'),
    bankName: (t) => t.includes('التج'),
    holderName: (t) => t.includes('زكر'),
    notPostdated: (t) => t.includes('غير مؤجل'),
    billingMerged: (t) => t.includes('الجهة المفوترة والدافع'),
    noRawKeys: (t) => !/admin\.finance\./.test(t),
    allocationRegistration: (t) => t.includes('التسجيل'),
    viewReceiptOrCheque: (t) => t.includes('عرض الإيصال') || t.includes('فتح سجل الشيك'),
    internalIdSubtle: (t) => t.includes('المعرف الداخلي'),
    no404: (t) => !t.includes('404') && !t.includes('تعذر العثور'),
  });

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  const status = failed.length ? 'BLOCKED_LIVE_QA' : 'NEXTJS_CONFIRMED_CHEQUE_COLLECTION_DETAIL_POLISHED_MERGED_DEPLOYED_LIVE_QA_PASSED';
  console.log(JSON.stringify({ status, failed: failed.length, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
