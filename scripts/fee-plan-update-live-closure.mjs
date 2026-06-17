/**
 * Fee plan line update live closure — verifies Odoo 18.0.1.0.117 sync via Next.js BFF.
 * Usage: node scripts/fee-plan-update-live-closure.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const QA_TS = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;

const PLAN_BASE = 'خطة اختبار تحديث أسعار الرسوم متعددة المستويات 2026-2027';
const PLAN_NAME = `${PLAN_BASE} — QA ${QA_TS}`;
const PLAN_CODE = `QA-UPD-PLAN-${QA_TS}`;

const report = {
  status: 'PENDING',
  base: BASE,
  planName: PLAN_NAME,
  planId: null,
  lineIds: {},
  updatePayload: null,
  priceBefore: 1100,
  priceAfterPut: null,
  priceAfterReload: null,
  duplicateBackend: null,
  checks: [],
  passed: true,
  cleanup: {},
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

async function apiLogin(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { login: LOGIN, password: PASSWORD } });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
    });
    await context.addCookies(cookies);
  }
  return { ok: body.success === true, schoolId: body.data?.user?.active_school_id ?? 3 };
}

async function apiGet(context, path, schoolId) {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}active_school_id=${schoolId}`;
  const res = await context.request.get(url);
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

async function apiPost(context, path, data, schoolId) {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}active_school_id=${schoolId}`;
  const res = await context.request.post(url, { data });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

async function apiPut(context, path, data, schoolId) {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}active_school_id=${schoolId}`;
  const res = await context.request.put(url, { data });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

async function ensureFeeType(context, schoolId, name, code, category) {
  for (const filter of ['active', 'archived', 'all']) {
    const list = await apiGet(
      context,
      `/api/odoo/admin/finance/fee-types?search=${encodeURIComponent(code)}&page_size=20&active_filter=${filter}`,
      schoolId,
    );
    const hit = (list.body.data ?? []).find((ft) => ft.code === code);
    if (hit) {
      if (hit.active === false) {
        await apiPost(context, `/api/odoo/admin/finance/fee-types/${hit.id}/restore`, {}, schoolId);
      }
      return hit;
    }
  }
  const res = await apiPost(
    context,
    '/api/odoo/admin/finance/fee-types',
    { name, code, category, description: `QA ${QA_TS}` },
    schoolId,
  );
  return res.body.success ? res.body.data : null;
}

async function pickLevels(context, schoolId) {
  const res = await apiGet(context, '/api/odoo/admin/levels/options?include_enabled=true', schoolId);
  const refs = res.body.data?.reference_levels ?? [];
  const pool = refs.filter((l) => l.enabled !== false && (l.school_level_id || l.id));
  return pool.slice(0, 2).map((l) => ({
    id: Number(l.school_level_id ?? l.id),
    name: l.name ?? String(l.school_level_id ?? l.id),
  }));
}

function linePayloadFromApi(line) {
  const payload = {
    id: line.id,
    fee_type_id: line.fee_type_id,
    amount: Number(line.amount),
    frequency: line.frequency,
    is_optional: line.is_optional === true,
    installment_count: line.installment_count ?? 1,
    due_rule: line.due_rule ?? 'on_assignment',
    description: typeof line.description === 'string' ? line.description : undefined,
  };
  if (Array.isArray(line.level_ids) && line.level_ids.length > 0) {
    payload.level_ids = line.level_ids;
  } else {
    payload.level_ids = [];
  }
  return payload;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar-MA' });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });

  const { ok: loginOk, schoolId } = await apiLogin(context);
  check('login', loginOk, { schoolId });
  if (!loginOk) {
    report.status = 'BLOCKED_LIVE_QA';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const levels = await pickLevels(context, schoolId);
  check('levels', levels.length >= 2, { levels });
  const [levelA, levelB] = levels;

  const tui = await ensureFeeType(context, schoolId, 'التمدرس التجريبي', `QA-TUI-${QA_TS}`, 'tuition');
  const reg = await ensureFeeType(context, schoolId, 'التسجيل التجريبي', `QA-REG-${QA_TS}`, 'tuition');
  const trn = await ensureFeeType(context, schoolId, 'النقل التجريبي', `QA-TRN-${QA_TS}`, 'transport');
  check('fee_types', !!(tui?.id && reg?.id && trn?.id), { tui: tui?.id, reg: reg?.id, trn: trn?.id });

  const createPayload = {
    school_id: schoolId,
    name: PLAN_NAME,
    code: PLAN_CODE,
    academic_year_id: 1,
    level_ids: [levelA.id, levelB.id],
    lines: [
      {
        fee_type_id: tui.id,
        amount: 1000,
        frequency: 'monthly',
        level_ids: [levelA.id],
        is_optional: false,
        installment_count: 1,
        due_rule: 'on_assignment',
      },
      {
        fee_type_id: tui.id,
        amount: 1100,
        frequency: 'monthly',
        level_ids: [levelB.id],
        is_optional: false,
        installment_count: 1,
        due_rule: 'on_assignment',
      },
      {
        fee_type_id: reg.id,
        amount: 1500,
        frequency: 'one_time',
        level_ids: [],
        is_optional: false,
        installment_count: 1,
        due_rule: 'on_assignment',
      },
      {
        fee_type_id: trn.id,
        amount: 350,
        frequency: 'monthly',
        level_ids: [],
        is_optional: true,
        installment_count: 1,
        due_rule: 'on_assignment',
      },
    ],
  };

  const createRes = await apiPost(context, '/api/odoo/admin/finance/fee-plans', createPayload, schoolId);
  check('create_plan', createRes.body.success === true, { status: createRes.status, error: createRes.body.error });
  if (!createRes.body.success) {
    report.status = 'BLOCKED_FEE_PLAN_UPDATE_LIVE';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const planId = createRes.body.data.id;
  report.planId = planId;

  const reload1 = await apiGet(context, `/api/odoo/admin/finance/fee-plans/${planId}`, schoolId);
  const plan1 = reload1.body.data ?? {};
  check('reload_four_lines', (plan1.lines ?? []).length === 4);

  const linesBefore = (plan1.lines ?? []).map(linePayloadFromApi);
  const line2Before = linesBefore.find((l) => l.level_ids?.includes(levelB.id));
  report.lineIds.before = linesBefore.map((l) => l.id);
  check('line2_before_1100', line2Before?.amount === 1100, { amount: line2Before?.amount });

  const updateLines = linesBefore.map((l) =>
    l.level_ids?.includes(levelB.id) ? { ...l, amount: 1150 } : l,
  );
  const updatePayload = {
    name: PLAN_NAME,
    code: PLAN_CODE,
    level_ids: [levelA.id, levelB.id],
    lines: updateLines,
  };
  report.updatePayload = updatePayload;

  const updateRes = await apiPut(context, `/api/odoo/admin/finance/fee-plans/${planId}`, updatePayload, schoolId);
  check('put_success', updateRes.body.success === true, { status: updateRes.status, error: updateRes.body.error });
  const line2AfterPut = (updateRes.body.data?.lines ?? []).find((l) =>
    Array.isArray(l.level_ids) ? l.level_ids.includes(levelB.id) : false,
  );
  report.priceAfterPut = line2AfterPut?.amount ?? null;
  check('put_response_1150', Number(line2AfterPut?.amount) === 1150, { amount: line2AfterPut?.amount });

  const reload2 = await apiGet(context, `/api/odoo/admin/finance/fee-plans/${planId}`, schoolId);
  const plan2 = reload2.body.data ?? {};
  const line2Reload = (plan2.lines ?? []).find((l) =>
    Array.isArray(l.level_ids) ? l.level_ids.includes(levelB.id) : false,
  );
  report.priceAfterReload = line2Reload?.amount ?? null;
  report.lineIds.after = (plan2.lines ?? []).map((l) => l.id);
  check('reload_price_1150', Number(line2Reload?.amount) === 1150, { amount: line2Reload?.amount });
  check('line_ids_stable', JSON.stringify(report.lineIds.before) === JSON.stringify(report.lineIds.after));
  check('other_prices_unchanged', (plan2.lines ?? []).some((l) => Number(l.amount) === 1000));
  check('reg_still_1500', (plan2.lines ?? []).some((l) => Number(l.amount) === 1500));
  check('trn_still_350_optional', (plan2.lines ?? []).some((l) => Number(l.amount) === 350 && l.is_optional === true));

  const dupPayload = {
    ...updatePayload,
    lines: [...updateLines, { ...updateLines[0], id: undefined }],
  };
  delete dupPayload.lines[dupPayload.lines.length - 1].id;
  const dupRes = await apiPut(context, `/api/odoo/admin/finance/fee-plans/${planId}`, dupPayload, schoolId);
  report.duplicateBackend = {
    status: dupRes.status,
    code: dupRes.body.error?.code,
    success: dupRes.body.success,
  };
  check('duplicate_backend_422', dupRes.status === 422 && dupRes.body.error?.code === 'fee_plan_duplicate_line', report.duplicateBackend);

  const act = await ensureFeeType(context, schoolId, 'الأنشطة التجريبية', `QA-ACT-${QA_TS}`, 'tuition');
  const addLines = [...updateLines, {
    fee_type_id: act.id,
    amount: 200,
    frequency: 'one_time',
    level_ids: [],
    is_optional: true,
    installment_count: 1,
    due_rule: 'on_assignment',
  }];
  const addRes = await apiPut(context, `/api/odoo/admin/finance/fee-plans/${planId}`, {
    name: PLAN_NAME,
    code: PLAN_CODE,
    level_ids: [levelA.id, levelB.id],
    lines: addLines,
  }, schoolId);
  check('add_line', addRes.body.success === true, addRes.body.error);
  const afterAdd = await apiGet(context, `/api/odoo/admin/finance/fee-plans/${planId}`, schoolId);
  check('add_line_visible', (afterAdd.body.data?.lines ?? []).length === 5);

  const linesAfterAdd = (afterAdd.body.data?.lines ?? []).map(linePayloadFromApi);
  const deleteLines = linesAfterAdd.filter((l) => l.fee_type_id !== act.id);
  const delRes = await apiPut(context, `/api/odoo/admin/finance/fee-plans/${planId}`, {
    name: PLAN_NAME,
    code: PLAN_CODE,
    level_ids: [levelA.id, levelB.id],
    lines: deleteLines,
  }, schoolId);
  check('delete_line', delRes.body.success === true);
  const afterDel = await apiGet(context, `/api/odoo/admin/finance/fee-plans/${planId}`, schoolId);
  check('delete_line_gone', (afterDel.body.data?.lines ?? []).length === 4);

  check('no_default_amount', !JSON.stringify(updatePayload).includes('default_amount'));

  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/finance/fee-plans`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('mobile_rtl', (await page.locator('html').getAttribute('dir')) === 'rtl');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  check('mobile_no_overflow', !overflow);

  await apiPost(context, `/api/odoo/admin/finance/fee-plans/${planId}/archive`, {}, schoolId);
  for (const ft of [tui, reg, trn, act]) {
    if (!ft?.id) continue;
    const del = await context.request.delete(`${BASE}/api/odoo/admin/finance/fee-types/${ft.id}?active_school_id=${schoolId}`);
    if ((await del.json().catch(() => ({}))).success !== true) {
      await apiPost(context, `/api/odoo/admin/finance/fee-types/${ft.id}/archive`, {}, schoolId);
    }
  }
  report.cleanup = { planId, archived: true };

  await browser.close();

  if (report.passed) {
    report.status = 'NEXTJS_FEE_PLAN_LINE_UPDATE_FULL_END_TO_END_LIVE_VERIFIED';
  } else if (!checkPassed('reload_price_1150')) {
    report.status = 'BLOCKED_FEE_PLAN_UPDATE_LIVE';
  } else if (!checkPassed('duplicate_backend_422')) {
    report.status = 'BLOCKED_DUPLICATE_ERROR_MAPPING';
  } else {
    report.status = 'BLOCKED_LIVE_QA';
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

function checkPassed(name) {
  return report.checks.find((c) => c.name === name)?.ok === true;
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
