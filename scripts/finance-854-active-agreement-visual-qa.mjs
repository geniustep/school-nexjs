/**
 * Visual QA (read-only): active financial agreement regression for students 854 and 1855.
 *
 * Purpose:
 *   - Student 854: active agreement fixture #248 on DB `school` (مدرسة رقيم التجريبية).
 *   - Student 1855: lighter regression — no repair/create-from-fees, collect available.
 *
 * Safety:
 *   - Read-only / visual checks only.
 *   - Does NOT create collections, modify agreements, delete data, or click destructive actions.
 *   - Navigation allowed: login API, academic-year select, agreements tab.
 *
 * Target DB: `school` only (via QA_HOST / X-Forwarded-Host).
 * QA login: `done` — password from `qa-env.mjs` or secure env vars (never hardcoded).
 *
 * Env:
 *   QA_BASE_URL — default http://localhost:3000
 *   QA_HOST     — default school.raqeem.ma
 *   DEBUG=1     — include a short page snippet in JSON (PII risk; off by default)
 *
 * Usage:
 *   node scripts/finance-854-active-agreement-visual-qa.mjs
 *   QA_BASE_URL=https://school.raqeem.ma QA_HOST=school.raqeem.ma node scripts/finance-854-active-agreement-visual-qa.mjs
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const HOST = process.env.QA_HOST ?? 'school.raqeem.ma';
const DEBUG = process.env.DEBUG === '1';
const LOGIN = 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const AGREEMENT_248_ID = 248;

const ROUTES = [
  { studentId: 854, path: '/admin/students/854?tab=finance', label: '854-finance' },
  {
    studentId: 854,
    path: '/admin/students/854?tab=finance&financeSubTab=agreements',
    label: '854-agreements',
    agreements: true,
    expectsAgreement248: true,
  },
  { studentId: 1855, path: '/admin/students/1855?tab=finance', label: '1855-finance' },
  {
    studentId: 1855,
    path: '/admin/students/1855?tab=finance&financeSubTab=agreements',
    label: '1855-agreements',
    agreements: true,
  },
];

const AGREEMENT_248_TEXT_PATTERNS = [
  /#248\b/,
  /\bاتفاق\s*#?\s*248\b/,
  /\bالاتفاق\s*المالي\s*#?\s*248\b/i,
  /\bagreement\s*#?\s*248\b/i,
  /\bFA\/[^/\s]*248[^/\s]*\b/i,
];

function isBenignConsoleError(message) {
  if (/404 \(Not Found\)/.test(message)) return true;
  if (/favicon/i.test(message)) return true;
  if (/RSC prefetch/i.test(message)) return true;
  if (/prefetch cache/i.test(message)) return true;
  if (/_next\/static/i.test(message) && /Failed to fetch RSC payload/i.test(message)) return true;
  if (/Falling back to browser navigation/i.test(message) && /Failed to fetch RSC payload/i.test(message)) {
    return true;
  }
  return false;
}

function isCriticalConsoleError(message) {
  if (isBenignConsoleError(message)) return false;
  if (/Application error/i.test(message)) return true;
  if (/Unhandled/i.test(message)) return true;
  if (/ReferenceError/i.test(message)) return true;
  if (msgTypeErrorWithoutRscPrefetch(message)) return true;
  return message.trim().length > 0;
}

function msgTypeErrorWithoutRscPrefetch(message) {
  if (!/TypeError/i.test(message)) return false;
  if (/Failed to fetch RSC payload/i.test(message)) return false;
  return true;
}

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

async function waitForFinanceSurface(page, { agreements = false } = {}) {
  await page.waitForSelector('.student-finance-tab, .student-finance-section', { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page
    .waitForFunction(
      ({ agreementsTab }) => {
        const text = (document.body?.innerText ?? '').replace(/,/g, '');
        if (agreementsTab) {
          return (
            document.querySelector('.student-finance-agreement-header') != null ||
            document.querySelector('.student-finance-agreement-meta') != null ||
            document.querySelector('.student-360-compact-empty') != null ||
            /حالة الاتفاق/.test(text)
          );
        }
        return (
          /22500|4500|18000/.test(text) ||
          document.querySelector('.student-finance-overview-panel') != null ||
          document.querySelector('.student-finance-command-bar') != null
        );
      },
      { agreementsTab: agreements },
      { timeout: 30000 },
    )
    .catch(() => {});
}

async function selectYearAndWait(page) {
  const yearSelect = page.locator('.student-finance-year-select select, .student-finance-header-actions select').first();
  if ((await yearSelect.count()) > 0) {
    const options = await yearSelect.locator('option').allTextContents();
    const target =
      options.find((o) => /2025-2026|raqeem 2025/i.test(o)) ??
      options.find((o) => !/push mismatch/i.test(o));
    if (target) {
      await yearSelect.selectOption({ label: target.trim() });
      await waitForFinanceSurface(page);
    }
  }
}

async function detectAgreement248(page, bodyText) {
  const domMarkers = await page.evaluate((agreementId) => {
    const selectors = [
      '.student-finance-agreement-meta',
      '.student-finance-agreement-header',
      '.student-finance-billing-source__hint',
      '.mono',
      '[data-agreement-id]',
    ];
    const chunks = [];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const idAttr = el.getAttribute('data-agreement-id');
        if (idAttr === String(agreementId)) {
          chunks.push(`data-agreement-id:${idAttr}`);
        }
        const text = (el.textContent ?? '').trim();
        if (text) chunks.push(text);
      }
    }
    return chunks;
  }, AGREEMENT_248_ID);

  const combined = `${bodyText}\n${domMarkers.join('\n')}`;
  const matchedPattern = AGREEMENT_248_TEXT_PATTERNS.find((re) => re.test(combined))?.source ?? null;
  const hasDomId = domMarkers.some((chunk) => new RegExp(`#?${AGREEMENT_248_ID}\\b`).test(chunk));
  const found = matchedPattern != null || hasDomId;

  return {
    found,
    matchedPattern,
    reason: found
      ? null
      : 'agreement #248 was not found in current agreements view (live fixture on DB school may have changed)',
  };
}

async function inspectRoute(page, route) {
  const consoleErrors = [];
  const handler = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', handler);

  const httpRes = await page.context().request.get(`${BASE}${route.path}`, {
    headers: { 'X-Forwarded-Host': HOST, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });

  await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => {
    if ('caches' in window) void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await selectYearAndWait(page);

  if (route.agreements) {
    const agreementsTab = page.getByRole('tab', { name: /الاتفاق المالي/i });
    if ((await agreementsTab.count()) > 0) {
      await agreementsTab.first().click();
      await waitForFinanceSurface(page, { agreements: true });
    }
  } else {
    await waitForFinanceSurface(page, { agreements: false });
  }

  const bodyText = await page.locator('body').innerText();
  page.off('console', handler);

  const agreement248 =
    route.expectsAgreement248 && route.agreements
      ? await detectAgreement248(page, bodyText)
      : { found: null, matchedPattern: null, reason: null };

  const result = {
    label: route.label,
    studentId: route.studentId,
    httpStatus: httpRes.status(),
    loggedIn: !page.url().includes('/login'),
    hasOperationalWithoutActive: /فوترة تشغيلية بدون اتفاق نشط/.test(bodyText),
    hasRepairCard:
      /إصلاح الاتفاق|agreementRepair|repair/i.test(bodyText) && /مطلوب|required|repair/i.test(bodyText),
    hasCreateFromFees: (await page.getByRole('button', { name: /^إنشاء اتفاق من الرسوم الحالية$/ }).count()) > 0,
    hasReviewDraft248: (await page.getByRole('button', { name: /مراجعة مسودة الاتفاق #248/ }).count()) > 0,
    hasDraftReviewPanel: (await page.locator('#current-fees-draft-review').count()) > 0,
    hasCollectBlockedMsg: /لا يمكن تسجيل دفعة قبل وجود اتفاق مالي نشط/.test(bodyText),
    hasCollectPaymentBtn:
      (await page.getByRole('button', { name: /تسجيل دفعة|تحصيل|collect payment/i }).count()) > 0 ||
      (await page.getByRole('link', { name: /تسجيل دفعة|تحصيل/i }).count()) > 0,
    hasActiveAgreement:
      /حالة الاتفاق\s*\n?\s*نشط|state.*active/i.test(bodyText) ||
      ((await page.locator('.student-finance-agreement-header').count()) > 0 &&
        /نشط|active/i.test(bodyText)),
    hasDraftBadge:
      /مسودة/.test(bodyText) &&
      route.studentId === 854 &&
      route.agreements &&
      !/اتفاق سابق|غير نشط/.test(bodyText),
    has248AsCurrent: agreement248.found === true,
    agreement248MatchedPattern: agreement248.matchedPattern,
    agreement248FailureReason: agreement248.found === false ? agreement248.reason : null,
    hasAmount22500: /22\s*500|22500/.test(bodyText.replace(/,/g, '')),
    hasAmount4500: /4\s*500|4500/.test(bodyText.replace(/,/g, '')),
    hasAmount18000: /18\s*000|18000/.test(bodyText.replace(/,/g, '')),
    feeRequired: /At least one fee is required/i.test(bodyText),
    consoleErrors: consoleErrors.filter((m) => !isBenignConsoleError(m)).slice(0, 8),
  };

  if (DEBUG) {
    result.debugSnippet = bodyText.slice(0, 240).replace(/\s+/g, ' ').trim();
  }

  return result;
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
  if (!(await loginViaApi(context.request, context))) {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: 'login_failed' }, null, 2));
    await browser.close();
    process.exit(1);
  }

  const results = [];
  for (const route of ROUTES) {
    results.push(await inspectRoute(page, route));
  }

  const r854Finance = results.find((r) => r.label === '854-finance');
  const r854Agreements = results.find((r) => r.label === '854-agreements');
  const r1855Finance = results.find((r) => r.label === '1855-finance');
  const r1855Agreements = results.find((r) => r.label === '1855-agreements');

  const pass854Finance =
    r854Finance.loggedIn &&
    r854Finance.httpStatus === 200 &&
    !r854Finance.hasOperationalWithoutActive &&
    !r854Finance.hasRepairCard &&
    !r854Finance.hasCreateFromFees &&
    !r854Finance.hasReviewDraft248 &&
    !r854Finance.hasCollectBlockedMsg &&
    r854Finance.hasCollectPaymentBtn &&
    r854Finance.hasAmount22500 &&
    r854Finance.hasAmount4500 &&
    r854Finance.hasAmount18000;

  const pass854Agreements =
    r854Agreements.loggedIn &&
    r854Agreements.httpStatus === 200 &&
    !r854Agreements.hasDraftReviewPanel &&
    !r854Agreements.hasReviewDraft248 &&
    !r854Agreements.hasCreateFromFees &&
    !r854Agreements.hasOperationalWithoutActive &&
    r854Agreements.has248AsCurrent &&
    !r854Agreements.feeRequired;

  const pass1855 =
    r1855Finance.loggedIn &&
    r1855Agreements.loggedIn &&
    !r1855Finance.hasCreateFromFees &&
    !r1855Agreements.hasCreateFromFees &&
    !r1855Finance.hasRepairCard &&
    r1855Finance.hasCollectPaymentBtn;

  const allConsole = results.flatMap((r) => r.consoleErrors);
  const criticalConsole = allConsole.filter(isCriticalConsoleError);

  const functionalPass = pass854Finance && pass854Agreements && pass1855;
  const report = {
    status: functionalPass && criticalConsole.length === 0 ? 'PASSED' : 'FAILED',
    base: BASE,
    host: HOST,
    pass854Finance,
    pass854Agreements,
    pass1855,
    agreement248FailureReason: r854Agreements.agreement248FailureReason,
    criticalConsoleErrors: criticalConsole,
    results,
  };

  if (!pass854Agreements && r854Agreements.agreement248FailureReason) {
    report.failureNote = r854Agreements.agreement248FailureReason;
  }

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.status === 'PASSED' ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
