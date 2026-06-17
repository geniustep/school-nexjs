/**
 * API-only live QA for cheque settle/reject — finds QA pending cheques.
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const PASSWORD = loadAccountPassword(LOGIN);

let cookie = '';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-Host': HOST },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const body = await res.json();
  return body.success === true;
}

async function api(method, path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-Host': HOST,
      Cookie: cookie,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  if (!(await login())) {
    console.log(JSON.stringify({ status: 'BLOCKED_LIVE_QA', reason: 'login_failed' }));
    process.exit(1);
  }

  const report = { ref399: null, ref1482: null, qaPending: [], qaA: null, qaB: null };

  const ch399 = await api('GET', '/api/odoo/admin/finance/cheques/399');
  report.ref399 = {
    status: ch399.status,
    settlement_status: ch399.body?.data?.settlement_status ?? ch399.body?.settlement_status,
    allowed_actions: ch399.body?.data?.allowed_actions ?? ch399.body?.allowed_actions,
  };

  const coll1482 = await api('GET', '/api/odoo/admin/finance/payment-collections/1482');
  report.ref1482 = {
    status: coll1482.status,
    cheque_settlement: coll1482.body?.data?.cheque?.settlement_status,
    allowed_actions: coll1482.body?.data?.allowed_actions,
  };

  const list = await api('GET', '/api/odoo/admin/finance/cheques?page=1&page_size=50&state=received');
  const items = list.body?.data?.items ?? list.body?.data ?? list.body?.items ?? [];
  for (const row of Array.isArray(items) ? items : []) {
    const num = String(row.cheque_number ?? row.number ?? '');
    const settlement = row.settlement_status ?? 'pending';
    if (
      row.id !== 399 &&
      settlement === 'pending' &&
      (/QA/i.test(num) || /NEXTJS/i.test(num) || /LIFECYCLE/i.test(num))
    ) {
      report.qaPending.push({ id: row.id, number: num, amount: row.amount });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const settleCandidate = report.qaPending[0];
  const rejectCandidate = report.qaPending.find((c) => c.id !== settleCandidate?.id) ?? report.qaPending[1];

  if (settleCandidate) {
    const post = await api('POST', `/api/odoo/admin/finance/cheques/${settleCandidate.id}/settle`, {
      settlement_date: today,
      bank_reference: `QA-SETTLE-${settleCandidate.id}`,
      note: 'QA-A settle',
    });
    const cheque = post.body?.data?.cheque ?? post.body?.data;
    report.qaA = {
      id: settleCandidate.id,
      status: post.status,
      settlement_status: cheque?.settlement_status,
      allowed_actions: cheque?.allowed_actions,
      path: `/settle`,
    };
  }

  if (rejectCandidate) {
    const post = await api('POST', `/api/odoo/admin/finance/cheques/${rejectCandidate.id}/reject`, {
      rejection_date: today,
      reason_code: 'insufficient_funds',
      reason: null,
      bank_reference: null,
      note: 'QA-B reject',
    });
    const cheque = post.body?.data?.cheque ?? post.body?.data;
    report.qaB = {
      id: rejectCandidate.id,
      status: post.status,
      settlement_status: cheque?.settlement_status,
      allowed_actions: cheque?.allowed_actions,
      path: `/reject`,
    };
  }

  const refOk =
    report.ref399?.settlement_status === 'pending' &&
    report.ref399?.allowed_actions?.settle === true &&
    report.ref399?.allowed_actions?.reject === true;
  const qaOk =
    (!settleCandidate || report.qaA?.settlement_status === 'settled') &&
    (!rejectCandidate || report.qaB?.settlement_status === 'rejected');

  console.log(
    JSON.stringify(
      {
        status: refOk && qaOk ? 'API_LIVE_QA_PASSED' : 'BLOCKED_LIVE_QA',
        report,
      },
      null,
      2,
    ),
  );
  process.exit(refOk && qaOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
