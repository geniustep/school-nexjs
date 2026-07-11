/**
 * Short smoke — students service filter visibility + canonical count cards.
 * Tenant: school. Account: done.
 * Transport by service_id=1310 / code=TRANSPORT only.
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (
  process.argv[2] ??
  process.env.STUDENTS_SERVICE_COUNTS_QA_LOCAL_URL ??
  'http://localhost:3000'
).replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENTS_SERVICE_COUNTS_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENTS_SERVICE_COUNTS_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const TRANSPORT_ID = '1310';
const TRANSPORT_CODE = 'TRANSPORT';
const TRANSPORT_COUNT = 44;
const HIDDEN_CODES = new Set(['REGISTRATION', 'TUITION']);

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

function failHard(reason, extra = {}) {
  console.log(JSON.stringify({ status: 'FAILED', reason, results, ...extra }, null, 2));
  process.exit(1);
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

async function waitForApi(page, predicate, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const hit = page.__apiHits?.find(predicate);
    if (hit) return hit;
    await page.waitForTimeout(200);
  }
  return null;
}

function resolveTransport(items) {
  const byCode = items.filter((item) => String(item.code ?? '').toUpperCase() === TRANSPORT_CODE);
  const byId = items.filter((item) => String(item.service_id) === TRANSPORT_ID);
  if (byCode.length !== 1 && byId.length !== 1) {
    return { error: 'transport_not_unique_or_missing', byCode, byId };
  }
  const transport = byCode[0] ?? byId[0];
  if (String(transport.service_id) !== TRANSPORT_ID) {
    return { error: 'transport_id_mismatch', transport };
  }
  if (Number(transport.student_count) !== TRANSPORT_COUNT) {
    return { error: 'transport_count_mismatch', transport };
  }
  return { transport };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const page = await context.newPage();
  page.__apiHits = [];

  page.on('request', (req) => {
    const url = req.url();
    if (
      url.includes('/api/odoo/admin/students') ||
      url.includes('/api/odoo/admin/finance/fee-types')
    ) {
      page.__apiHits.push(url);
    }
  });

  const login = await loginViaApi(context.request, context);
  record('login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    failHard('login_failed');
  }

  const feeTypesRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/finance/fee-types?page=1&page_size=100&active=1&student_filter_visible=1&active_school_id=3`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const feeTypesBody = await feeTypesRes.json().catch(() => ({}));
  const feeTypes = Array.isArray(feeTypesBody?.data) ? feeTypesBody.data : [];
  const feeTypeIds = new Set(feeTypes.map((ft) => String(ft.id)));
  const feeTypeCodes = feeTypes.map((ft) => String(ft.code ?? '').toUpperCase());

  const countsRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/students/financial-service-counts?academic_year_id=1&state=active&active_school_id=3`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const countsBody = await countsRes.json().catch(() => ({}));
  const countsItems = Array.isArray(countsBody?.data?.items) ? countsBody.data.items : [];
  const resolved = resolveTransport(countsItems);
  if (resolved.error) {
    record('resolve_transport', false, resolved);
    await browser.close();
    failHard(resolved.error);
  }
  const transport = resolved.transport;

  record('fee_types_visibility_query', feeTypesRes.status() === 200, {
    httpStatus: feeTypesRes.status(),
    count: feeTypes.length,
  });
  record(
    'fee_types_hide_registration_tuition',
    !feeTypeCodes.includes('REGISTRATION') && !feeTypeCodes.includes('TUITION'),
    { feeTypeCodes },
  );
  record('counts_endpoint', countsRes.status() === 200 && countsItems.length > 0, {
    httpStatus: countsRes.status(),
    services: countsItems.length,
  });
  record(
    'counts_hide_registration_tuition',
    !countsItems.some((i) => HIDDEN_CODES.has(String(i.code ?? '').toUpperCase())),
    { codes: countsItems.map((i) => i.code) },
  );
  record(
    'counts_hide_zero',
    countsItems.every((i) => Number(i.student_count) > 0),
    { zeros: countsItems.filter((i) => Number(i.student_count) === 0).map((i) => i.code) },
  );
  record('transport_once', countsItems.filter((i) => String(i.code).toUpperCase() === TRANSPORT_CODE).length === 1);
  record('transport_count_44', Number(transport.student_count) === TRANSPORT_COUNT, {
    transportCount: transport.student_count,
  });

  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.students-service-counts__card--all', { timeout: 60000 });

  const feeTypesHit = page.__apiHits.find(
    (url) =>
      url.includes('/admin/finance/fee-types') &&
      url.includes('active=1') &&
      url.includes('student_filter_visible=1'),
  );
  record('ui_fee_types_sends_visibility', !!feeTypesHit, { url: feeTypesHit ?? null });

  record(
    'default_all_active',
    (await page.locator('.students-service-counts__card--all').getAttribute('aria-pressed')) ===
      'true',
  );
  record(
    'default_url_clean',
    !page.url().includes('service_id=') && !page.url().includes('service_presence='),
    { pageUrl: page.url() },
  );

  await page.waitForSelector('.students-service-counts__card[data-service-id]', { timeout: 30000 });
  const cardIds = await page.locator('.students-service-counts__card[data-service-id]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('data-service-id')),
  );
  const cardCodes = await page
    .locator('.students-service-counts__card[data-service-code]')
    .evaluateAll((nodes) => nodes.map((n) => (n.getAttribute('data-service-code') || '').toUpperCase()));

  record('ui_hides_registration', !cardCodes.includes('REGISTRATION'), { cardCodes });
  record('ui_hides_tuition', !cardCodes.includes('TUITION'), { cardCodes });
  record(
    'ui_hides_zero_cards',
    cardIds.every((id) => {
      const item = countsItems.find((c) => String(c.service_id) === id);
      return item && Number(item.student_count) > 0;
    }),
    { cardIds },
  );

  const transportCards = page.locator(`.students-service-counts__card[data-service-id="${TRANSPORT_ID}"]`);
  record('transport_card_unique', (await transportCards.count()) === 1);
  record('ui_transport_44', /44/.test(await transportCards.first().innerText()));

  await page.waitForSelector('.students-list-filters__service', { timeout: 30000 });
  const selectValues = await page.locator('.students-list-filters__service option').evaluateAll((opts) =>
    opts.map((o) => o.value).filter(Boolean),
  );
  record(
    'select_matches_cards',
    selectValues.length === cardIds.length &&
      selectValues.every((id) => cardIds.includes(id)) &&
      cardIds.every((id) => selectValues.includes(id)),
    { selectValues, cardIds },
  );
  record(
    'select_subset_of_visible_fee_types',
    selectValues.every((id) => feeTypeIds.has(id)),
    { selectValues, feeTypeIds: [...feeTypeIds] },
  );

  page.__apiHits = [];
  await transportCards.first().click();
  const hasHit = await waitForApi(
    page,
    (url) =>
      url.includes('/admin/students?') &&
      url.includes(`service_id=${TRANSPORT_ID}`) &&
      url.includes('service_presence=has') &&
      !url.includes('financial-service-counts'),
  );
  record('click_transport', !!hasHit && page.url().includes(`service_id=${TRANSPORT_ID}`), {
    url: hasHit ?? null,
    pageUrl: page.url(),
  });

  await page.locator('.students-service-counts__card--all').click();
  await page.waitForTimeout(600);
  record(
    'clear_to_all',
    !page.url().includes('service_id=') &&
      (await page.locator('.students-service-counts__card--all').getAttribute('aria-pressed')) ===
        'true',
    { pageUrl: page.url() },
  );

  // Stale hidden service_id should clear safely.
  await page.goto(`${LOCAL_BASE}/admin/students?service_id=1308&service_presence=has`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('.students-service-counts__card--all', { timeout: 60000 });
  await page.waitForTimeout(1200);
  const afterStale = page.url();
  record(
    'stale_hidden_service_cleared',
    !afterStale.includes('service_id=1308') &&
      (await page.locator('.students-service-counts__card--all').getAttribute('aria-pressed')) ===
        'true',
    { pageUrl: afterStale },
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const box = await page.locator('.students-service-counts').boundingBox();
  record('responsive_narrow', !!box && box.width <= 390 && box.width > 0, { box });

  const failed = results.filter((r) => !r.pass);
  await browser.close();
  console.log(
    JSON.stringify(
      {
        status: failed.length === 0 ? 'PASS' : 'FAILED',
        services: countsItems.length,
        transportId: TRANSPORT_ID,
        transportCount: TRANSPORT_COUNT,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  console.log(JSON.stringify({ status: 'ERROR', error: String(err?.message ?? err), results }, null, 2));
  process.exit(1);
});
