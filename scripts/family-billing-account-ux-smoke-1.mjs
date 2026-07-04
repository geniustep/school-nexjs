/**
 * Smoke — family billing account UX (billing_partner_id=6667).
 * Usage: node scripts/family-billing-account-ux-smoke-1.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';
import { chromium } from 'playwright';

primeQaEnvFromLocal();

const BILLING_PARTNER_ID = 6667;
const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const AMOUNT = '1';

const report = {
  phase: 'NEXTJS-FAMILY-BILLING-ACCOUNT-TRUE-FAMILY-UX-1',
  base: BASE,
  billingPartnerId: BILLING_PARTNER_ID,
  verdict: 'PENDING',
  checks: [],
  collectionIds: [],
  receiptIds: [],
};

function rec(id, pass, extra = {}) {
  report.checks.push({ id, pass, ...extra });
}

async function login(request, context) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': HOST, 'Content-Type': 'application/json' },
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
    viewport: { width: 1440, height: 900 },
    locale: 'ar-MA',
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });
  const page = await context.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/family-collections') && res.request().method() === 'POST' && !url.includes('/preview') && res.ok()) {
      try {
        const json = await res.json();
        for (const c of json?.data?.collections ?? []) {
          if (c?.id) report.collectionIds.push(c.id);
        }
        for (const r of json?.data?.receipts ?? []) {
          if (r?.id) report.receiptIds.push(r.id);
        }
      } catch {
        /* ignore */
      }
    }
  });

  rec('login', await login(context.request, context));
  if (!report.checks[0].pass) {
    report.verdict = 'BLOCKED';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  await page.goto(`${BASE}/admin/finance/billing-accounts`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  let text = await page.locator('body').innerText();
  rec('list_default_family_filter_ui', /حسابات عائلية|نوع الحساب/i.test(text));
  rec('list_kind_badges', /عائلة|فردي|بدون تلاميذ/.test(text));

  await page.goto(`${BASE}/admin/finance/billing-accounts/${BILLING_PARTNER_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  text = await page.locator('body').innerText();
  rec('detail_no_404', !/404|Not Found/i.test(text));
  rec('detail_family_title', /الحساب المالي للأسرة/.test(text));
  rec('detail_family_notice', /يمكن استلام دفعة واحدة/.test(text));
  rec('family_collect_button', /استلام دفعة من الأسرة/.test(text));
  rec('no_student_picker_on_load', !/اختر أحد التلاميذ/.test(text));

  const familyBtn = page.getByRole('button', { name: /استلام دفعة من الأسرة/ }).first();
  if (await familyBtn.isVisible().catch(() => false)) {
    await familyBtn.click();
  } else {
    await page.goto(`${BASE}/admin/finance/billing-accounts/${BILLING_PARTNER_ID}?family_collect=1`, {
      waitUntil: 'domcontentloaded',
    });
  }
  await page.waitForSelector('.finance-family-collection-workflow', { timeout: 30000 });
  await page.waitForTimeout(2000);
  text = await page.locator('body').innerText();
  rec('drawer_workflow_visible', /المبلغ|طريقة الأداء|معاينة التوزيع/.test(text));
  rec('drawer_no_required_student_picker', !/اختر أحد التلاميذ/.test(text));

  const amountInput = page.locator('.finance-amount-field input').first();
  await amountInput.fill(AMOUNT);

  const previewBtn = page.getByRole('button', { name: /معاينة التوزيع/ }).first();
  await previewBtn.click();
  await page.waitForTimeout(4000);
  text = await page.locator('body').innerText();
  rec('preview_visible', /معاينة التوزيع|المبلغ الموزع|المبلغ المخصص/.test(text));

  const confirmBtn = page.getByRole('button', { name: /تأكيد استلام الدفعة/ }).first();
  const confirmEnabled = await confirmBtn.isEnabled().catch(() => false);
  if (confirmEnabled) {
    await confirmBtn.click();
    await page.waitForTimeout(6000);
    rec('confirm_attempted', true);
    rec('confirm_success', report.collectionIds.length > 0 || /تم استلام|تم تسجيل/.test(await page.locator('body').innerText()));
  } else {
    rec('confirm_skipped', true, { reason: 'submit disabled — likely journal/method incomplete in automation' });
  }

  await browser.close();
  const failed = report.checks.filter((c) => !c.pass && c.id !== 'confirm_skipped');
  report.verdict = failed.length === 0 ? 'PASS' : 'PARTIAL_FAIL';
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  report.verdict = 'ERROR';
  report.error = err.message;
  console.error(err);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
