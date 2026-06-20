/**
 * Visual QA: draft agreement CTA polish (854 / 1855).
 * Usage: node scripts/draft-cta-arabic-visual-qa.mjs
 * Env: QA_BASE_URL (default http://localhost:3000), QA_HOST (default school.raqeem.ma)
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const HOST = process.env.QA_HOST ?? 'school.raqeem.ma';
const LOGIN = 'done';
const PASSWORD = loadAccountPassword(LOGIN);

const CORRUPT_PATTERNS = [/اتfاق/i, /الrسوم/i, /مرajعة/i, /الدfعات/i, /تخfiض/i];

async function loginViaApi(request, context) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': HOST, 'Content-Type': 'application/json' },
    data: JSON.stringify({ login: LOGIN, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies && context) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
    });
    await context.addCookies(cookies);
  }
  return body.success === true;
}

async function openAgreementsTab(page, studentId) {
  const route = `/admin/students/${studentId}?tab=finance&financeSubTab=agreements`;
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const yearSelect = page.locator('.student-finance-year-select select, .student-finance-header-actions select').first();
  if ((await yearSelect.count()) > 0) {
    const options = await yearSelect.locator('option').allTextContents();
    const target =
      options.find((o) => /2025-2026|raqeem 2025/i.test(o)) ??
      options.find((o) => !/push mismatch/i.test(o));
    if (target) {
      await yearSelect.selectOption({ label: target.trim() });
      await page.waitForTimeout(2500);
    }
  }

  const agreementsTab = page.getByRole('tab', { name: /الاتفاق المالي/i });
  if ((await agreementsTab.count()) > 0) {
    await agreementsTab.first().click();
  }

  await page
    .waitForSelector(
      '#current-fees-draft-review, .student-finance-inactive-agreement-reference, .student-finance-agreement-header, .student-360-compact-empty',
      { timeout: 90000 },
    )
    .catch(() => null);
  await page.waitForTimeout(3000);
}

async function inspectStudent(page, studentId) {
  const route = `/admin/students/${studentId}?tab=finance&financeSubTab=agreements`;
  const httpRes = await page.context().request.get(`${BASE}${route}`, {
    headers: { 'X-Forwarded-Host': HOST },
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await openAgreementsTab(page, studentId);

  const bodyText = await page.locator('body').innerText();
  const agreementsText =
    (await page
      .locator('.student-finance-tab, .student-finance-agreement-embedded')
      .first()
      .innerText()
      .catch(() => '')) || bodyText;

  const corruptHits = CORRUPT_PATTERNS.filter((re) => re.test(bodyText + agreementsText)).map(String);

  const reviewDraftBtn = page.getByRole('button', { name: /مراجعة مسودة الاتفاق #248/ });
  const completeWorkflowBtn = page.getByRole('button', { name: /إكمال مسار اعتماد الاتفاق/ });
  const completeWorkflowLink = page.getByRole('link', { name: /إكمال مسار اعتماد الاتفاق/ });
  const createPrimaryBtn = page.getByRole('button', { name: /^إنشاء اتفاق من الرسوم الحالية$/ });
  const draftPanel = page.locator('#current-fees-draft-review');
  const feeRequired = page.getByText(/At least one fee is required/i);

  return {
    studentId,
    route,
    httpStatus: httpRes.status(),
    url: page.url(),
    loggedIn: !page.url().includes('/login'),
    agreementsSnippet: agreementsText.slice(0, 2500),
    corruptHits,
    hasCorruptArabic: corruptHits.length > 0,
    reviewDraftButtonVisible: (await reviewDraftBtn.count()) > 0,
    completeWorkflowButtonVisible: (await completeWorkflowBtn.count()) > 0,
    completeWorkflowLinkVisible: (await completeWorkflowLink.count()) > 0,
    createPrimaryButtonCount: await createPrimaryBtn.count(),
    draftPanelVisible: (await draftPanel.count()) > 0,
    draftPanelHas248: /#248|\b248\b/.test(agreementsText),
    hasDraftPanelTitle: agreementsText.includes('مسودة اتفاق من الرسوم الحالية'),
    hasReviewOrCompleteCta:
      (await reviewDraftBtn.count()) > 0 ||
      (await completeWorkflowBtn.count()) > 0 ||
      (await completeWorkflowLink.count()) > 0,
    feeRequiredVisible: (await feeRequired.count()) > 0,
    consoleErrors: consoleErrors.filter((m) => !/favicon/i.test(m)).slice(0, 8),
    has404Console: consoleErrors.some((m) => /404/.test(m)),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });

  const page = await context.newPage();
  const loginOk = await loginViaApi(context.request, context);
  if (!loginOk) {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: 'login_failed' }, null, 2));
    await browser.close();
    process.exit(1);
  }

  const r854 = await inspectStudent(page, 854);
  const r1855 = await inspectStudent(page, 1855);

  const pass854 =
    r854.loggedIn &&
    r854.httpStatus === 200 &&
    !r854.hasCorruptArabic &&
    !r854.feeRequiredVisible &&
    !r854.has404Console &&
    r854.draftPanelHas248 &&
    r854.hasReviewOrCompleteCta &&
    r854.createPrimaryButtonCount === 0;

  const pass1855 =
    r1855.loggedIn &&
    r1855.httpStatus === 200 &&
    !r1855.hasCorruptArabic &&
    !r1855.feeRequiredVisible &&
    r1855.createPrimaryButtonCount === 0;

  const report = {
    status: pass854 && pass1855 ? 'PASSED' : 'FAILED',
    base: BASE,
    student854: { ...r854, pass: pass854 },
    student1855: { ...r1855, pass: pass1855 },
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(pass854 && pass1855 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
