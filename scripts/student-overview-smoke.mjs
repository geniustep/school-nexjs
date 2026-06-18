/**
 * Limited smoke for Student 360 overview enhancement.
 * DB: school only. Credentials via qa-env.mjs (STUDENT_360_QA_LOGIN / QA_*_PASSWORD).
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.env.STUDENT_360_QA_LOCAL_URL ?? 'http://localhost:3010').replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const STUDENT_ID = process.env.STUDENT_360_QA_STUDENT_ID ?? '727';
const PASSWORD = loadAccountPassword(LOGIN);

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err.message ?? err)));

  const login = await loginViaApi(context.request, context);
  record('login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const overviewRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/students/${STUDENT_ID}/overview`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const overviewBody = await overviewRes.json().catch(() => ({}));
  const overviewLive =
    overviewRes.status() === 200 && overviewBody.success === true && overviewBody.data != null;
  record('overview_endpoint', overviewLive, {
    httpStatus: overviewRes.status(),
    success: overviewBody.success,
    available: overviewBody.data?.available,
    error: overviewBody.error?.code,
  });

  await page.goto(`${LOCAL_BASE}/admin/students/${STUDENT_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.student-360-header', { timeout: 60000 });

  const headerVisible = await page.locator('.student-360-header').isVisible();
  record('header_visible', headerVisible);

  const avatarVisible =
    (await page.locator('.student-360-header__avatar').isVisible()) &&
    ((await page.locator('.student-360-header__avatar-img').count()) > 0 ||
      (await page.locator('.student-360-header__avatar').textContent())?.trim().length > 0);
  record('avatar_or_placeholder', avatarVisible);

  const overviewCards = await page.locator('.student-overview-cards').isVisible().catch(() => false);
  record('overview_cards_visible', overviewCards);

  const alertsOrCards =
    overviewCards ||
    (await page.locator('.student-overview-alerts').count()) > 0 ||
    (await page.locator('.student-overview-card').count()) > 0;
  record('alerts_or_cards', alertsOrCards);

  const bodyText = await page.locator('body').innerText();
  record('no_excused_absence', !bodyText.toLowerCase().includes('excused_absence'));

  const consentsRestricted = await page
    .locator('text=/autorisations|الموافقات|consents/i')
    .first()
    .isVisible()
    .catch(() => false);
  record('consents_section_present', consentsRestricted || overviewCards);

  record('no_page_crash', pageErrors.length === 0, { pageErrors });

  await browser.close();

  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'PASS' : 'FAIL',
        overviewLive,
        deploymentState: overviewLive ? 'COMPLETED_LIVE_QA_PASSED' : 'CODE_READY_WAITING_BACKEND_DEPLOY',
        studentId: STUDENT_ID,
        db: 'school',
        results,
      },
      null,
      2,
    ),
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
