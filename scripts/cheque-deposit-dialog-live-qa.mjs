/**
 * Cheque deposit dialog — read-only live QA (opens modal, does not submit).
 * Usage: node scripts/cheque-deposit-dialog-live-qa.mjs [baseUrl] [chequeId]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const CHEQUE_ID = process.argv[3] ?? '399';
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1280, height: 900 },
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

  await page.goto(`${BASE}/admin/finance/cheques/${CHEQUE_ID}`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.waitForSelector('.cheque-details', { timeout: 120000 });

  const depositBtn = page.getByRole('button', { name: /إيداع الشيك/i });
  const hasDeposit = await depositBtn.count();
  record('depositButtonVisible', hasDeposit > 0);

  if (hasDeposit > 0) {
    await depositBtn.first().click();
    await page.waitForSelector('.finance-cheque-dialog--deposit', { timeout: 10000 });
    const modalText = await page.locator('.finance-cheque-dialog--deposit').innerText();
    record('titlePolished', modalText.includes('تأكيد إيداع الشيك'));
    record('descriptionVisible', modalText.includes('قيد التحصيل') && modalText.includes('تصفية'));
    record('summaryVisible', modalText.includes('رقم الشيك') && modalText.includes('المبلغ'));
    record('dateLabelClear', modalText.includes('تاريخ إيداع الشيك'));
    record('confirmCta', modalText.includes('تأكيد الإيداع'));
    record('cancelCta', modalText.includes('إلغاء'));
    record('noRawKeys', !/admin\.finance\./.test(modalText));
    await page.getByRole('button', { name: /^إلغاء$/ }).click();
    record('modalCloses', (await page.locator('.finance-cheque-dialog--deposit').count()) === 0);
  } else {
    record('titlePolished', false, { note: 'deposit action unavailable for this cheque state' });
    record('descriptionVisible', false);
    record('summaryVisible', false);
    record('dateLabelClear', false);
    record('confirmCta', false);
    record('cancelCta', false);
    record('noRawKeys', true);
    record('modalCloses', true);
  }

  const pageText = await page.locator('.cheque-details').innerText();
  record('pageNoRegression', pageText.includes('رقم الشيك') || pageText.includes('123456'));
  record('pageNo404', !pageText.includes('404') && !pageText.includes('تعذر تحميل'));

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  const status = failed.length
    ? 'BLOCKED_LIVE_QA'
    : 'NEXTJS_CHEQUE_DEPOSIT_DIALOG_SMALL_PATCH_MERGED_DEPLOYED_QA_PASSED';
  console.log(JSON.stringify({ status, failed: failed.length, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
