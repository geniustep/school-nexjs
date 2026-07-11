/**
 * Short smoke — students list financial service filter.
 * Tenant: school. Account: done.
 * Usage: node scripts/admin-students-financial-service-filter-smoke-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENTS_SERVICE_FILTER_QA_LOCAL_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENTS_SERVICE_FILTER_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENTS_SERVICE_FILTER_QA_LOGIN ?? 'done';
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

function pickTransportId(feeTypes) {
  const list = Array.isArray(feeTypes) ? feeTypes : [];
  const byCode = list.find((ft) => String(ft.code ?? '').toLowerCase() === 'transport');
  if (byCode?.id != null) return String(byCode.id);
  const byName = list.find((ft) => /نقل|transport/i.test(String(ft.name ?? '')));
  return byName?.id != null ? String(byName.id) : null;
}

async function waitForStudentsApi(page, predicate, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const hit = page.__studentsApiHits?.find(predicate);
    if (hit) return hit;
    await page.waitForTimeout(200);
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const page = await context.newPage();
  page.__studentsApiHits = [];

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/odoo/admin/students') && !url.includes('/export')) {
      page.__studentsApiHits.push(url);
    }
  });

  const login = await loginViaApi(context.request, context);
  record('login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const feeTypesRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/finance/fee-types?page=1&page_size=100&active=1`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const feeTypesBody = await feeTypesRes.json().catch(() => ({}));
  const feeTypes = Array.isArray(feeTypesBody.data) ? feeTypesBody.data : [];
  const transportId = pickTransportId(feeTypes);
  record('fee_types_loaded', feeTypesRes.status() === 200 && feeTypes.length > 0, {
    httpStatus: feeTypesRes.status(),
    count: feeTypes.length,
    transportId,
  });
  if (!transportId) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED', results, reason: 'transport_fee_type_missing' }, null, 2));
    process.exit(1);
  }

  const levelsRes = await context.request.get(`${LOCAL_BASE}/api/odoo/admin/levels`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const levelsBody = await levelsRes.json().catch(() => ({}));
  const levels = Array.isArray(levelsBody.data) ? levelsBody.data : [];
  const levelId = levels[0]?.id != null ? String(levels[0].id) : null;
  record('level_available', !!levelId, { levelId });

  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.students-list-page', { timeout: 60000 });
  await page.waitForSelector('.students-list-filters__service', { timeout: 60000 });

  const serviceSelect = page.locator('.students-list-filters__service');
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.students-list-filters__service');
      return el && el.options && el.options.length > 1;
    },
    null,
    { timeout: 60000 },
  );

  page.__studentsApiHits = [];
  await serviceSelect.selectOption(transportId);
  await page.waitForSelector('.students-list-filters__service-presence', { timeout: 15000 });

  const hasHit = await waitForStudentsApi(
    page,
    (url) => url.includes(`service_id=${transportId}`) && url.includes('service_presence=has'),
  );
  record('transport_has_request', !!hasHit, { url: hasHit ?? null, pageUrl: page.url() });
  record(
    'url_has_service',
    page.url().includes(`service_id=${transportId}`) && page.url().includes('service_presence=has'),
    { pageUrl: page.url() },
  );

  page.__studentsApiHits = [];
  await page.locator('.students-list-filters__service-presence').selectOption('not_has');
  const notHasHit = await waitForStudentsApi(
    page,
    (url) => url.includes(`service_id=${transportId}`) && url.includes('service_presence=not_has'),
  );
  record('transport_not_has_request', !!notHasHit, { url: notHasHit ?? null });

  if (levelId) {
    // Pick a cycle then level so level filter is enabled.
    const cycleSelect = page.locator('.students-list-filters__cycle');
    const cycleOptions = await cycleSelect.locator('option').evaluateAll((opts) =>
      opts.map((o) => o.value).filter(Boolean),
    );
    if (cycleOptions.length > 0) {
      await cycleSelect.selectOption(cycleOptions[0]);
      await page.waitForTimeout(400);
    }
    const levelSelect = page.locator('.students-list-filters__level');
    const enabled = await levelSelect.isEnabled();
    if (enabled) {
      const levelOptions = await levelSelect.locator('option').evaluateAll((opts) =>
        opts.map((o) => o.value).filter(Boolean),
      );
      if (levelOptions.length > 0) {
        page.__studentsApiHits = [];
        await levelSelect.selectOption(levelOptions[0]);
        const comboHit = await waitForStudentsApi(
          page,
          (url) =>
            url.includes(`service_id=${transportId}`) &&
            url.includes('service_presence=not_has') &&
            url.includes('level_id='),
        );
        record('transport_plus_level_request', !!comboHit, {
          url: comboHit ?? null,
          pageUrl: page.url(),
        });
        record(
          'url_keeps_service_with_level',
          page.url().includes(`service_id=${transportId}`) && page.url().includes('level='),
          { pageUrl: page.url() },
        );
      } else {
        record('transport_plus_level_request', false, { reason: 'no_level_options' });
      }
    } else {
      record('transport_plus_level_request', false, { reason: 'level_disabled' });
    }
  } else {
    record('transport_plus_level_request', false, { reason: 'no_levels' });
  }

  page.__studentsApiHits = [];
  await serviceSelect.selectOption('');
  await page.waitForTimeout(800);
  const clearedUrl = page.url();
  record(
    'clear_service_removes_presence',
    !clearedUrl.includes('service_id=') && !clearedUrl.includes('service_presence='),
    { pageUrl: clearedUrl },
  );
  const presenceGone = (await page.locator('.students-list-filters__service-presence').count()) === 0;
  record('presence_control_hidden_after_clear', presenceGone);

  const failed = results.filter((r) => !r.pass);
  const status = failed.length === 0 ? 'PASS' : 'FAILED';
  await browser.close();
  console.log(JSON.stringify({ status, transportId, results }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  console.log(JSON.stringify({ status: 'ERROR', error: String(err?.message ?? err), results }, null, 2));
  process.exit(1);
});
