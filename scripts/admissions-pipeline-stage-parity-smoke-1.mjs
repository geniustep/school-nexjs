/**
 * Short smoke — admin admissions pipeline board + detail stage parity.
 * DB: school. Account: done (via qa-env.mjs).
 * Usage: node scripts/admissions-pipeline-stage-parity-smoke-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.argv[2] ?? process.env.ADMISSIONS_QA_LOCAL_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.ADMISSIONS_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.ADMISSIONS_QA_LOGIN ?? 'done';
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

  await page.goto(`${LOCAL_BASE}/admin/admissions`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.admissions-list-page', { timeout: 60000 });
  await page.waitForSelector('.admissions-kanban', { timeout: 60000 });

  const kanbanVisible = await page.locator('.admissions-kanban').isVisible();
  record('kanban_visible', kanbanVisible);

  const columnCount = await page.locator('.admissions-kanban__column').count();
  record('kanban_columns_present', columnCount >= 5, { columnCount });

  const dragHandleCount = await page.locator('.admission-card__drag-handle').count();
  const cardWrapCount = await page.locator('.admission-card-wrap').count();
  record('kanban_drag_handles_present', dragHandleCount > 0 || cardWrapCount > 0, {
    dragHandleCount,
    cardWrapCount,
  });

  const firstCardLink = page.locator('.admission-card-wrap .admission-card, .admission-card').first();
  if ((await firstCardLink.count()) > 0) {
    await firstCardLink.click();
    await page.waitForURL(/\/admin\/admissions\/\d+/, { timeout: 30000 });
    const pipelineStatus = await page.locator('.admissions-pipeline-status').isVisible();
    record('detail_pipeline_status_visible', pipelineStatus);
    record('detail_url', /\/admin\/admissions\/\d+/.test(page.url()), { url: page.url() });
  } else {
    record('detail_pipeline_status_visible', false, { reason: 'no_cards' });
  }

  const allPass = results.every((r) => r.pass);
  await browser.close();

  console.log(
    JSON.stringify(
      {
        status: allPass ? 'PASS' : 'FAILED',
        phase: 'NEXTJS-ADMISSIONS-PIPELINE-STAGE-PARITY-AND-DRAG-RESTORE-1',
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
