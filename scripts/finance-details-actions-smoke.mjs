/**
 * Quick production smoke — collection/cheque details + currency formatting.
 * Usage: node scripts/finance-details-actions-smoke.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';
import { chromium } from 'playwright';

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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar-MA', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  record('login', await login(page.request, context));
  if (!results[0].pass) {
    console.log(JSON.stringify({ status: 'LIVE_SMOKE_FAILED', results }, null, 2));
    await browser.close();
    process.exit(1);
  }

  const collUrl = `${BASE}/admin/finance/collections/635?returnTo=${encodeURIComponent('/admin/finance/cheques/310')}`;
  await page.goto(collUrl, { waitUntil: 'networkidle' });
  let text = await page.locator('body').innerText();
  record('collection_no_object_object', !text.includes('[object Object]'));
  record('collection_formatted_money', /500[,.]00|MAD|د\.م/.test(text));
  record('collection_linked_cheque_btn', /فتح الشيك المرتبط|Open linked cheque/i.test(text));
  record('collection_back_to_cheque', /العودة إلى تفاصيل الشيك|Back to cheque details/i.test(text));

  await page.goto(`${BASE}/admin/finance/cheques/310`, { waitUntil: 'networkidle' });
  text = await page.locator('body').innerText();
  record('cheque_no_object_object', !text.includes('[object Object]'));
  record('cheque_action_bar', (await page.locator('.cheque-details__action-bar').count()) > 0);
  record('cheque_replace_label', /تسجيل تحصيل بديل|Record replacement collection/i.test(text));

  const openCollection = page.getByRole('link', { name: /فتح التحصيل الأصلي|Open original collection/i }).first();
  if (await openCollection.count()) {
    await openCollection.click();
    await page.waitForURL(/\/collections\/635/);
    text = await page.locator('body').innerText();
    record('nav_to_collection', /\/collections\/635/.test(page.url()));
    record('collection_return_context', /العودة إلى تفاصيل الشيك|Back to cheque details/i.test(text));
  } else {
    record('nav_to_collection', false);
    record('collection_return_context', false);
  }

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(
    JSON.stringify(
      {
        status: failed.length ? 'LIVE_SMOKE_FAILED' : 'LIVE_SMOKE_PASSED',
        base: BASE,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
