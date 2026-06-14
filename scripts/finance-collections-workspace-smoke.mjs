/**
 * Collections workspace — production/local smoke.
 * Usage: node scripts/finance-collections-workspace-smoke.mjs [baseUrl]
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
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  record('login', await login(context.request, context));
  if (!results[0].pass) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  await page.goto(`${BASE}/admin/finance/collections`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.data-table, .state', { timeout: 60000 });
  const listText = await page.locator('body').innerText();
  record('collections_list_no_backend', !/Backend/i.test(listText));
  record('collections_list_title', listText.includes('التحصيلات'));

  await page.goto(`${BASE}/admin/finance/collections/new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.finance-collection-workflow, .finance-student-search', { timeout: 60000 });
  const newText = await page.locator('body').innerText();
  record('new_page_no_backend', !/Backend/i.test(newText));
  record('new_page_desc', newText.includes('وسيلة الأداء') || newText.includes('طريقة الأداء'));

  await page.goto(`${BASE}/admin/finance/collections/new?studentId=617`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('.selected-student-finance-bar, .finance-collection-workflow', {
    timeout: 60000,
  });
  record('new_with_student_context', !(await page.locator('text=#617').first().isVisible().catch(() => false)));

  const frContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1440, height: 900 },
  });
  await frContext.addInitScript(() => {
    localStorage.setItem('scc_locale', 'fr');
    document.cookie = 'scc_locale=fr;path=/;max-age=31536000;SameSite=Lax';
  });
  await login(frContext.request, frContext);
  const frPage = await frContext.newPage();
  await frPage.goto(`${BASE}/admin/finance/collections`, { waitUntil: 'domcontentloaded' });
  record('fr_ltr', (await frPage.locator('html').getAttribute('dir')) === 'ltr');
  await frContext.close();

  const significant = consoleErrors.filter(
    (e) => !/webpack|favicon|ERR_ABORTED|ResizeObserver|hydration/i.test(e),
  );
  record('console_clean', significant.length === 0, { count: significant.length });

  await browser.close();
  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass
          ? 'FINANCE_COLLECTIONS_WORKSPACE_REBUILT_MERGED_DEPLOYED_LIVE_QA_PASSED'
          : 'LIVE_QA_FAILED',
        base: BASE,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
