/**
 * Finance full-stack release — live production smoke (read-only).
 * Usage: node scripts/finance-full-stack-production-smoke.mjs
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = 'https://school.raqeem.ma';
const HOST = 'school.raqeem.ma';
const LOGIN = 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const ROUTES = [
  '/admin/finance',
  '/admin/finance/agreements?student_id=617',
  '/admin/finance/installments?student_id=617',
  '/admin/finance/collections',
  '/admin/finance/cheques',
  '/admin/finance/services',
  '/admin/students/617?tab=finance',
  '/admin/students/617?tab=financial-agreement',
  '/admin/students/725?tab=financial-agreement',
];

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
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const loginOk = await loginViaApi(context.request, context);
  record('login', loginOk);
  if (!loginOk) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  for (const route of ROUTES) {
    const res = await context.request.get(`${BASE}${route}`, {
      headers: { 'X-Forwarded-Host': HOST },
    });
    record(`http_${route.split('?')[0]}`, res.status() === 200, { status: res.status() });
  }

  await page.goto(`${BASE}/admin/finance`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);
  record('finance_hub_load', !page.url().includes('/login'));
  const kpiCount = await page.locator('.finance-hub-kpi-grid .finance-metric-card, .finance-metrics-grid .finance-metric-card').count();
  record('finance_hub_kpis', kpiCount >= 1, { kpiCount });
  const hubLinks = await page.locator('.finance-hub-card, .finance-hub-grid a').count();
  record('finance_hub_links', hubLinks >= 3, { hubLinks });

  await page.goto(`${BASE}/admin/students/617?tab=finance`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.student-finance-tab, .student-360-tab-panel', { timeout: 60000 }).catch(() => null);
  const dualBadges = await page.locator('.student-finance-tab').count();
  record('student_617_finance_tab', dualBadges > 0);

  await page.goto(`${BASE}/admin/students/725?tab=financial-agreement`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  const empty725 =
    (await page.locator('.student-360-compact-empty').count()) > 0 ||
    (await page.getByText(/لم يتم إنشاء|empty|aucun accord/i).count()) > 0;
  record('student_725_empty_state', empty725);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/students/617?tab=finance`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  record('mobile_no_horizontal_overflow', !overflow, { overflow });

  const criticalConsole = consoleErrors.filter(
    (m) => !/404 \(Not Found\)/.test(m) && !/favicon/.test(m),
  );
  const failed = results.filter((r) => !r.pass);
  const status = failed.length === 0 ? 'PASSED' : 'FAILED';

  console.log(
    JSON.stringify(
      {
        status,
        base: BASE,
        criticalConsoleErrors: criticalConsole.slice(0, 10),
        results,
      },
      null,
      2,
    ),
  );

  await browser.close();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
