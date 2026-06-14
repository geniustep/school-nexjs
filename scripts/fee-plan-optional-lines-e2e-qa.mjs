/**
 * Fee plan optional lines — assignment E2E QA (school fixture plan 1144).
 * Usage: node scripts/fee-plan-optional-lines-e2e-qa.mjs [localBase]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_360_QA_LOCAL_URL ?? 'http://localhost:3010').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const FIXTURE = {
  student_id: 617,
  school_id: 3,
  academic_year_id: 1,
  level_id: 77,
  fee_plan_id: 1144,
  required_line_ids: [1264, 1265],
  optional_line_ids: [1266, 1267],
  selected_optional_line_id: 1266,
  effective_date: '2026-09-01',
  expected_amounts: [300, 1200, 150],
  forbidden_amount: 250,
  expected_total_assessed: 1650,
};

const report = {
  status: 'PENDING',
  fixture: FIXTURE,
  checks: [],
  passed: true,
  assignment_performed: false,
  cleanup_handoff: null,
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

async function loginContext(browser, locale) {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    locale: locale === 'ar' ? 'ar-MA' : 'fr-FR',
  });
  await context.addInitScript((loc) => {
    localStorage.setItem('scc_locale', loc);
    document.cookie = `scc_locale=${loc};path=/;max-age=31536000;SameSite=Lax`;
  }, locale);
  const res = await context.request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: LOCAL_BASE };
    });
    await context.addCookies(cookies);
  }
  return { context, ok: body.success === true, schoolId: body.data?.user?.active_school_id ?? FIXTURE.school_id };
}

async function apiGet(request, path, schoolId) {
  const res = await request.get(`${LOCAL_BASE}/api/odoo${path}${path.includes('?') ? '&' : '?'}active_school_id=${schoolId}`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  return res.json().catch(() => ({}));
}

async function ensureYearSelected(page, form) {
  const yearSelect = form.locator('select').first();
  await yearSelect.waitFor({ state: 'visible', timeout: 15000 });
  for (let i = 0; i < 15; i++) {
    const value = await yearSelect.inputValue();
    if (value) return value;
    const options = await yearSelect.locator('option').evaluateAll((nodes) =>
      nodes.map((n) => ({ value: n.value, text: n.textContent ?? '' })),
    );
    const candidate = options.find((o) => o.value === String(FIXTURE.academic_year_id))
      ?? options.find((o) => o.value && !/choisir|select|اختر|loading|chargement/i.test(o.text));
    if (candidate) {
      await yearSelect.selectOption(candidate.value);
      return candidate.value;
    }
    await page.waitForTimeout(400);
  }
  return '';
}

async function selectPlan1144(page, form) {
  const planSelect = form.locator('select').nth(1);
  await planSelect.waitFor({ state: 'visible', timeout: 20000 });
  await planSelect.selectOption(String(FIXTURE.fee_plan_id));
}

async function waitForPlanDetails(page, prefix) {
  await page.waitForSelector(
    '.student-finance-assign-form__required-badge, .student-finance-assign-form input[type="checkbox"]',
    { timeout: 30000 },
  );
  check(`${prefix}_plan_details_loaded`, true);
}

async function testDrawerUi(page, locale, prefix, performAssignment) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${LOCAL_BASE}/admin/students/${FIXTURE.student_id}?tab=finance`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('.student-finance-tab', { timeout: 60000 });

  const assignLabel = locale === 'ar' ? 'إسناد خطة رسوم' : 'Attribuer un plan de frais';
  await page.getByRole('button', { name: assignLabel, exact: true }).first().click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 15000 });

  const form = page.locator('.student-finance-assign-form');
  const year = await ensureYearSelected(page, form);
  check(`${prefix}_year`, Boolean(year), year);

  let detailRequest = null;
  const onRequest = (req) => {
    if (req.url().includes(`/admin/finance/fee-plans/${FIXTURE.fee_plan_id}`)) detailRequest = req.url();
  };
  page.on('request', onRequest);

  await selectPlan1144(page, form);
  await waitForPlanDetails(page, prefix);
  page.off('request', onRequest);
  check(`${prefix}_detail_endpoint_used`, detailRequest != null, detailRequest);

  const requiredCount = await form.locator('.student-finance-assign-form__line-list .student-finance-assign-form__required-badge').count();
  check(`${prefix}_required_lines`, requiredCount >= 2, { requiredCount });

  const checkboxes = form.locator('input[type="checkbox"]');
  const optionalCount = await checkboxes.count();
  check(`${prefix}_optional_checkboxes`, optionalCount >= 2, { optionalCount });

  if (optionalCount > 0) {
    check(`${prefix}_optional_default_unchecked`, !(await checkboxes.first().isChecked()) && !(await checkboxes.nth(1).isChecked()));
  }

  if (performAssignment) {
    await page.locator('input[type="date"]').fill(FIXTURE.effective_date);
    await checkboxes.first().check();
    const submit = form.getByRole('button', { name: 'Affecter le plan', exact: true });
    await submit.click();
    await page.waitForTimeout(4000);
    const drawerClosed = (await page.locator('.academic-setup-drawer').count()) === 0;
    const formError = await form.locator('.form-error').first().textContent().catch(() => null);
    check(`${prefix}_assignment_submit`, drawerClosed || Boolean(formError), { drawerClosed, formError });
    report.assignment_performed = drawerClosed;
  }

  if (locale === 'ar') {
    const dir = await page.locator('html').getAttribute('dir');
    check(`${prefix}_rtl`, dir === 'rtl', { dir });
  }
}

async function verifyBackendState(request, schoolId) {
  const assignRes = await request.post(
    `${LOCAL_BASE}/api/odoo/admin/finance/students/${FIXTURE.student_id}/assign-fee-plan?active_school_id=${schoolId}`,
    {
      headers: { 'X-Forwarded-Host': FORWARDED_HOST, 'Content-Type': 'application/json' },
      data: {
        fee_plan_id: FIXTURE.fee_plan_id,
        effective_date: FIXTURE.effective_date,
        selected_optional_line_ids: [FIXTURE.selected_optional_line_id],
      },
    },
  );
  const assignBody = await assignRes.json().catch(() => ({}));
  if (assignRes.status() === 201 && assignBody.success) {
    report.assignment_performed = true;
    report.cleanup_handoff = {
      student_id: FIXTURE.student_id,
      fee_plan_id: FIXTURE.fee_plan_id,
      assigned_fee_ids: assignBody.data?.assigned_fee_ids ?? assignBody.data?.fees?.map((f) => f.id) ?? [],
      assigned_required_line_ids: assignBody.data?.assigned_required_line_ids ?? FIXTURE.required_line_ids,
      assigned_optional_line_ids: assignBody.data?.assigned_optional_line_ids ?? [FIXTURE.selected_optional_line_id],
      skipped_optional_line_ids: assignBody.data?.skipped_optional_line_ids ?? [1267],
      installment_ids: [],
    };
    check('assignment_api_success', true, { status: assignRes.status() });
  } else {
    check('assignment_api_blocked_or_done', assignRes.status() === 422 || assignBody.error?.code === 'fee_plan_already_assigned', {
      status: assignRes.status(),
      code: assignBody.error?.code,
    });
  }

  const feesBody = await apiGet(
    request,
    `/admin/finance/students/${FIXTURE.student_id}/fees?academic_year_id=${FIXTURE.academic_year_id}&page_size=50`,
    schoolId,
  );
  const fees = Array.isArray(feesBody.data) ? feesBody.data : [];
  const qaFees = fees.filter((f) => String(f.name ?? '').includes('20260614120556'));
  const amounts = qaFees.map((f) => Number(f.original_amount ?? f.amount)).sort((a, b) => a - b);
  const hasForbiddenOptional = amounts.includes(FIXTURE.forbidden_amount);
  check('fees_fixture_count', qaFees.length === 3, { count: qaFees.length, amounts, ids: qaFees.map((f) => f.id) });
  check('fees_expected_amounts', JSON.stringify(amounts) === JSON.stringify([...FIXTURE.expected_amounts].sort((a, b) => a - b)), amounts);
  check('fees_no_activity_b', !hasForbiddenOptional, amounts);
  if (hasForbiddenOptional) {
    report.backend_contract_issue =
      'Backend created Activity B (250 MAD) although selected_optional_line_ids was [1266] only.';
  }

  const summaryBody = await apiGet(
    request,
    `/admin/students/${FIXTURE.student_id}/finance/summary?academic_year_id=${FIXTURE.academic_year_id}`,
    schoolId,
  );
  const summary = summaryBody.data?.summary;
  check('summary_total_assessed', Number(summary?.total_assessed) === FIXTURE.expected_total_assessed, summary);
  check('summary_total_outstanding', Number(summary?.total_outstanding) === FIXTURE.expected_total_assessed, summary);

  const tuitionFee = qaFees.find((f) => Number(f.original_amount ?? f.amount) === 1200);
  const installmentIds = [];
  if (tuitionFee?.id) {
    const feeDetail = await apiGet(request, `/admin/finance/student-fees/${tuitionFee.id}`, schoolId);
    const installments = feeDetail.data?.installments ?? [];
    installmentIds.push(...installments.map((i) => i.id).filter(Boolean));
    const dueDates = [...new Set(installments.map((i) => String(i.due_date).slice(0, 10)))].sort();
    check('tuition_installment_dates', dueDates.join(',') === '2026-09-01,2026-10-01,2026-11-01', dueDates);
  }

  report.cleanup_handoff = {
    student_id: FIXTURE.student_id,
    fee_plan_id: FIXTURE.fee_plan_id,
    assigned_fee_ids: qaFees.map((f) => f.id),
    assigned_required_line_ids: FIXTURE.required_line_ids,
    assigned_optional_line_ids: [FIXTURE.selected_optional_line_id],
    skipped_optional_line_ids: hasForbiddenOptional ? [] : [1267],
    wrongly_assigned_optional_line_ids: hasForbiddenOptional ? [1267] : [],
    installment_ids: installmentIds,
    summary_after_assignment: summary,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const fr = await loginContext(browser, 'fr');
  check('fr_login', fr.ok, fr);
  if (!fr.ok) {
    await browser.close();
    report.status = 'BLOCKED_BY_AUTHENTICATION';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const frPage = await fr.context.newPage();
  await testDrawerUi(frPage, 'fr', 'fr_desktop', true);
  await verifyBackendState(fr.context.request, fr.schoolId);
  await fr.context.close();

  const ar = await loginContext(browser, 'ar');
  check('ar_login', ar.ok, ar);
  const arPage = await ar.context.newPage();
  await testDrawerUi(arPage, 'ar', 'ar_desktop', false);
  await ar.context.close();

  await browser.close();

  if (report.passed && report.assignment_performed) {
    report.status = 'COMPLETED_ASSIGNMENT_E2E_PASSED';
  } else if (report.checks.some((c) => c.name === 'fees_no_activity_b' && !c.ok)) {
    report.status = 'BLOCKED_BY_ASSIGNMENT_API';
  } else if (report.checks.some((c) => c.name.startsWith('assignment_api') && !c.ok)) {
    report.status = 'BLOCKED_BY_ASSIGNMENT_API';
  } else {
    report.status = report.passed ? 'COMPLETED_UI_E2E_PASSED' : 'LIVE_QA_FAILED_REQUIRES_FIX';
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed && report.status === 'COMPLETED_ASSIGNMENT_E2E_PASSED' ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
