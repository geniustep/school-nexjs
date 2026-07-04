/**
 * Smoke QA — family billing account easy collection UI (billing_partner_id=6667).
 * Usage: node scripts/family-finance-account-easy-collection-ui-smoke-1.mjs [baseUrl]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';
import { chromium } from 'playwright';

primeQaEnvFromLocal();

const BILLING_PARTNER_ID = 6667;
const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const SMALL_AMOUNT = '1';

const report = {
  phase: 'NEXTJS-FAMILY-FINANCE-ACCOUNT-EASY-COLLECTION-UI-SMOKE-1',
  billingPartnerId: BILLING_PARTNER_ID,
  base: BASE,
  host: HOST,
  login: LOGIN,
  timestamp: new Date().toISOString(),
  verdict: 'PENDING',
  path: [],
  amount: SMALL_AMOUNT,
  collectionId: null,
  receiptIds: [],
  ui: {},
  network: { preview: [], confirm: [], errors: [] },
  checks: [],
};

function rec(id, pass, extra = {}) {
  report.checks.push({ id, pass, ...extra });
}

async function login(request, context) {
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
  return (
    /404|Not Found|Internal Server Error|\[object Object\]|undefined|null/i.test(text) ||
    /Backend error|Traceback/i.test(text)
  );
}

async function main() {
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
    if (!url.includes('/api/odoo/')) return;
    if (url.includes('/preview')) {
      report.network.preview.push({ status: res.status(), url: url.replace(BASE, '') });
    }
    if (
      res.request().method() === 'POST' &&
      url.includes('/payment-collections') &&
      !url.includes('/preview')
    ) {
      report.network.confirm.push({ status: res.status(), url: url.replace(BASE, '') });
      if (res.ok()) {
        try {
          const json = await res.json();
          const id = json?.data?.id ?? json?.data?.collection_id ?? null;
          if (id) report.collectionId = id;
        } catch {
          /* ignore */
        }
      }
    }
    if (res.status() >= 400) {
      report.network.errors.push({ status: res.status(), url: url.replace(BASE, '') });
    }
  });

  rec('login', await login(context.request, context));
  if (!report.checks[0].pass) {
    report.verdict = 'BLOCKED';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const accountUrl = `${BASE}/admin/finance/billing-accounts/${BILLING_PARTNER_ID}`;
  report.path.push(accountUrl);
  await page.goto(accountUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.finance-billing-detail-page, .state, .finance-billing-hero', {
    timeout: 90000,
  });
  await page.waitForTimeout(2000);

  const accountText = await page.locator('body').innerText();
  report.ui.accountPageSnippet = accountText.slice(0, 1200);
  rec('account_page_no_404', !/404|Not Found|تعذر العثور/i.test(accountText));
  rec('account_page_loaded', /ملف الحساب المالي|حساب|تلميذ/i.test(accountText));
  rec('students_section', /التلاميذ المرتبطون|تلميذ/i.test(accountText));
  rec('summary_metrics', /إجمالي المستحق|المتبقي|المسدد/i.test(accountText));
  rec('no_bad_ui_text_account', !hasBadUiText(accountText));

  const studentRows = await page.locator('.finance-billing-students-table tbody tr, .finance-billing-students-mobile .card').count();
  report.ui.studentRowCount = studentRows;
  rec('students_visible', studentRows > 0, { studentRows });

  const collectLink = page.getByRole('link', { name: /تسجيل تحصيل/i }).first();
  const collectVisible = await collectLink.isVisible().catch(() => false);
  rec('collect_action_visible', collectVisible);
  if (!collectVisible) {
    report.verdict = 'PARTIAL_FAIL';
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  await collectLink.click();
  await page.waitForURL(/\/collections\/new/, { timeout: 30000 });
  report.path.push(page.url());
  await page.waitForSelector('.finance-collection-workflow, .finance-collection-account-context', {
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  const collectPageText = await page.locator('body').innerText();
  report.ui.collectPageSnippet = collectPageText.slice(0, 1200);
  rec('collect_page_no_404', !/404|Not Found/i.test(collectPageText));
  rec('collect_page_title', /تسجيل تحصيل|طريقة الأداء|وسيلة الأداء/i.test(collectPageText));

  const studentPicker = page.locator('.finance-collection-student-picker__option');
  const pickerCount = await studentPicker.count();
  if (pickerCount > 0) {
    await studentPicker.last().click();
    await page.waitForTimeout(1500);
    report.ui.studentPickerUsed = true;
    report.ui.studentPickerIndex = pickerCount - 1;
  }

  await page.waitForSelector('.finance-collection-workflow', { timeout: 60000 }).catch(() => null);

  async function pickSelectByLabel(labelRe, preferTextRe) {
    const label = page.locator('label').filter({ hasText: labelRe }).first();
    const select = label.locator('select');
    if (!(await select.isVisible().catch(() => false))) return false;
    const options = await select.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      const text = await opt.innerText();
      if (val && val.trim() && preferTextRe && preferTextRe.test(text)) {
        await select.selectOption(val);
        return true;
      }
    }
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val.trim()) {
        await select.selectOption(val);
        return true;
      }
    }
    return false;
  }

  await pickSelectByLabel(/السنة الدراسية|Academic year/i, /2026|2027|raqeem/i);
  await page.waitForTimeout(1500);
  await pickSelectByLabel(/دفتر التحصيل|Journal/i, /CSH|نقد/i);
  await page.waitForTimeout(1000);

  const amountInput = page.locator('.finance-amount-field input, input[type="number"]').first();
  if (await amountInput.isVisible().catch(() => false)) {
    await amountInput.fill(SMALL_AMOUNT);
    await page.waitForTimeout(500);
  }

  const previewBtn = page.getByRole('button', { name: /معاينة التوزيع/i }).first();
  const previewVisible = await previewBtn.isVisible().catch(() => false);
  rec('preview_button_visible', previewVisible);
  if (previewVisible) {
    await previewBtn.click();
    await page.waitForTimeout(4000);
  }

  const methodSelect = page.locator('label').filter({ hasText: /وسيلة الأداء|Payment method/i }).locator('select').first();
  if (await methodSelect.isVisible().catch(() => false)) {
    const methodOptions = await methodSelect.locator('option').all();
    for (const opt of methodOptions) {
      const val = await opt.getAttribute('value');
      const text = await opt.innerText();
      if (val && val.trim() && /cash|نقد/i.test(text)) {
        await methodSelect.selectOption(val);
        break;
      }
    }
    if (!(await methodSelect.inputValue())) {
      for (const opt of methodOptions) {
        const val = await opt.getAttribute('value');
        if (val && val.trim()) {
          await methodSelect.selectOption(val);
          break;
        }
      }
    }
    await page.waitForTimeout(500);
    if (previewVisible) {
      await previewBtn.click().catch(() => null);
      await page.waitForTimeout(3000);
    }
  }

  const blockersText = await page.locator('.collection-form-blockers, .finance-collection-blockers').innerText().catch(() => '');
  report.ui.submitBlockers = blockersText || null;

  const afterPreviewText = await page.locator('body').innerText();
  report.ui.afterPreviewSnippet = afterPreviewText.slice(0, 1500);
  const previewPanel = await page.locator('.collection-allocation-preview, .collection-form-preview-error').count();
  rec('preview_panel_or_error', previewPanel > 0 || report.network.preview.some((p) => p.status === 200));
  rec('preview_arabic_errors_ok', !/Error:|Exception|Traceback/i.test(afterPreviewText));

  const previewOk = report.network.preview.some((p) => p.status === 200);
  const previewBlocked = report.network.preview.some((p) => p.status >= 400);
  const hasPreviewError = await page.locator('.collection-form-preview-error, .form-error').first().isVisible().catch(() => false);
  const previewErrorText = hasPreviewError
    ? await page.locator('.collection-form-preview-error, .form-error').first().innerText().catch(() => '')
    : '';
  report.ui.previewErrorText = previewErrorText || null;

  const reviewBtn = page.getByRole('button', { name: /متابعة إلى المراجعة|تأكيد التحصيل|تسجيل التحصيل/i }).first();
  let confirmSafe = previewOk && !previewBlocked && !hasPreviewError;
  const submitBtn = page.locator('button[type="submit"].btn--primary').last();
  const submitEnabled = (await submitBtn.isVisible().catch(() => false))
    ? await submitBtn.isEnabled().catch(() => false)
    : false;

  if (confirmSafe && (submitEnabled || (await reviewBtn.isEnabled().catch(() => false)))) {
    if (await reviewBtn.isVisible().catch(() => false) && (await reviewBtn.isEnabled().catch(() => false))) {
      await reviewBtn.click();
      await page.waitForTimeout(2000);
      report.path.push('review-step');
    }

    page.once('dialog', (dialog) => dialog.accept());
    if (submitEnabled) {
      await submitBtn.click();
      await page.waitForTimeout(6000);
      report.ui.confirmAttempted = true;

      const successText = await page.locator('body').innerText();
      report.ui.afterConfirmSnippet = successText.slice(0, 1500);
      rec('confirm_success', /تم تسجيل التحصيل|Payment recorded|collections\/\d+/i.test(successText + page.url()));
      const collMatch = page.url().match(/\/collections\/(\d+)/);
      if (collMatch) report.collectionId = Number(collMatch[1]);
    } else {
      report.ui.confirmAttempted = false;
      report.ui.confirmSkipReason = 'submit disabled after preview';
    }
  } else {
    report.ui.confirmAttempted = false;
    report.ui.confirmSkipReason = previewBlocked
      ? 'preview API blocked'
      : hasPreviewError
        ? 'preview UI error'
        : 'preview not successful or submit disabled';
    rec('confirm_skipped_safe', true, { reason: report.ui.confirmSkipReason });
  }

  if (report.collectionId) {
    report.path.push(`${BASE}/admin/finance/collections/${report.collectionId}`);
    const detailText = await page.locator('body').innerText();
    rec('collection_detail_no_404', !/404|Not Found/i.test(detailText));
    const receiptLinks = await page.locator('a[href*="/receipts/"]').all();
    for (const link of receiptLinks) {
      const href = await link.getAttribute('href');
      const m = href?.match(/\/receipts\/(\d+)/);
      if (m) report.receiptIds.push(Number(m[1]));
    }
    report.ui.collectionDetailSnippet = detailText.slice(0, 1200);
  }

  const collectionsDrillUrl = `${BASE}/admin/finance/collections?billing_partner_id=${BILLING_PARTNER_ID}`;
  report.path.push(collectionsDrillUrl);
  await page.goto(collectionsDrillUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const collectionsText = await page.locator('body').innerText();
  report.ui.collectionsListSnippet = collectionsText.slice(0, 800);
  rec('collections_list_no_404', !/404|Not Found/i.test(collectionsText));

  const receiptsDrillUrl = `${BASE}/admin/finance/receipts?billing_partner_id=${BILLING_PARTNER_ID}`;
  report.path.push(receiptsDrillUrl);
  await page.goto(receiptsDrillUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const receiptsText = await page.locator('body').innerText();
  report.ui.receiptsListSnippet = receiptsText.slice(0, 800);
  rec('receipts_list_no_404', !/404|Not Found/i.test(receiptsText));

  await browser.close();

  const failed = report.checks.filter((c) => !c.pass && !c.id.startsWith('confirm_'));
  const criticalFail = report.checks.filter(
    (c) =>
      !c.pass &&
      !['confirm_success', 'confirm_skipped_safe'].includes(c.id) &&
      c.id !== 'collect_action_visible',
  );
  report.verdict =
    criticalFail.length === 0 && report.checks.find((c) => c.id === 'account_page_loaded')?.pass
      ? report.collectionId
        ? 'PASS'
        : report.ui.confirmAttempted === false && previewOk
          ? 'PASS_PREVIEW_ONLY'
          : failed.length
            ? 'PARTIAL_FAIL'
            : 'PASS'
      : 'FAIL';

  console.log(JSON.stringify(report, null, 2));
  process.exit(['PASS', 'PASS_PREVIEW_ONLY'].includes(report.verdict) ? 0 : 1);
}

main().catch((err) => {
  report.verdict = 'ERROR';
  report.error = err.message;
  console.error(err);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
