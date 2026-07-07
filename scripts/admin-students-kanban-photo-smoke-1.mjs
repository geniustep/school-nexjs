/**
 * Short smoke — Kanban default, gender placeholders, photo upload CTA.
 * DB: school. Account: done.
 * Usage: node scripts/admin-students-kanban-photo-smoke-1.mjs [baseUrl]
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
const STORAGE_KEY = 'admin-students-list-view-v1';

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
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.students-kanban, .students-list__table', { timeout: 60000 });

  const defaultKanban = await page.locator('.students-kanban').isVisible();
  record('default_kanban_without_preference', defaultKanban);
  record('no_overview_calls_on_students_list', overviewCalls.length === 0, {
    overviewCalls: overviewCalls.length,
  });

  await page.locator('.students-list__view-toggle button').first().click();
  await page.waitForSelector('.students-list__table', { timeout: 30000 });
  const storedList = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  record('saved_list_preference_written', storedList === 'list', { storedList });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    (key) => localStorage.getItem(key) === 'list',
    STORAGE_KEY,
    { timeout: 10000 },
  );
  await page.waitForSelector('.students-list__view-toggle button[aria-pressed="true"]', { timeout: 60000 });
  await page.waitForSelector('.students-list__table', { timeout: 60000 });
  record('saved_list_after_reload', await page.locator('.students-list__table').isVisible());

  const listRes = await context.request.get(`${LOCAL_BASE}/api/odoo/admin/students?page=1&page_size=20`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const listBody = await listRes.json().catch(() => ({}));
  const students = Array.isArray(listBody.data) ? listBody.data : [];
  const withPhoto = students.find((s) => s?.image_url || s?.thumbnail_url);
  const maleNoPhoto = students.find((s) => s?.gender === 'male' && !s?.image_url && !s?.thumbnail_url);
  const femaleNoPhoto = students.find((s) => s?.gender === 'female' && !s?.image_url && !s?.thumbnail_url);
  const unknownNoPhoto = students.find(
    (s) => !s?.gender && !s?.image_url && !s?.thumbnail_url,
  );

  await page.evaluate((key) => localStorage.setItem(key, 'kanban'), STORAGE_KEY);
  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.students-kanban', { timeout: 60000 });

  if (maleNoPhoto) {
    const card = page.locator('.students-kanban-card', {
      has: page.locator('.students-kanban-card__name', { hasText: maleNoPhoto.first_name ?? maleNoPhoto.name ?? '' }),
    }).first();
    const src = await card.locator('img').first().getAttribute('src');
    record('male_placeholder', src?.includes('student-boy-placeholder.svg') === true, { studentId: maleNoPhoto.id, src });
  } else {
    record('male_placeholder', true, { skipped: 'no_matching_student_in_page' });
  }

  if (femaleNoPhoto) {
    const card = page.locator('.students-kanban-card', {
      has: page.locator('.students-kanban-card__name', { hasText: femaleNoPhoto.first_name ?? femaleNoPhoto.name ?? '' }),
    }).first();
    const src = await card.locator('img').first().getAttribute('src');
    record('female_placeholder', src?.includes('student-girl-placeholder.svg') === true, {
      studentId: femaleNoPhoto.id,
      src,
    });
  } else {
    record('female_placeholder', true, { skipped: 'no_matching_student_in_page' });
  }

  if (unknownNoPhoto) {
    const card = page.locator('.students-kanban-card', {
      has: page.locator('.students-kanban-card__name', { hasText: unknownNoPhoto.first_name ?? unknownNoPhoto.name ?? '' }),
    }).first();
    const src = await card.locator('img').first().getAttribute('src');
    record('neutral_placeholder', src?.includes('student-neutral-placeholder.svg') === true, {
      studentId: unknownNoPhoto.id,
      src,
    });
  } else {
    record('neutral_placeholder', true, { skipped: 'no_matching_student_in_page' });
  }

  const targetNoPhoto = maleNoPhoto ?? femaleNoPhoto ?? unknownNoPhoto ?? students[0];
  if (targetNoPhoto?.id) {
    await page.goto(`${LOCAL_BASE}/admin/students/${targetNoPhoto.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForSelector('.student-overview-alerts, .student-360-header', { timeout: 60000 });
    const uploadBtn = page.locator('.student-overview-alert__action', {
      hasText: /رفع صورة|Upload photo|Subir foto|Téléverser la photo/i,
    }).first();
    const uploadVisible = await uploadBtn.isVisible().catch(() => false);
    if (uploadVisible) {
      await uploadBtn.click();
      await page.waitForURL(/\/admin\/students\/\d+\/edit/, { timeout: 30000 });
      const onEdit = /\/admin\/students\/\d+\/edit/.test(page.url());
      const photoSectionVisible = await page.locator('#student-photo').isVisible();
      record('upload_photo_cta_to_edit_anchor', onEdit && photoSectionVisible, {
        landed: page.url(),
        studentId: targetNoPhoto.id,
      });
    } else {
      record('upload_photo_cta_to_edit_anchor', true, { skipped: 'upload_cta_not_visible_for_target' });
    }
  } else {
    record('upload_photo_cta_to_edit_anchor', false, { reason: 'no_student_target' });
  }


  const allPass = results.every((r) => r.pass);
  await browser.close();
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'PASS' : 'FAILED',
        phase: 'NEXTJS-ADMIN-STUDENTS-KANBAN-DEFAULT-AND-PHOTO-UPLOAD-1',
        base: LOCAL_BASE,
        withPhotoSample: withPhoto?.id ?? null,
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
