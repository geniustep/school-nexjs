/**
 * Final fee plan optional lines E2E smoke — school fixture plan 1172.
 * Usage: node scripts/fee-plan-final-e2e-smoke.mjs [localBase]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENT_360_QA_LOCAL_URL ?? 'http://localhost:3015').replace(/\/$/, '');
const FORWARDED_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const FIXTURE = {
  student_id: 617,
  school_id: 3,
  academic_year_id: 1,
  fee_plan_id: 1172,
  plan_name: 'NextJS Final Optional Assignment QA 20260614123817',
  required_line_ids: [1330, 1331],
  optional_line_ids: [1332, 1333],
  selected_optional_line_id: 1332,
  effective_date: '2026-09-01',
  expected_amounts: [300, 1200, 150],
  forbidden_amount: 250,
  expected_total: 1650,
  qa_name_token: '20260614123817',
};

const report = {
  status: 'PENDING',
  fixture: FIXTURE,
  checks: [],
  passed: true,
  assignment_payload: null,
  assignment_response: null,
  cleanup_handoff: null,
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
    locale: 'fr-FR',
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'fr');
    document.cookie = 'scc_locale=fr;path=/;max-age=31536000;SameSite=Lax';
  });

  const loginRes = await context.request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const schoolId = loginBody.data?.user?.active_school_id ?? FIXTURE.school_id;
  check('login', loginBody.success === true, { status: loginRes.status() });

  const setCookies = loginRes.headers()['set-cookie'];
  if (setCookies) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: LOCAL_BASE };
    });
    await context.addCookies(cookies);
  }

  if (!loginBody.success) {
    await browser.close();
    report.status = 'BLOCKED_BY_AUTHENTICATION';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const detailRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/finance/fee-plans/${FIXTURE.fee_plan_id}?active_school_id=${schoolId}`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const detailBody = await detailRes.json().catch(() => ({}));
  check('api_plan_detail', detailRes.status() === 200 && detailBody.success === true, {
    status: detailRes.status(),
    error: detailBody.error,
  });

  const page = await context.newPage();
  let assignPayload = null;
  let assignResponse = null;

  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('assign-fee-plan')) {
      try {
        assignPayload = req.postDataJSON();
      } catch {
        assignPayload = null;
      }
    }
  });
  page.on('response', async (res) => {
    if (res.request().method() === 'POST' && res.url().includes('assign-fee-plan')) {
      try {
        assignResponse = await res.json();
      } catch {
        assignResponse = null;
      }
    }
  });

  await page.goto(`${LOCAL_BASE}/admin/students/${FIXTURE.student_id}?tab=finance`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  check('finance_tab_visible', await page.locator('.student-finance-tab').isVisible().catch(() => false));

  await page.getByRole('button', { name: 'Attribuer un plan de frais', exact: true }).first().click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 15000 });

  const form = page.locator('.student-finance-assign-form');
  await form.locator('select').first().selectOption(String(FIXTURE.academic_year_id));
  await page.waitForTimeout(800);

  const planSelect = form.locator('select').nth(1);
  await planSelect.waitFor({ state: 'visible', timeout: 20000 });
  await planSelect.selectOption(String(FIXTURE.fee_plan_id));

  if (detailRes.status() === 200 && detailBody.success) {
    await page.waitForSelector(
      '.student-finance-assign-form__required-badge, .student-finance-assign-form input[type="checkbox"]',
      { timeout: 30000 },
    );
  } else {
    await page.waitForTimeout(3000);
  }

  const formText = await form.innerText();
  check('registration_line', /Registration|تسجيل|300/.test(formText), formText.slice(0, 400));
  check('tuition_line', /Tuition|دراسة|1200/.test(formText));
  check('activity_a_line', /Activity A|150/.test(formText));
  check('activity_b_line', /Activity B|250/.test(formText));

  const checkboxes = form.locator('input[type="checkbox"]');
  const checkboxCount = await checkboxes.count();
  check('optional_checkbox_count', checkboxCount === 2, checkboxCount);

  if (checkboxCount >= 2) {
    check(
      'optional_default_unchecked',
      !(await checkboxes.nth(0).isChecked()) && !(await checkboxes.nth(1).isChecked()),
    );
  }

  check(
    'installment_preview_visible',
    (await form.getByText(/Échéancier prévisionnel|échéance/i).count()) > 0,
  );

  if (detailRes.status() !== 200 || !detailBody.success) {
    check(
      'detail_error_state',
      /Impossible de charger les détails|Chargement des détails/i.test(formText),
      formText.slice(0, 500),
    );
    await browser.close();
    report.status = 'BLOCKED_BY_FEE_PLAN_LOADING';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  await page.locator('input[type="date"]').fill(FIXTURE.effective_date);
  await checkboxes.first().check();
  if (checkboxCount >= 2) {
    check('activity_b_not_selected', !(await checkboxes.nth(1).isChecked()));
  }

  await form.getByRole('button', { name: 'Affecter le plan', exact: true }).click();
  await page.waitForTimeout(6000);

  report.assignment_payload = assignPayload;
  report.assignment_response = assignResponse;

  check('payload_fee_plan_id', assignPayload?.fee_plan_id === FIXTURE.fee_plan_id, assignPayload);
  check(
    'payload_selected_optional',
    JSON.stringify(assignPayload?.selected_optional_line_ids ?? null) === JSON.stringify([1332]),
    assignPayload?.selected_optional_line_ids,
  );
  check(
    'payload_no_forbidden_ids',
    !assignPayload?.selected_optional_line_ids?.some((id) => [1330, 1331, 1333].includes(id)),
    assignPayload,
  );
  check('assignment_success', assignResponse?.success === true, assignResponse?.error ?? assignResponse?.data);

  const data = assignResponse?.data ?? {};
  check(
    'response_required_lines',
    JSON.stringify([...(data.assigned_required_line_ids ?? [])].sort()) === JSON.stringify([1330, 1331]),
    data.assigned_required_line_ids,
  );
  check(
    'response_optional_lines',
    JSON.stringify(data.assigned_optional_line_ids ?? []) === JSON.stringify([1332]),
    data.assigned_optional_line_ids,
  );
  check(
    'response_skipped_lines',
    JSON.stringify(data.skipped_optional_line_ids ?? []) === JSON.stringify([1333]),
    data.skipped_optional_line_ids,
  );

  check('drawer_closed', (await page.locator('.academic-setup-drawer').count()) === 0);
  check('toast_success', (await page.locator('.toast').count()) > 0);
  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  check('scroll_unlocked', bodyOverflow !== 'hidden', bodyOverflow);

  await page.waitForSelector('.student-finance-tab .finance-amount, .student-finance-tab .mono', {
    timeout: 15000,
  }).catch(() => null);

  const feesRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/finance/students/${FIXTURE.student_id}/fees?academic_year_id=${FIXTURE.academic_year_id}&page_size=50&active_school_id=${schoolId}`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const feesBody = await feesRes.json().catch(() => ({}));
  const qaFees = (Array.isArray(feesBody.data) ? feesBody.data : []).filter((f) =>
    String(f.name ?? '').includes(FIXTURE.qa_name_token),
  );
  const amounts = qaFees.map((f) => Number(f.original_amount ?? f.amount)).sort((a, b) => a - b);
  check('fees_count_three', qaFees.length === 3, { count: qaFees.length, ids: qaFees.map((f) => f.id), amounts });
  check(
    'fees_expected_amounts',
    JSON.stringify(amounts) === JSON.stringify([150, 300, 1200]),
    amounts,
  );
  check('fees_no_activity_b', !amounts.includes(FIXTURE.forbidden_amount), amounts);

  const summaryRes = await context.request.get(
    `${LOCAL_BASE}/api/odoo/admin/students/${FIXTURE.student_id}/finance/summary?academic_year_id=${FIXTURE.academic_year_id}&active_school_id=${schoolId}`,
    { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
  );
  const summary = (await summaryRes.json().catch(() => ({}))).data?.summary;
  check('summary_total_assessed', Number(summary?.total_assessed) === FIXTURE.expected_total, summary);
  check('summary_total_paid', Number(summary?.total_paid) === 0, summary);
  check('summary_total_outstanding', Number(summary?.total_outstanding) === FIXTURE.expected_total, summary);

  const tuitionFee = qaFees.find((f) => Number(f.original_amount ?? f.amount) === 1200);
  let installmentIds = [];
  if (tuitionFee?.id) {
    const feeDetailRes = await context.request.get(
      `${LOCAL_BASE}/api/odoo/admin/finance/student-fees/${tuitionFee.id}?active_school_id=${schoolId}`,
      { headers: { 'X-Forwarded-Host': FORWARDED_HOST } },
    );
    const installments = (await feeDetailRes.json().catch(() => ({}))).data?.installments ?? [];
    installmentIds = installments.map((i) => i.id).filter(Boolean);
    const rows = installments
      .map((i) => ({ due: String(i.due_date).slice(0, 10), amount: Number(i.amount) }))
      .sort((a, b) => a.due.localeCompare(b.due));
    check(
      'tuition_installments',
      JSON.stringify(rows) ===
        JSON.stringify([
          { due: '2026-09-01', amount: 400 },
          { due: '2026-10-01', amount: 400 },
          { due: '2026-11-01', amount: 400 },
        ]),
      rows,
    );
  }

  report.cleanup_handoff = {
    student_id: FIXTURE.student_id,
    fee_plan_id: FIXTURE.fee_plan_id,
    assigned_fee_ids: data.assigned_fee_ids ?? qaFees.map((f) => f.id),
    assigned_required_line_ids: data.assigned_required_line_ids ?? FIXTURE.required_line_ids,
    assigned_optional_line_ids: data.assigned_optional_line_ids ?? [FIXTURE.selected_optional_line_id],
    skipped_optional_line_ids: data.skipped_optional_line_ids ?? [1333],
    installment_ids: installmentIds,
    summary_after_assignment: summary,
  };

  await browser.close();

  if (report.passed) {
    report.status = 'COMPLETED_FINAL_ASSIGNMENT_E2E_PASSED';
  } else if (detailRes.status() !== 200 || !detailBody.success) {
    report.status = 'BLOCKED_BY_FEE_PLAN_LOADING';
  } else if (assignResponse?.success !== true) {
    report.status = 'BLOCKED_BY_ASSIGNMENT_API';
  } else if (!report.checks.find((c) => c.name === 'drawer_closed')?.ok || !report.checks.find((c) => c.name === 'toast_success')?.ok) {
    report.status = 'BLOCKED_BY_FRONTEND_REFRESH';
  } else {
    report.status = 'BLOCKED_BY_RUNTIME_CONTRACT';
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
