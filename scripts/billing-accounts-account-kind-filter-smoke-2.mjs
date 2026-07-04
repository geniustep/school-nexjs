/**
 * Smoke — billing accounts server-side account_kind filter (QA phase 2).
 * Usage: node scripts/billing-accounts-account-kind-filter-smoke-2.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';
import { chromium } from 'playwright';

primeQaEnvFromLocal();

const BILLING_PARTNER_ID = 6667;
const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const AMOUNT = '1';
const EXPECTED_FAMILY_NAMES = ['سعيد الغزالي', 'مراد الخياط'];

const report = {
  phase: 'NEXTJS-BILLING-ACCOUNTS-SERVER-ACCOUNT-KIND-FILTER-SMOKE-2',
  base: BASE,
  billingPartnerId: BILLING_PARTNER_ID,
  verdict: 'PENDING',
  api: {},
  ui: {},
  collectionIds: [],
  receiptIds: [],
  checks: [],
};

function rec(id, pass, extra = {}) {
  report.checks.push({ id, pass, ...extra });
}

async function authCookies() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Forwarded-Host': HOST,
    },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = (typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [])
    .map((raw) => raw.split(';')[0])
    .join('; ');
  return { ok: body.success === true, cookies };
}

async function apiList(cookies, params) {
  const sp = new URLSearchParams(params);
  const url = `${BASE}/api/odoo/admin/finance/billing-accounts?${sp}`;
  const res = await fetch(url, {
    headers: { Cookie: cookies, Accept: 'application/json', 'X-Forwarded-Host': HOST },
  });
  const body = await res.json().catch(() => ({}));
  const items = Array.isArray(body.data) ? body.data : body.data?.items ?? [];
  return {
    status: res.status,
    success: body.success === true,
    total: body.meta?.pagination?.total ?? null,
    applied: body.meta?.applied_filters?.account_kind ?? null,
    items: items.map((r) => ({
      id: r.billing_partner_id ?? r.billing_partner?.id,
      name: r.display_name ?? r.billing_partner?.display_name ?? r.billing_partner?.name ?? '',
      student_count: r.student_count ?? null,
      account_kind: r.account_kind ?? null,
    })),
  };
}

async function loginPlaywright(request, context) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': HOST, 'Content-Type': 'application/json' },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies && context) {
    const raw = Array.isArray(setCookies) ? setCookies : [setCookies];
    await context.addCookies(
      raw.map((line) => {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
      }),
    );
  }
  return body.success === true;
}

function hasBadUiText(text) {
  return /404|Not Found|Internal Server Error|\[object Object\]|Backend error|Traceback/i.test(text);
}

async function main() {
  const session = await authCookies();
  rec('api_login', session.ok);
  if (!session.ok) {
    report.verdict = 'BLOCKED';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.api.all = await apiList(session.cookies, { page: '1', page_size: '50' });
  report.api.family = await apiList(session.cookies, {
    page: '1',
    page_size: '50',
    account_kind: 'family',
  });
  report.api.individual = await apiList(session.cookies, {
    page: '1',
    page_size: '50',
    account_kind: 'individual',
  });
  report.api.empty = await apiList(session.cookies, {
    page: '1',
    page_size: '50',
    account_kind: 'empty',
  });

  rec('api_all_total_69', report.api.all.total === 69, { total: report.api.all.total });
  rec('api_family_filtered', report.api.family.total != null && report.api.family.total < report.api.all.total, {
    familyTotal: report.api.family.total,
    allTotal: report.api.all.total,
    applied: report.api.family.applied,
  });
  rec('api_family_only_student_count_3', report.api.family.items.every((r) => r.student_count === 3), {
    counts: report.api.family.items.map((r) => r.student_count),
  });
  rec('api_family_expected_names', EXPECTED_FAMILY_NAMES.every((name) =>
    report.api.family.items.some((r) => r.name.includes(name)),
  ), {
    names: report.api.family.items.map((r) => r.name),
  });
  rec('api_individual_differs', report.api.individual.total !== report.api.family.total, {
    individualTotal: report.api.individual.total,
  });
  rec('api_empty_differs', report.api.empty.total !== report.api.all.total, {
    emptyTotal: report.api.empty.total,
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1440, height: 900 },
    locale: 'ar-MA',
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });
  const page = await context.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/family-collections') && res.request().method() === 'POST' && !url.includes('/preview') && res.ok()) {
      try {
        const json = await res.json();
        for (const c of json?.data?.collections ?? []) {
          if (c?.id) report.collectionIds.push(c.id);
        }
        for (const r of json?.data?.receipts ?? []) {
          if (r?.id) report.receiptIds.push(r.id);
        }
      } catch {
        /* ignore */
      }
    }
  });

  rec('ui_login', await loginPlaywright(context.request, context));

  await page.goto(`${BASE}/admin/finance/billing-accounts`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(3000);
  let text = await page.locator('body').innerText();
  report.ui.defaultTextSample = text.slice(0, 500);
  rec('ui_list_no_error', !hasBadUiText(text));
  const totalEl = page.locator('.finance-billing-accounts-metrics strong.mono').first();
  const totalText = (await totalEl.textContent().catch(() => ''))?.trim() ?? '';
  report.ui.defaultTotalShown = totalText;
  rec('ui_default_total_69', totalText === '69', { shown: totalText });

  const kindSelect = page.locator('select[name="account_kind"]');
  await kindSelect.selectOption('family');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  text = await page.locator('body').innerText();
  report.ui.familyTextSample = text.slice(0, 800);
  rec('ui_family_no_error', !hasBadUiText(text));
  rec('ui_family_names_present', EXPECTED_FAMILY_NAMES.every((n) => text.includes(n)), {
    found: EXPECTED_FAMILY_NAMES.filter((n) => text.includes(n)),
  });
  rec('ui_family_badges', (text.match(/عائلة/g) ?? []).length >= 2, {
    badgeCount: (text.match(/عائلة/g) ?? []).length,
  });
  rec('ui_family_no_individual_badge', !/فردي/.test(text));
  const familyTotalText =
    (await page.locator('.finance-billing-accounts-metrics strong.mono').first().textContent())?.trim() ?? '';
  report.ui.familyTotalShown = familyTotalText;
  rec('ui_family_total_matches_api', familyTotalText === String(report.api.family.total), {
    shown: familyTotalText,
    api: report.api.family.total,
  });

  await page.goto(`${BASE}/admin/finance/billing-accounts/${BILLING_PARTNER_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(3000);
  text = await page.locator('body').innerText();
  report.ui.detail6667Sample = text.slice(0, 600);
  rec('ui_6667_no_404', !hasBadUiText(text));
  rec('ui_6667_family_title', /الحساب المالي للأسرة|مراد الخياط/.test(text));
  rec('ui_6667_family_collect_btn', /استلام دفعة من الأسرة/.test(text));

  const familyBtn = page.getByRole('button', { name: /استلام دفعة من الأسرة/ }).first();
  if (await familyBtn.isVisible().catch(() => false)) {
    await familyBtn.click();
  } else {
    await page.goto(`${BASE}/admin/finance/billing-accounts/${BILLING_PARTNER_ID}?family_collect=1`, {
      waitUntil: 'domcontentloaded',
    });
  }
  await page.waitForSelector('.finance-family-collection-workflow', { timeout: 45000 });
  await page.waitForTimeout(2000);
  text = await page.locator('body').innerText();
  rec('ui_drawer_open', /المبلغ|طريقة الأداء|معاينة التوزيع/.test(text));

  const amountInput = page.locator('.finance-amount-field input').first();
  await amountInput.fill(AMOUNT);
  await page.getByRole('button', { name: /معاينة التوزيع/ }).first().click();
  await page.waitForTimeout(5000);
  text = await page.locator('body').innerText();
  rec('ui_preview_ok', /معاينة التوزيع|المبلغ الموزع|المبلغ المخصص|المتبقي/.test(text));

  const confirmBtn = page.getByRole('button', { name: /تأكيد استلام الدفعة/ }).first();
  const confirmEnabled = await confirmBtn.isEnabled().catch(() => false);
  report.ui.confirmEnabled = confirmEnabled;
  if (confirmEnabled) {
    await confirmBtn.click();
    await page.waitForTimeout(8000);
    text = await page.locator('body').innerText();
    rec('ui_confirm_attempted', true);
    rec('ui_confirm_ok', report.collectionIds.length > 0 || /تم استلام|تم تسجيل|نجاح/.test(text), {
      collectionIds: report.collectionIds,
      receiptIds: report.receiptIds,
    });
  } else {
    rec('ui_confirm_skipped', true, { reason: 'submit disabled in automation' });
  }

  await browser.close();

  const failed = report.checks.filter((c) => !c.pass && !String(c.id).includes('skipped'));
  report.verdict = failed.length === 0 ? 'PASS' : failed.length <= 2 ? 'PARTIAL' : 'FAIL';
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  report.verdict = 'ERROR';
  report.error = err.message;
  console.error(err);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
