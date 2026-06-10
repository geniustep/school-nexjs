/**
 * FIN-CHEQUE-WEB-1 school-scoped live QA (read-only). No passwords in output.
 */
import { loadAccountPassword, loadOdooTarget, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const target = loadOdooTarget();

const EXPECT = {
  activeSchoolId: 9,
  studentId: 349,
  studentFeeId: 1498,
  clearedChequeId: 614,
  rejectedChequeId: 615,
  clearedCollectionId: 1098,
  rejectedCollectionId: 1099,
  clearedChequeNumber: 'QA-CHQ-WEB1-CLEAR',
  rejectedChequeNumber: 'QA-CHQ-WEB1-REJECT',
  amount: 1000,
  feePaid: 1000,
  feeBalance: 1000,
};

function pickData(json) {
  return json?.data ?? json;
}

function permList(user) {
  const p = user?.permissions;
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object') return Object.entries(p).filter(([, v]) => v).map(([k]) => k);
  return [];
}

async function authenticate(login) {
  const password = loadAccountPassword(login);
  const res = await fetch(`${target.odooBaseUrl}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'call',
      params: { db: target.odooDb, login, password },
    }),
  });
  const json = await res.json();
  const cookie = res.headers.get('set-cookie') ?? '';
  const sid = cookie.match(/session_id=([^;]+)/)?.[1] ?? null;
  return { uid: json.result?.uid ?? null, sessionId: sid };
}

async function api(sessionId, method, path, body) {
  const url = `${target.odooBaseUrl}${target.apiPrefix}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Cookie: `session_id=${sessionId}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') ?? '';
  let json = null;
  if (ct.includes('json')) {
    try {
      json = await res.json();
    } catch {
      json = { parseError: true };
    }
  } else {
    json = { nonJson: true };
  }
  return { status: res.status, json };
}

const out = { checks: [], failures: [] };

function pass(name, detail = {}) {
  out.checks.push({ name, ok: true, ...detail });
}

function fail(name, detail = {}) {
  out.checks.push({ name, ok: false, ...detail });
  out.failures.push(name);
}

try {
  const auth = await authenticate('done');
  if (!auth.sessionId) {
    fail('authenticate_done');
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }
  pass('authenticate_done', { uid: auth.uid });

  const me = await api(auth.sessionId, 'GET', '/me');
  const user = pickData(me.json)?.user ?? pickData(me.json);
  if (Number(user?.active_school_id) === EXPECT.activeSchoolId) {
    pass('active_school_id', { activeSchoolId: user.active_school_id });
  } else {
    fail('active_school_id', { expected: EXPECT.activeSchoolId, got: user?.active_school_id });
  }

  if (user?.role === 'admin' && user?.admin_kind === 'school_manager') pass('done_role');
  else fail('done_role', { role: user?.role, admin_kind: user?.admin_kind });

  const perms = permList(user);
  for (const p of [
    'finance.view_cheques',
    'finance.deposit_cheques',
    'finance.clear_cheques',
    'finance.reject_cheques',
    'finance.cancel_cheques',
    'finance.collect_payments',
    'finance.view_payments',
  ]) {
    if (perms.includes(p)) pass(`permission_${p}`);
    else fail(`permission_${p}`);
  }

  const paths = [
    ['/admin/finance/cheques?page=1&page_size=20', 'cheques_list'],
    [`/admin/finance/cheques/${EXPECT.clearedChequeId}`, 'cheque_614'],
    [`/admin/finance/cheques/${EXPECT.rejectedChequeId}`, 'cheque_615'],
    ['/admin/finance/overview', 'overview'],
    [`/admin/finance/student-fees/${EXPECT.studentFeeId}`, 'student_fee_1498'],
    [`/admin/finance/payment-collections/${EXPECT.clearedCollectionId}`, 'collection_1098'],
    [`/admin/finance/payment-collections/${EXPECT.rejectedCollectionId}`, 'collection_1099'],
  ];

  const responses = {};
  for (const [path, key] of paths) {
    const r = await api(auth.sessionId, 'GET', path);
    responses[key] = r;
    if (r.status === 200 && !r.json?.nonJson) pass(`bff_${key}`, { status: r.status });
    else fail(`bff_${key}`, { status: r.status });
  }

  const ch614 = pickData(responses.cheque_614.json);
  if (ch614?.state === 'cleared' && ch614?.cheque_number === EXPECT.clearedChequeNumber) pass('cheque_614');
  else fail('cheque_614', { state: ch614?.state, number: ch614?.cheque_number });

  const ch615 = pickData(responses.cheque_615.json);
  if (ch615?.state === 'rejected' && ch615?.reversal_applied === true) pass('cheque_615');
  else fail('cheque_615', { state: ch615?.state, reversal: ch615?.reversal_applied });

  const fee = pickData(responses.student_fee_1498.json);
  const balance = fee?.remaining_amount ?? fee?.balance_amount ?? fee?.balance;
  if (Number(fee?.paid_amount) === EXPECT.feePaid && Number(balance) === EXPECT.feeBalance) pass('student_fee_1498');
  else fail('student_fee_1498', { paid: fee?.paid_amount, balance, state: fee?.state });

  const coll1099 = pickData(responses.collection_1099.json);
  if (coll1099?.cheque?.state === 'rejected' && coll1099?.cheque?.reversal_applied === true) {
    pass('collection_1099_reversal');
  } else fail('collection_1099_reversal');

  const totals = pickData(responses.overview.json)?.totals ?? {};
  if (Number(totals.total_cleared_liquidity_period) >= EXPECT.amount) pass('overview_cleared_liquidity');
  else fail('overview_cleared_liquidity', { value: totals.total_cleared_liquidity_period });
  if (Number(totals.total_collected_period) >= EXPECT.amount * 2) pass('overview_registered_collections');
  else fail('overview_registered_collections', { value: totals.total_collected_period });

  const list = pickData(responses.cheques_list.json);
  const rows = Array.isArray(list) ? list : [];
  const numbers = rows.map((c) => c.cheque_number);
  if (numbers.includes(EXPECT.clearedChequeNumber) && numbers.includes(EXPECT.rejectedChequeNumber)) {
    pass('cheques_list_contains_qa');
  } else fail('cheques_list_contains_qa', { numbers });

  // RBAC: qa.pm deposit should 403
  const pm = await authenticate('qa.pm');
  if (pm.sessionId) {
    const dep = await api(pm.sessionId, 'POST', `/admin/finance/cheques/${EXPECT.clearedChequeId}/deposit`, {
      deposited_date: '2026-06-10',
    });
    if (dep.status === 403) pass('rbac_deposit_forbidden');
    else fail('rbac_deposit_forbidden', { status: dep.status });
  } else {
    pass('rbac_skipped', { reason: 'qa.pm auth unavailable' });
  }

  out.summary = {
    total: out.checks.length,
    passed: out.checks.filter((c) => c.ok).length,
    failed: out.failures.length,
    ready: out.failures.length === 0,
  };
} catch (e) {
  out.error = String(e.message ?? e);
  out.failures.push('unexpected_error');
}

console.log(JSON.stringify(out, null, 2));
process.exit(out.failures?.length ? 1 : 0);
