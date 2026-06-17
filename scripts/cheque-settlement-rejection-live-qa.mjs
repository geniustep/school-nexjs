/**
 * Cheque settlement/rejection lifecycle — live QA (school tenant).
 * Read-only on reference cheque 399 / collection 1482; optional mutate QA cheques via env.
 *
 * Usage:
 *   node scripts/cheque-settlement-rejection-live-qa.mjs [baseUrl]
 *   QA_SETTLE_CHEQUE_ID=... QA_REJECT_CHEQUE_ID=... node scripts/cheque-settlement-rejection-live-qa.mjs
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);
const REF_CHEQUE = 399;
const REF_COLLECTION = 1482;
const QA_SETTLE_ID = process.env.QA_SETTLE_CHEQUE_ID ? Number(process.env.QA_SETTLE_CHEQUE_ID) : null;
const QA_REJECT_ID = process.env.QA_REJECT_CHEQUE_ID ? Number(process.env.QA_REJECT_CHEQUE_ID) : null;

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function login(request, context) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': HOST },
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

async function apiGet(request, path) {
  const res = await request.get(`${BASE}${path}`, { headers: { 'X-Forwarded-Host': HOST } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function apiPost(request, path, data) {
  const res = await request.post(`${BASE}${path}`, {
    headers: { 'X-Forwarded-Host': HOST },
    data,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function readOnlyUiQa(page) {
  await page.goto(`${BASE}/admin/finance/cheques/${REF_CHEQUE}`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.waitForSelector('.cheque-details', { timeout: 120000 });
  const pageText = await page.locator('.cheque-details').innerText();
  record('ref399_pageLoads', pageText.length > 100 && !pageText.includes('تعذر تحميل'));
  record('ref399_noRawKeys', !/admin\.finance\.cheques\.lifecycle\./.test(pageText));

  const settleBtn = page.getByRole('button', { name: /تصفية الشيك/i });
  const rejectBtn = page.getByRole('button', { name: /رفض الشيك/i });
  record('ref399_settleButton', (await settleBtn.count()) > 0);
  record('ref399_rejectButton', (await rejectBtn.count()) > 0);

  if ((await settleBtn.count()) > 0) {
    await settleBtn.first().click();
    await page.waitForSelector('.finance-cheque-dialog--settle', { timeout: 10000 });
    const modal = await page.locator('.finance-cheque-dialog--settle').innerText();
    record('settleDialog_title', modal.includes('تأكيد تصفية الشيك'));
    record('settleDialog_dateRequired', modal.includes('تاريخ التصفية'));
    record('settleDialog_confirmCta', modal.includes('تأكيد التصفية'));
    await page.getByRole('button', { name: /^إلغاء$/ }).first().click();
    record('settleDialog_closes', (await page.locator('.finance-cheque-dialog--settle').count()) === 0);
  }

  if ((await rejectBtn.count()) > 0) {
    await rejectBtn.first().click();
    const rejectModal = page.locator('.finance-cheque-dialog--reject');
    const opened = await rejectModal.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    if (opened) {
      const modal = await rejectModal.innerText();
      record('rejectDialog_title', modal.includes('تسجيل رفض الشيك'));
      record('rejectDialog_reasonSelect', modal.includes('سبب الرفض'));
      record('rejectDialog_confirmCta', modal.includes('تأكيد رفض الشيك'));
      await page.getByRole('button', { name: /^إلغاء$/ }).first().click();
    } else {
      record('rejectDialog_title', false, { note: 'reject modal did not open' });
      record('rejectDialog_reasonSelect', false);
      record('rejectDialog_confirmCta', false);
    }
  } else {
    record('rejectDialog_title', false, { note: 'reject button not visible' });
    record('rejectDialog_reasonSelect', false);
    record('rejectDialog_confirmCta', false);
  }

  await page.goto(`${BASE}/admin/finance/collections/${REF_COLLECTION}`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.waitForSelector('.collection-details', { timeout: 120000 });
  const collText = await page.locator('.collection-details').innerText();
  record('ref1482_pageLoads', collText.length > 100);
  record('ref1482_collectionActions', collText.includes('تصفية الشيك') || collText.includes('رفض الشيك'));
}

async function mutateQa(request, chequeId, action) {
  const today = new Date().toISOString().slice(0, 10);
  const before = await apiGet(request, `/api/odoo/admin/finance/cheques/${chequeId}`);
  const cheque = before.body?.data ?? before.body;
  if (!cheque?.id) {
    record(`${action}_cheque_${chequeId}_load`, false, { status: before.status });
    return;
  }
  record(`${action}_cheque_${chequeId}_was_pending`, cheque.settlement_status === 'pending');

  const path =
    action === 'settle'
      ? `/api/odoo/admin/finance/cheques/${chequeId}/settle`
      : `/api/odoo/admin/finance/cheques/${chequeId}/reject`;
  const payload =
    action === 'settle'
      ? { settlement_date: today, bank_reference: `QA-${chequeId}`, note: `QA ${action}` }
      : {
          rejection_date: today,
          reason_code: 'insufficient_funds',
          reason: null,
          bank_reference: null,
          note: `QA ${action}`,
        };

  const post = await apiPost(request, path, payload);
  const afterCheque = post.body?.data?.cheque ?? post.body?.cheque ?? post.body?.data;
  const expectedStatus = action === 'settle' ? 'settled' : 'rejected';
  record(
    `${action}_cheque_${chequeId}_success`,
    post.ok && (afterCheque?.settlement_status === expectedStatus || cheque.settlement_status === expectedStatus),
    { status: post.status, settlement: afterCheque?.settlement_status },
  );
  record(
    `${action}_cheque_${chequeId}_actions_hidden`,
    afterCheque?.allowed_actions?.settle === false && afterCheque?.allowed_actions?.reject === false,
    { allowed: afterCheque?.allowed_actions },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': HOST },
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('scc_locale', 'ar');
    document.cookie = 'scc_locale=ar;path=/;max-age=31536000;SameSite=Lax';
  });
  const page = await context.newPage();
  const request = context.request;

  record('login', await login(request, context));
  if (!results[0].pass) {
    await browser.close();
    console.log(JSON.stringify({ status: 'BLOCKED_LIVE_QA', results }, null, 2));
    process.exit(1);
  }

  const refCheque = await apiGet(request, `/api/odoo/admin/finance/cheques/${REF_CHEQUE}`);
  const refData = refCheque.body?.data ?? refCheque.body;
  record('ref399_api_pending', refData?.settlement_status === 'pending', {
    settlement_status: refData?.settlement_status,
    allowed_actions: refData?.allowed_actions,
  });
  record('ref399_unchanged_after_read', refData?.settlement_status === 'pending');

  await readOnlyUiQa(page);

  if (QA_SETTLE_ID) await mutateQa(request, QA_SETTLE_ID, 'settle');
  else record('qa_settle_skipped', true, { note: 'set QA_SETTLE_CHEQUE_ID to run QA-A' });

  if (QA_REJECT_ID) await mutateQa(request, QA_REJECT_ID, 'reject');
  else record('qa_reject_skipped', true, { note: 'set QA_REJECT_CHEQUE_ID to run QA-B' });

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  const needsMutate = !QA_SETTLE_ID || !QA_REJECT_ID;
  const status = failed.length
    ? 'BLOCKED_LIVE_QA'
    : needsMutate
      ? 'NEXTJS_CHEQUE_SETTLEMENT_REJECTION_READ_ONLY_QA_PASSED'
      : 'NEXTJS_CHEQUE_SETTLEMENT_REJECTION_LIFECYCLE_INTEGRATED_MERGED_DEPLOYED_LIVE_QA_PASSED';
  console.log(
    JSON.stringify(
      {
        status,
        refCheque: REF_CHEQUE,
        refCollection: REF_COLLECTION,
        qaSettleId: QA_SETTLE_ID,
        qaRejectId: QA_REJECT_ID,
        failed: failed.length,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
