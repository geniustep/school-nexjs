/**
 * Visual audit — Kanban card desktop + mobile layout (not a product smoke).
 * Usage: node scripts/admin-students-kanban-visual-audit-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.argv[2] ?? 'http://localhost:3030').replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENTS_KANBAN_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const STORAGE_KEY = 'admin-students-list-view-v1';

async function login(request, context) {
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
  return body.success === true;
}

async function auditViewport(page, label) {
  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate((key) => localStorage.setItem(key, 'kanban'), STORAGE_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.students-kanban-card', { timeout: 60000 });

  const card = page.locator('.students-kanban-card').first();
  const metrics = await card.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const avatar = el.querySelector('.students-kanban-card__avatar');
    const avatarRect = avatar?.getBoundingClientRect();
    const actions = el.querySelector('.students-kanban-card__actions');
    const actionsRect = actions?.getBoundingClientRect();
    const moreBtn = el.querySelector('.students-kanban-card__more-btn');
    const moreInActions = actions?.contains(moreBtn ?? null) ?? false;
    const quickCount = el.querySelectorAll('.students-kanban-card__quick').length;
    const overflowX = el.scrollWidth > el.clientWidth + 1;
    const nameEl = el.querySelector('.students-kanban-card__name');
    const nameOverflow = nameEl ? nameEl.scrollWidth > nameEl.clientWidth : false;
    return {
      cardHeight: Math.round(rect.height),
      cardWidth: Math.round(rect.width),
      avatarSize: avatarRect ? Math.round(avatarRect.width) : 0,
      actionsBottom: actionsRect ? Math.round(actionsRect.bottom) : 0,
      cardBottom: Math.round(rect.bottom),
      moreInActionsFooter: moreInActions,
      quickCount,
      overflowX,
      nameTruncated: nameOverflow,
    };
  });

  return {
    label,
    pass:
      metrics.avatarSize >= 64 &&
      metrics.avatarSize <= 80 &&
      metrics.cardHeight >= 140 &&
      metrics.cardHeight <= 280 &&
      metrics.quickCount <= 2 &&
      metrics.moreInActionsFooter &&
      !metrics.overflowX,
    metrics,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const ok = await login(context.request, context);
  if (!ok) {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: 'login' }));
    process.exit(1);
  }

  const desktop = await auditViewport(page, 'desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await auditViewport(page, 'mobile');
  await browser.close();

  console.log(JSON.stringify({ status: desktop.pass && mobile.pass ? 'PASS' : 'REVIEW', desktop, mobile }, null, 2));
}

main().catch(console.error);
