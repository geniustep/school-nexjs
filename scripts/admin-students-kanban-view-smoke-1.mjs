/**
 * Short smoke — admin students list Kanban view.
 * DB: school. Account: done (via qa-env.mjs).
 * Usage: node scripts/admin-students-kanban-view-smoke-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENTS_KANBAN_QA_LOCAL_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENTS_KANBAN_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENTS_KANBAN_QA_LOGIN ?? 'done';
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
  const networkUrls = [];
  page.on('pageerror', (err) => pageErrors.push(String(err.message ?? err)));
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/odoo/admin/students')) networkUrls.push(url);
  });

  const login = await loginViaApi(context.request, context);
  record('login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const listRes = await context.request.get(`${LOCAL_BASE}/api/odoo/admin/students?page=1&page_size=5`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const listBody = await listRes.json().catch(() => ({}));
  const listLive = listRes.status() === 200 && listBody.success === true && Array.isArray(listBody.data);
  record('students_list_api', listLive, {
    httpStatus: listRes.status(),
    count: Array.isArray(listBody.data) ? listBody.data.length : 0,
    sampleHasImage: Array.isArray(listBody.data)
      ? listBody.data.some((s) => s?.image_url || s?.thumbnail_url)
      : false,
  });

  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.students-list-page', { timeout: 60000 });
  await page.waitForSelector('.students-list__table, .students-kanban', { timeout: 60000 });

  const listViewVisible = await page.locator('.students-list__table').isVisible();
  record('list_view_visible', listViewVisible);

  const viewToggleVisible = await page.locator('.students-list__view-toggle').isVisible();
  record('view_toggle_visible', viewToggleVisible);

  await page.locator('.students-list__view-toggle button[aria-pressed="false"]').last().click();
  await page.waitForSelector('.students-kanban', { timeout: 30000 });

  const kanbanVisible = await page.locator('.students-kanban').isVisible();
  record('kanban_visible', kanbanVisible);

  const cardCount = await page.locator('.students-kanban-card').count();
  record('kanban_cards_present', cardCount > 0, { cardCount });

  const firstCard = page.locator('.students-kanban-card').first();
  const nameVisible = cardCount > 0 && (await firstCard.locator('.students-kanban-card__name').isVisible());
  record('card_name_visible', nameVisible);

  const photoOrFallback =
    cardCount > 0 &&
    ((await firstCard.locator('.students-kanban-card__photo-img').count()) > 0 ||
      (await firstCard.locator('.students-kanban-card__photo-fallback').count()) > 0);
  record('card_photo_or_fallback', photoOrFallback);

  if (cardCount > 0) {
    const href = await firstCard.locator('.students-kanban-card__name').getAttribute('href');
    await firstCard.locator('.students-kanban-card__name').click();
    await page.waitForURL(/\/admin\/students\/\d+/, { timeout: 30000 });
    record('open_student_from_card', /\/admin\/students\/\d+/.test(page.url()), { href, landed: page.url() });
    await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('.students-list__view-toggle button').filter({ hasText: /بطاقات|Cards|Tarjetas|Cartes/i }).click();
    await page.waitForSelector('.students-kanban', { timeout: 30000 });
  } else {
    record('open_student_from_card', false, { reason: 'no_cards' });
  }

  await page.locator('.students-list__search').fill('a');
  await page.waitForTimeout(500);
  const searchApplied = (await page.locator('.students-list__search').inputValue()) === 'a';
  record('search_filter_preserved', searchApplied);

  const overviewCalls = networkUrls.filter((u) => /\/admin\/students\/\d+\/overview/.test(u));
  const nPlusOne = overviewCalls.length > 0;
  record('no_student_360_overview_per_card', !nPlusOne, { overviewCalls: overviewCalls.length });

  const allPass = results.every((r) => r.pass);
  await browser.close();

  console.log(
    JSON.stringify(
      {
        status: allPass ? 'PASS' : 'FAILED',
        phase: 'NEXTJS-ADMIN-STUDENTS-KANBAN-VIEW-1',
        base: LOCAL_BASE,
        pageErrors,
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
