/**
 * Smoke — Kanban card quick actions + more menu (role-aware redesign).
 * DB: school. Account: done.
 * Usage: node scripts/admin-students-kanban-actions-smoke-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENTS_KANBAN_QA_LOCAL_URL ?? 'http://localhost:3030').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENTS_KANBAN_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENTS_KANBAN_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const STORAGE_KEY = 'admin-students-list-view-v1';
const TARGET_STUDENT_ID = 854;

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
  const overviewCalls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/\/admin\/students\/\d+\/overview/.test(url)) overviewCalls.push(url);
  });

  const login = await loginViaApi(context.request, context);
  record('login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate((key) => localStorage.setItem(key, 'kanban'), STORAGE_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.students-kanban', { timeout: 60000 });

  const card = page.locator('.students-kanban-card', {
    has: page.locator(`.students-kanban-card__name[href="/admin/students/${TARGET_STUDENT_ID}"]`),
  }).first();
  const cardVisible = await card.isVisible();
  record('kanban_card_visible', cardVisible, { studentId: TARGET_STUDENT_ID });
  if (!cardVisible) {
    await browser.close();
    console.log(JSON.stringify({ status: 'FAILED', results }, null, 2));
    process.exit(1);
  }

  const avatarImg = card.locator('.students-kanban-card__avatar-img').first();
  const imgSrc = await avatarImg.getAttribute('src');
  const hasRealPhoto =
    imgSrc != null &&
    !imgSrc.includes('student-boy-placeholder') &&
    !imgSrc.includes('student-girl-placeholder') &&
    !imgSrc.includes('student-neutral-placeholder');
  record('real_photo_on_card', hasRealPhoto, { src: imgSrc });

  const quickActions = card.locator('.students-kanban-card__quick');
  const quickCount = await quickActions.count();
  record('max_two_visible_quick_actions', quickCount > 0 && quickCount <= 2, { quickCount });

  const editVisible = await card.locator('.students-kanban-card__edit, a[href$="/edit"]').filter({ hasNot: page.locator('.students-kanban-card__menu-item') }).count();
  record('modifier_not_visible_on_card', editVisible === 0, { editVisible });

  const moreBtn = card.locator('.students-kanban-card__more-btn');
  const moreInActions = await card.locator('.students-kanban-card__actions .students-kanban-card__more-btn').isVisible();
  record('more_menu_in_actions_footer', moreInActions);
  const moreNotInAvatar = await card.locator('.students-kanban-card__avatar-link .students-kanban-card__more-btn').count();
  record('more_not_on_avatar', moreNotInAvatar === 0);

  const firstQuick = quickActions.first();
  const quickHref = await firstQuick.getAttribute('href');
  await Promise.all([
    page.waitForURL((url) => url.pathname !== '/admin/students' || url.search.length > 0, { timeout: 30000 }),
    firstQuick.click(),
  ]);
  record('open_first_quick_action', page.url().includes(quickHref ?? '___missing___'), {
    landed: page.url(),
    quickHref,
  });

  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.students-kanban', { timeout: 60000 });
  const cardAgain = page.locator('.students-kanban-card', {
    has: page.locator(`.students-kanban-card__name[href="/admin/students/${TARGET_STUDENT_ID}"]`),
  }).first();
  await cardAgain.locator('.students-kanban-card__more-btn').click();
  const menuItem = cardAgain.locator('.students-kanban-card__menu-item').first();
  const menuVisible = await menuItem.isVisible();
  record('more_menu_opens', menuVisible);
  const menuHref = await menuItem.getAttribute('href');
  if (menuVisible && menuHref) {
    await Promise.all([
      page.waitForURL((url) => url.pathname + url.search !== '/admin/students', { timeout: 30000 }),
      menuItem.click(),
    ]);
    record('open_more_menu_item', page.url().includes(menuHref), { landed: page.url(), menuHref });
  } else {
    record('open_more_menu_item', false, { reason: 'menu_empty' });
  }

  record('no_overview_calls_on_students_list', overviewCalls.length === 0, {
    overviewCalls: overviewCalls.length,
  });

  await browser.close();
  const failed = results.some((r) => !r.pass);
  console.log(JSON.stringify({ status: failed ? 'FAILED' : 'PASS', results }, null, 2));
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
