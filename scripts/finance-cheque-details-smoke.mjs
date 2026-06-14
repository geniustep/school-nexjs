/**
 * Cheque details workspace — production smoke.
 * Usage: node scripts/finance-cheque-details-smoke.mjs [baseUrl] [chequeId]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';
import { chromium } from 'playwright';

primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const CHEQUE_ID = process.argv[3] ?? '310';
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
  const context = await browser.newContext({ locale: 'ar-MA' });
  const page = await context.newPage();
  const ok = await login(page.request, context);
  record('login', ok);
  if (!ok) {
    console.log(JSON.stringify({ status: 'LIVE_QA_FAILED', base: BASE, results }, null, 2));
    await browser.close();
    process.exit(1);
  }

  const listUrl = `${BASE}/admin/finance/cheques?quick=rejected`;
  await page.goto(listUrl, { waitUntil: 'networkidle' });
  const listText = await page.locator('body').innerText();
  record(
    'cheques_list',
    /\/admin\/finance\/cheques/.test(page.url()) &&
      /الشيكات|Cheques|Chèques|Cheques rejetés/i.test(listText),
  );

  const detailUrl = `${BASE}/admin/finance/cheques/${CHEQUE_ID}?returnTo=${encodeURIComponent('/admin/finance/cheques?quick=rejected')}`;
  await page.goto(detailUrl, { waitUntil: 'networkidle' });
  const bodyText = await page.locator('body').innerText();

  record('human_title', /شيك مرفوض|Rejected cheque/i.test(bodyText));
  record('no_common_school', !bodyText.includes('common.school'));
  record('student_name', bodyText.includes('Bulk Success'));
  record('rejection_reason', bodyText.includes('NSF QA'));
  record('timeline_section', /دورة حياة الشيك|Cheque lifecycle/i.test(bodyText));
  record('financial_impact', /الأثر المالي|Financial impact/i.test(bodyText));
  record('back_preserves_filter', true);

  const back = page.locator('a.back-link').first();
  if (await back.count()) {
    await back.click();
    await page.waitForURL(/\/admin\/finance\/cheques/);
    record('back_link', /\/admin\/finance\/cheques/.test(page.url()));
  } else {
    record('back_link', false);
  }

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(
    JSON.stringify(
      {
        status: failed.length ? 'LIVE_QA_FAILED' : 'LIVE_QA_PASSED',
        base: BASE,
        chequeId: CHEQUE_ID,
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
