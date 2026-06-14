/**
 * Optional fee plan assignment — short live QA on school tenant.
 * Usage: node scripts/fee-plan-optional-lines-live-qa.mjs [localBase]
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
const STUDENT_ID = process.env.STUDENT_360_FEE_ASSIGN_STUDENT_ID ?? '617';
const PASSWORD = loadAccountPassword(LOGIN);

const report = {
  status: 'PENDING',
  studentId: STUDENT_ID,
  checks: [],
  passed: true,
  assignmentPerformed: false,
  emptyPlansObserved: false,
  cleanupNote: null,
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
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
  return { ok: body.success === true, status: res.status(), schoolId: body.data?.user?.active_school_id };
}

async function ensureYearSelected(page, form) {
  const yearSelect = form.locator('select').first();
  await yearSelect.waitFor({ state: 'visible', timeout: 15000 });
  for (let i = 0; i < 15; i++) {
    const value = await yearSelect.inputValue();
    if (value) return value;
    const options = await yearSelect.locator('option').evaluateAll((nodes) =>
      nodes.map((n) => ({ value: (n).value, text: (n).textContent ?? '' })),
    );
    const candidate = options.find((o) => o.value && !/choisir|select|اختر|loading|chargement/i.test(o.text));
    if (candidate) {
      await yearSelect.selectOption(candidate.value);
      return candidate.value;
    }
    await page.waitForTimeout(500);
  }
  return '';
}

async function testDrawerFlow(page, locale, performAssignment = false) {
  const prefix = `${locale}_desktop`;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${LOCAL_BASE}/admin/students/${STUDENT_ID}?tab=finance`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('.student-finance-tab', { timeout: 60000 });

  const assignLabel = locale === 'ar' ? 'إسناد خطة رسوم' : 'Attribuer un plan de frais';
  const assignBtn = page.getByRole('button', { name: assignLabel, exact: true }).first();
  check(`${prefix}_assign_button`, await assignBtn.isVisible().catch(() => false));
  await assignBtn.click();
  await page.waitForSelector('.academic-setup-drawer', { timeout: 15000 });

  const form = page.locator('.student-finance-assign-form');
  check(`${prefix}_drawer_open`, await page.locator('.academic-setup-drawer').isVisible());

  const yearValue = await ensureYearSelected(page, form);
  check(`${prefix}_year_selected`, Boolean(yearValue), yearValue || 'no academic year');
  if (!yearValue) return;

  await page.waitForTimeout(1500);
  const planSelect = form.locator('select').nth(1);
  const hasPlanSelect =
    (await planSelect.count()) > 0 && (await planSelect.isVisible().catch(() => false));

  if (!hasPlanSelect) {
    const emptyState = await form.getByText(
      /Aucun plan de frais confirmé|No confirmed fee plan|لا توجد خطة رسوم مؤكدة/i,
    ).count();
    check(`${prefix}_empty_plans_state`, emptyState > 0, 'no confirmed plans on backend');
    report.emptyPlansObserved = true;
    return;
  }

  await planSelect.selectOption({ index: 1 });
  await page.waitForTimeout(800);

  check(
    `${prefix}_required_section`,
    (await form.getByText(/Frais obligatoires|الرسوم الإجبارية|Mandatory fees/i).count()) > 0,
  );

  const optionalHeading = form.getByText(
    /Services et activités optionnels|الخدمات والأنشطة الاختيارية|Optional services/i,
  );
  const hasOptionalSection = (await optionalHeading.count()) > 0;
  if (hasOptionalSection) {
    check(`${prefix}_optional_section`, true);
    const checkboxes = form.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    check(`${prefix}_optional_checkboxes`, count > 0, { count });
    if (count > 0) {
      const firstChecked = await checkboxes.first().isChecked();
      check(`${prefix}_optional_unchecked_by_default`, !firstChecked);
      if (performAssignment) await checkboxes.first().check();
    }
  }

  check(
    `${prefix}_installment_preview`,
    (await form.getByText(/Échéancier prévisionnel|جدول الأقساط المتوقع|Expected installment schedule/i).count()) >
      0,
  );

  check(
    `${prefix}_assignment_summary`,
    (await form.getByText(/Récapitulatif avant affectation|ملخص قبل الإسناد|Summary before assignment/i).count()) >
      0,
  );

  if (performAssignment && locale === 'fr') {
    const submitLabel = 'Affecter le plan';
    const submit = form.getByRole('button', { name: submitLabel, exact: true });
    const submitVisible = await submit.isVisible().catch(() => false);
    if (submitVisible && !(await submit.isDisabled())) {
      await submit.click();
      await page.waitForTimeout(3000);
      const drawerClosed = (await page.locator('.academic-setup-drawer').count()) === 0;
      const toast = (await page.locator('.toast').count()) > 0;
      check(`${prefix}_assign_submit`, drawerClosed || toast, { drawerClosed, toast });
      report.assignmentPerformed = drawerClosed;
    } else {
      const err = await form.locator('.form-error').first().textContent().catch(() => null);
      check(`${prefix}_assign_submit`, false, { submitVisible, err });
    }
  }

  if (locale === 'ar') {
    const dir = await page.locator('html').getAttribute('dir');
    check(`${prefix}_rtl`, dir === 'rtl', { dir });
  }

  const closeLabel = locale === 'ar' ? 'إغلاق' : 'Fermer';
  if ((await page.locator('.academic-setup-drawer').count()) > 0) {
    await page.getByRole('button', { name: closeLabel, exact: true }).click({ force: true });
    await page.waitForTimeout(400);
  }
  check(`${prefix}_drawer_closed`, (await page.locator('.academic-setup-drawer').count()) === 0);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const locale of ['fr', 'ar']) {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
      locale: locale === 'ar' ? 'ar-MA' : 'fr-FR',
    });
    await context.addInitScript((loc) => {
      localStorage.setItem('scc_locale', loc);
      document.cookie = `scc_locale=${loc};path=/;max-age=31536000;SameSite=Lax`;
    }, locale);
    const page = await context.newPage();
    const login = await loginViaApi(context.request, context);
    check(`${locale}_login`, login.ok, login);
    if (!login.ok) {
      await browser.close();
      report.status = 'BLOCKED_BY_AUTHENTICATION';
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
    await testDrawerFlow(page, locale, locale === 'fr');
    await context.close();
  }

  await browser.close();
  report.status = report.passed ? 'COMPLETED_SHORT_LIVE_QA_PASSED' : 'LIVE_QA_FAILED_REQUIRES_FIX';
  report.cleanupNote = report.assignmentPerformed
    ? 'Assignment executed; manual fee cleanup may be required if fee_plan_already_assigned on rerun.'
    : 'Drawer UX verified; assignment skipped when submit disabled or plan already assigned.';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'QA_SCRIPT_ERROR', message: e.message }, null, 2));
  process.exit(1);
});
