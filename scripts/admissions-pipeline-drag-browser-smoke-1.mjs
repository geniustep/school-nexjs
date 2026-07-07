/**
 * Browser smoke — admissions drag QA closure (#136).
 * DB: school. Account: done.
 * Usage: node scripts/admissions-pipeline-drag-browser-smoke-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, loadOdooTarget, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const TEST_ADMISSION_ID = 136;
const LOCAL_BASE = (process.argv[2] ?? process.env.ADMISSIONS_QA_LOCAL_URL ?? 'http://localhost:3025').replace(/\/$/, '');
const FORWARDED_HOST = process.env.ADMISSIONS_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.ADMISSIONS_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const ACTIVE_SCHOOL_ID = Number(process.env.ADMISSIONS_QA_SCHOOL_ID ?? 3);

const UI_STAGE_AR = {
  new: 'جديد',
  in_follow_up: 'قيد المتابعة',
};

const report = {
  browserSmoke: 'FAILED',
  testAdmission: null,
  transition: null,
  patchResult: null,
  afterReload: null,
  listDetailParity: null,
  registeredProtection: null,
  closedProtection: null,
  restoreResult: null,
  errors: [],
};

function fail(message, extra = {}) {
  report.errors.push({ message, ...extra });
}

async function loginSession(request) {
  const res = await request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  return {
    ok: body.success === true,
    schoolId: body.data?.user?.active_school_id ?? ACTIVE_SCHOOL_ID,
  };
}

async function bffRequest(request, method, path, data, schoolId) {
  const url = `${LOCAL_BASE}/api/odoo${path}?active_school_id=${schoolId}`;
  const res = await request.fetch(url, {
    method,
    headers: {
      'X-Forwarded-Host': FORWARDED_HOST,
      Accept: 'application/json',
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    data,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), ok: body.success === true, body };
}

async function fetchAdmission(request, id, schoolId) {
  const res = await bffRequest(request, 'GET', `/admin/admissions/${id}`, null, schoolId);
  return res.ok ? res.body.data : null;
}

async function addSessionCookies(context) {
  const login = await context.request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const setCookies = login.headers()['set-cookie'];
  if (!setCookies) return;
  const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: LOCAL_BASE };
  });
  await context.addCookies(cookies);
}

async function waitForKanban(page) {
  await page.goto(`${LOCAL_BASE}/admin/admissions`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.admissions-list-page', { timeout: 90000 });
  await page.waitForSelector('.admissions-kanban', { timeout: 90000 });
  await page.waitForTimeout(1500);
}

async function cardInStage(page, id, stage, retries = 6) {
  for (let i = 0; i < retries; i += 1) {
    const column = page.locator(`.admissions-kanban__column[data-stage="${stage}"]`);
    const count = await column.locator(
      `.admission-card-wrap a[href="/admin/admissions/${id}"], a.admission-card[href="/admin/admissions/${id}"]`,
    ).count();
    if (count > 0) return true;
    await page.waitForTimeout(800);
  }
  return false;
}

async function dragCard(page, id, targetStage) {
  const cardWrap = page.locator(`.admission-card-wrap:has(a[href="/admin/admissions/${id}"])`).first();
  const card = (await cardWrap.count()) > 0
    ? cardWrap
    : page.locator(`a.admission-card[href="/admin/admissions/${id}"]`).first();
  const target = page.locator(`.admissions-kanban__column[data-stage="${targetStage}"]`);
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  await card.dragTo(target, { targetPosition: { x: 40, y: 120 }, force: true });
  await page.waitForTimeout(2500);
}

async function readDetailStages(page, id) {
  await page.goto(`${LOCAL_BASE}/admin/admissions/${id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.admissions-pipeline-status', { timeout: 60000 });
  const pipelineText = ((await page.locator('.admissions-pipeline-status__primary .badge').first().textContent()) ?? '').trim();
  const select = page.locator('.admissions-pipeline-status__detailed select');
  const detailedState = (await select.count()) > 0
    ? await select.inputValue()
    : ((await page.locator('.admissions-pipeline-status__detailed .badge').first().textContent()) ?? '').trim();
  return { pipelineText, detailedState };
}

async function enableProtectionColumns(page) {
  await page.locator('label.admissions-toolbar-option', { hasText: /إظهار الطلبات المغلقة|Show closed/i }).locator('input').setChecked(true);
  await page.locator('label.admissions-toolbar-option', { hasText: /إخفاء الطلبات المحوّلة|Hide requests converted/i }).locator('input').setChecked(false);
  await page.waitForSelector('.admissions-kanban__column[data-stage="registered"]', { timeout: 30000 });
  await page.waitForSelector('.admissions-kanban__column[data-stage="closed"]', { timeout: 30000 });
  await page.waitForSelector(`a[href="/admin/admissions/${TEST_ADMISSION_ID}"]`, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    locale: 'ar',
  });
  const page = await context.newPage();
  const patchEvents = [];

  page.on('request', (req) => {
    if (req.method() !== 'PATCH') return;
    if (!req.url().includes(`/admin/admissions/${TEST_ADMISSION_ID}`)) return;
    patchEvents.push({ postData: req.postDataJSON?.() ?? req.postData() });
  });
  page.on('response', async (res) => {
    const req = res.request();
    if (req.method() !== 'PATCH') return;
    if (!req.url().includes(`/admin/admissions/${TEST_ADMISSION_ID}`)) return;
    const body = await res.json().catch(() => ({}));
    const last = patchEvents[patchEvents.length - 1];
    if (last) {
      last.status = res.status();
      last.success = body.success === true;
      last.error = body.error?.code ?? null;
    }
  });

  const login = await loginSession(context.request);
  if (!login.ok) {
    fail('login_failed');
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  await addSessionCookies(context);

  const schoolId = login.schoolId;
  let admission = await fetchAdmission(context.request, TEST_ADMISSION_ID, schoolId);
  if (!admission) {
    fail('admission_136_not_found');
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.testAdmission = {
    id: TEST_ADMISSION_ID,
    studentName: admission.student_name,
    initialState: admission.state,
  };

  if (admission.state !== 'new') {
    const reset = await bffRequest(context.request, 'PATCH', `/admin/admissions/${TEST_ADMISSION_ID}`, { state: 'new' }, schoolId);
    if (!reset.ok) fail('could_not_reset_to_new', { state: admission.state, status: reset.status });
    admission = await fetchAdmission(context.request, TEST_ADMISSION_ID, schoolId);
    report.testAdmission.initialState = admission?.state ?? admission.state;
  }
  if (admission.state !== 'new') fail('initial_state_not_new', { state: admission.state });

  await waitForKanban(page);
  if (!(await cardInStage(page, TEST_ADMISSION_ID, 'new'))) fail('card_not_in_new_column_before_drag');

  report.transition = { from: 'new', to: 'in_follow_up', expectedPatchState: 'contacted' };
  const patchBefore = patchEvents.length;
  await dragCard(page, TEST_ADMISSION_ID, 'in_follow_up');

  const patch = patchEvents.slice(patchBefore).find((p) => p.postData?.state === 'contacted' || p.postData?.state);
  report.patchResult = patch
    ? { status: patch.status, success: patch.success, payloadState: patch.postData?.state, error: patch.error }
    : { attempted: false };

  if (patch?.status !== 200 || !patch?.success) fail('patch_not_200', report.patchResult);
  if (patch?.postData?.state !== 'contacted') fail('patch_wrong_state', report.patchResult);
  if (!(await cardInStage(page, TEST_ADMISSION_ID, 'in_follow_up'))) fail('card_not_in_follow_up_after_drag');

  await waitForKanban(page);
  const persisted = await cardInStage(page, TEST_ADMISSION_ID, 'in_follow_up');
  report.afterReload = { inTargetColumn: persisted, stage: 'in_follow_up' };
  if (!persisted) fail('card_not_persisted_after_reload');

  const detail = await readDetailStages(page, TEST_ADMISSION_ID);
  report.listDetailParity = detail;
  if (detail.pipelineText !== UI_STAGE_AR.in_follow_up) fail('detail_pipeline_mismatch', detail);
  if (detail.detailedState !== 'contacted') fail('detail_raw_state_mismatch', detail);

  await waitForKanban(page);
  const restorePatchBefore = patchEvents.length;
  await dragCard(page, TEST_ADMISSION_ID, 'new');
  const restorePatch = patchEvents.slice(restorePatchBefore)[0];
  await waitForKanban(page);
  const restoredOnBoard = await cardInStage(page, TEST_ADMISSION_ID, 'new');
  report.restoreResult = {
    via: 'drag',
    patchStatus: restorePatch?.status ?? null,
    patchState: restorePatch?.postData?.state ?? null,
    success: restorePatch?.status === 200 && restorePatch?.success && restoredOnBoard,
    onBoardInNew: restoredOnBoard,
  };
  if (!report.restoreResult.success) fail('restore_to_new_failed', report.restoreResult);

  await enableProtectionColumns(page);
  const regPatchBefore = patchEvents.length;
  await dragCard(page, TEST_ADMISSION_ID, 'registered');
  await page.waitForTimeout(1500);
  const regBlocked = !patchEvents.slice(regPatchBefore).some((p) => p.postData?.state);
  const regStayed = await cardInStage(page, TEST_ADMISSION_ID, 'new');
  report.registeredProtection = { patchBlocked: regBlocked, stayedInNew: regStayed };
  if (!regBlocked || !regStayed) fail('registered_not_blocked');

  const closedPatchBefore = patchEvents.length;
  await dragCard(page, TEST_ADMISSION_ID, 'closed');
  await page.waitForTimeout(1500);
  const closedBlocked = !patchEvents.slice(closedPatchBefore).some((p) => p.postData?.state);
  const closedStayed = await cardInStage(page, TEST_ADMISSION_ID, 'new');
  report.closedProtection = { patchBlocked: closedBlocked, stayedInNew: closedStayed };
  if (!closedBlocked || !closedStayed) fail('closed_not_blocked');

  await browser.close();
  report.browserSmoke = report.errors.length === 0 ? 'PASS' : 'FAILED';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.browserSmoke === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  report.errors.push({ message: String(err.message ?? err) });
  report.browserSmoke = 'FAILED';
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
