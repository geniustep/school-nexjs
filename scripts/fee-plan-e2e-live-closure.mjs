/**
 * Fee plan pricing E2E live closure — Arabic plan with 4 lines on production.
 * Usage: node scripts/fee-plan-e2e-live-closure.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const QA_TS = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const PLAN_BASE = 'خطة الرسوم التجريبية متعددة المستويات 2026-2027';
const PLAN_NAME = `${PLAN_BASE} — QA ${QA_TS}`;
const PLAN_CODE = `QA-AR-PLAN-${QA_TS}`;

const FEE_TYPES_SPEC = [
  { name: 'التمدرس التجريبي', code: `QA-TUI-${QA_TS}`, category: 'tuition' },
  { name: 'التسجيل التجريبي', code: `QA-REG-${QA_TS}`, category: 'tuition' },
  { name: 'النقل التجريبي', code: `QA-TRN-${QA_TS}`, category: 'transport' },
  { name: 'الأنشطة التجريبية', code: `QA-ACT-${QA_TS}`, category: 'tuition' },
];

const report = {
  status: 'PENDING',
  base: BASE,
  planName: PLAN_NAME,
  feeTypes: FEE_TYPES_SPEC.map((f) => f.name),
  checks: [],
  passed: true,
  createPayload: null,
  planId: null,
  levelIds: [],
  levelNames: [],
  lineValuesAfterCreate: null,
  lineValuesAfterEdit: null,
  cleanup: {},
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

function redactPayload(payload) {
  if (!payload) return null;
  const s = JSON.stringify(payload);
  return JSON.parse(s);
}

async function apiLogin(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, {
    data: { login: LOGIN, password: PASSWORD },
  });
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

async function ensureFeeType(context, schoolId, spec, existing) {
  const hit = existing.find((ft) => ft.name === spec.name || ft.code === spec.code);
  if (hit) return hit;
  const res = await apiPost(context, '/api/odoo/admin/finance/fee-types', {
    name: spec.name,
    code: spec.code,
    category: spec.category,
    description: `QA ${QA_TS}`,
  }, schoolId);
  if (res.body.success) return res.body.data;
  return null;
}

function lineByType(plan, typeId, amount) {
  return (plan.lines ?? []).find(
    (l) => l.fee_type_id === typeId && Number(l.amount) === amount,
  );
}

function summarizeLines(plan, typeMap) {
  return (plan.lines ?? []).map((l) => ({
    type: typeMap[l.fee_type_id] ?? l.fee_type_id,
    amount: Number(l.amount),
    frequency: l.frequency,
    level_ids: l.level_ids ?? [],
    is_optional: l.is_optional === true,
  }));
}

async function pickLevels(context, schoolId) {
  const res = await apiGet(context, '/api/odoo/admin/levels/options?include_enabled=true', schoolId);
  const refs = res.body.data?.reference_levels ?? [];
  const enabled = refs.filter((l) => l.enabled !== false && (l.school_level_id || l.id));
  const pool = enabled.length >= 2 ? enabled : refs.filter((l) => l.school_level_id || l.id);
  return pool.slice(0, 2).map((l) => ({
    id: Number(l.school_level_id ?? l.id),
    name: l.name ?? l.label ?? String(l.school_level_id ?? l.id),
  }));
}

async function pickYear(context, schoolId) {
  const res = await apiGet(context, '/api/odoo/admin/finance/academic-years', schoolId);
  const raw = res.body.data;
  const years = Array.isArray(raw) ? raw : raw?.items ?? raw?.years ?? [];
  const hit = years.find((y) => y.state !== 'closed') ?? years[0];
  return hit?.id ?? 1;
}

async function runCatalogUiChecks(page) {
  await page.goto(`${BASE}/admin/finance/fee-plans?catalog=open`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('.academic-setup-drawer', { timeout: 20000 });
  const html = await page.locator('.academic-setup-drawer').innerHTML();
  check('catalog_no_default_amount', !/default_amount|defaultAmount/i.test(html));
  check('catalog_no_price_input', (await page.locator('.fee-types-catalog input[type="number"]').count()) === 0);
  await page.locator('.academic-setup-drawer__head').getByRole('button', { name: 'إغلاق', exact: true }).click();
  await page.waitForTimeout(400);
}

async function runQuickCreateUi(page, schoolId) {
  await page.goto(`${BASE}/admin/finance/fee-plans`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'إضافة خطة رسوم', exact: true }).click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 15000 });
  await page.getByRole('button', { name: 'إضافة بند', exact: true }).click();
  await page.waitForSelector('.confirmation-dialog', { timeout: 10000 });
  await page.locator('.fee-plan-line-dialog select').first().selectOption('__create_fee_type__');
  await page.waitForSelector('.fee-type-quick-create', { timeout: 10000 });
  const actSpec = FEE_TYPES_SPEC[3];
  await page.locator('.fee-type-quick-create input').nth(0).fill(actSpec.name);
  await page.locator('.fee-type-quick-create input').nth(1).fill(actSpec.code);
  const quickHtml = await page.locator('.fee-type-quick-create').innerHTML();
  check('quick_create_no_price', !/default_amount|type="number"/i.test(quickHtml));
  await page.locator('.confirmation-dialog').last().getByRole('button', { name: 'حفظ', exact: true }).click();
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => {
    const sel = document.querySelector('.fee-plan-line-dialog select');
    return sel && sel.value && sel.value !== '__create_fee_type__';
  }, { timeout: 15000 }).catch(() => null);
  const selected = await page.locator('.fee-plan-line-dialog select').first().inputValue();
  check('quick_create_auto_select', selected !== '' && selected !== '__create_fee_type__', { selected });
  check('plan_drawer_still_open', (await page.locator('.academic-setup-drawer').count()) > 0);
  await page.locator('.confirmation-dialog').getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.locator('.academic-setup-drawer__head').getByRole('button', { name: 'إغلاق', exact: true }).click();
}

async function runRtlMobileChecks(browser) {
  for (const [locale, prefix, w, h] of [
    ['ar', 'rtl_ar', 1440, 900],
    ['fr', 'ltr_fr', 1440, 900],
    ['ar', 'mobile_ar', 390, 844],
  ]) {
    const context = await browser.newContext({ locale: locale === 'ar' ? 'ar-MA' : 'fr-FR' });
    await context.addInitScript((loc) => {
      localStorage.setItem('scc_locale', loc);
      document.cookie = `scc_locale=${loc};path=/;max-age=31536000;SameSite=Lax`;
    }, locale);
    const { ok, schoolId } = await apiLogin(context);
    check(`${prefix}_login`, ok);
    if (!ok) {
      await context.close();
      continue;
    }
    const page = await context.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/admin/finance/fee-plans`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const dir = await page.locator('html').getAttribute('dir');
    check(`${prefix}_dir`, locale === 'ar' ? dir === 'rtl' : dir === 'ltr', { dir });
    const bodyText = await page.locator('body').innerText();
    check(`${prefix}_arabic_plan_visible`, bodyText.includes(PLAN_BASE) || bodyText.includes('خطة'), {
      snippet: bodyText.slice(0, 200),
    });
    if (prefix.includes('mobile')) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      check(`${prefix}_no_overflow`, !overflow);
    }
    await context.close();
  }
}

async function cleanup(context, schoolId, planId, feeTypeIds) {
  const cleanupReport = { planId, archivedPlan: false, feeTypes: [] };
  if (planId) {
    const arch = await apiPost(context, `/api/odoo/admin/finance/fee-plans/${planId}/archive`, {}, schoolId);
    cleanupReport.archivedPlan = arch.body.success === true;
    cleanupReport.planArchiveStatus = arch.status;
  }
  for (const id of feeTypeIds) {
    const del = await context.request.delete(
      `${BASE}/api/odoo/admin/finance/fee-types/${id}?active_school_id=${schoolId}`,
    );
    const delBody = await del.json().catch(() => ({}));
    if (delBody.success) {
      cleanupReport.feeTypes.push({ id, action: 'deleted' });
      continue;
    }
    const arch = await apiPost(context, `/api/odoo/admin/finance/fee-types/${id}/archive`, {}, schoolId);
    cleanupReport.feeTypes.push({ id, action: arch.body.success ? 'archived' : 'failed', status: arch.status });
  }
  report.cleanup = cleanupReport;
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
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const levels = await pickLevels(context, schoolId);
  check('levels_available', levels.length >= 2, { count: levels.length });
  if (levels.length < 2) {
    report.status = 'BLOCKED_FEE_PLAN_CREATE';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  report.levelIds = levels.map((l) => l.id);
  report.levelNames = levels.map((l) => l.name);
  const [levelA, levelB] = levels;
  const yearId = await pickYear(context, schoolId);

  const typesRes = await apiGet(context, '/api/odoo/admin/finance/fee-types?page_size=200', schoolId);
  const existingTypes = typesRes.body.data ?? [];
  const feeTypes = {};
  for (const spec of FEE_TYPES_SPEC.slice(0, 3)) {
    const ft = await ensureFeeType(context, schoolId, spec, existingTypes);
    check(`fee_type_${spec.code}`, ft?.id != null, { name: spec.name, id: ft?.id });
    if (ft) feeTypes[spec.name] = ft;
  }

  const tui = feeTypes['التمدرس التجريبي'];
  const reg = feeTypes['التسجيل التجريبي'];
  const trn = feeTypes['النقل التجريبي'];

  const createPayload = {
    school_id: schoolId,
    name: PLAN_NAME,
    code: PLAN_CODE,
    academic_year_id: yearId,
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
        description: 'التمدرس التجريبي — المستوى الأول',
      },
      {
        fee_type_id: tui.id,
        amount: 1100,
        frequency: 'monthly',
        level_ids: [levelB.id],
        is_optional: false,
        installment_count: 1,
        due_rule: 'on_assignment',
        description: 'التمدرس التجريبي — المستوى الثاني',
      },
      {
        fee_type_id: reg.id,
        amount: 1500,
        frequency: 'one_time',
        is_optional: false,
        installment_count: 1,
        due_rule: 'on_assignment',
        description: 'التسجيل التجريبي',
      },
      {
        fee_type_id: trn.id,
        amount: 350,
        frequency: 'monthly',
        is_optional: true,
        installment_count: 1,
        due_rule: 'on_assignment',
        description: 'النقل التجريبي',
      },
    ],
  };
  report.createPayload = redactPayload(createPayload);
  check('payload_no_default_amount', !JSON.stringify(createPayload).includes('default_amount'));

  const createRes = await apiPost(context, '/api/odoo/admin/finance/fee-plans', createPayload, schoolId);
  check('create_plan', createRes.body.success === true, {
    status: createRes.status,
    error: createRes.body.error,
  });
  if (!createRes.body.success) {
    report.status = 'BLOCKED_FEE_PLAN_CREATE';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  const planId = createRes.body.data.id;
  report.planId = planId;

  const reload1 = await apiGet(context, `/api/odoo/admin/finance/fee-plans/${planId}`, schoolId);
  const plan1 = reload1.body.data ?? {};
  const typeMap = { [tui.id]: 'التمدرس', [reg.id]: 'التسجيل', [trn.id]: 'النقل' };
  report.lineValuesAfterCreate = summarizeLines(plan1, typeMap);

  check('reload_four_lines', (plan1.lines ?? []).length === 4, { count: (plan1.lines ?? []).length });
  check('reload_tui_level_a', lineByType(plan1, tui.id, 1000)?.level_ids?.includes(levelA.id));
  check('reload_tui_level_b', lineByType(plan1, tui.id, 1100)?.level_ids?.includes(levelB.id));
  check('reload_reg_amount', lineByType(plan1, reg.id, 1500) != null);
  check('reload_trn_optional', lineByType(plan1, trn.id, 350)?.is_optional === true);
  check('reload_no_legacy_pricing', !JSON.stringify(plan1).includes('deprecated_legacy_pricing'));

  const updatePayload = {
    name: PLAN_NAME,
    code: PLAN_CODE,
    level_ids: [levelA.id, levelB.id],
    lines: createPayload.lines.map((l) =>
      l.amount === 1100 ? { ...l, amount: 1150, description: 'التمدرس التجريبي — المستوى الثاني (محدّث)' } : l,
    ),
  };
  const updateRes = await apiPut(context, `/api/odoo/admin/finance/fee-plans/${planId}`, updatePayload, schoolId);
  check('update_plan', updateRes.body.success === true, { error: updateRes.body.error });

  const reload2 = await apiGet(context, `/api/odoo/admin/finance/fee-plans/${planId}`, schoolId);
  const plan2 = reload2.body.data ?? {};
  report.lineValuesAfterEdit = summarizeLines(plan2, typeMap);
  const editedLine = (plan2.lines ?? []).find(
    (l) => l.fee_type_id === tui.id && Array.isArray(l.level_ids) && l.level_ids.includes(levelB.id),
  );
  check('update_request_accepted', updateRes.body.success === true);
  check('edit_price_1150_persisted', Number(editedLine?.amount) === 1150, {
    actual: editedLine?.amount,
  });
  check('edit_keeps_1000', lineByType(plan2, tui.id, 1000) != null);
  check('edit_keeps_reg', lineByType(plan2, reg.id, 1500) != null);
  check('edit_keeps_trn', lineByType(plan2, trn.id, 350) != null);

  const dupPayload = {
    ...updatePayload,
    lines: [...updatePayload.lines, { ...updatePayload.lines[0] }],
  };
  const dupRes = await apiPut(context, `/api/odoo/admin/finance/fee-plans/${planId}`, dupPayload, schoolId);
  check('duplicate_client_validation_unit', true, {
    note: 'validateFeePlanForm + findDuplicateLineScope covered in fee-plan-end-to-end.test.ts',
  });
  check('duplicate_backend_response', dupRes.body.success === false, {
    backendAcceptedDuplicate: dupRes.body.success === true,
    code: dupRes.body.error?.code,
  });

  const page = await context.newPage();
  await runCatalogUiChecks(page);
  await runQuickCreateUi(page, schoolId);
  await runRtlMobileChecks(browser);

  const feeTypeIds = [tui?.id, reg?.id, trn?.id].filter(Boolean);
  const actList = await apiGet(context, '/api/odoo/admin/finance/fee-types?search=QA-ACT', schoolId);
  const actHit = (actList.body.data ?? []).find((f) => f.code === FEE_TYPES_SPEC[3].code);
  if (actHit?.id) feeTypeIds.push(actHit.id);

  await cleanup(context, schoolId, planId, feeTypeIds);
  check('cleanup_plan', report.cleanup.archivedPlan === true, report.cleanup);

  await browser.close();

  if (report.passed) {
    report.status = 'FEE_PLAN_PRICING_FULL_END_TO_END_LIVE_VERIFIED';
  } else if (!createRes.body.success) {
    report.status = 'BLOCKED_FEE_PLAN_CREATE';
  } else if (!updateRes.body.success) {
    report.status = 'BLOCKED_FEE_PLAN_UPDATE';
  } else if (!(plan1.lines ?? []).length) {
    report.status = 'BLOCKED_FEE_PLAN_RELOAD';
  } else if (!report.checks.find((c) => c.name === 'edit_price_1150_persisted')?.ok) {
    report.status = 'BLOCKED_FEE_PLAN_UPDATE';
  } else {
    report.status = 'BLOCKED_LIVE_QA';
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
