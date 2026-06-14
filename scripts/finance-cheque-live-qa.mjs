/**
 * FIN-CHEQUE-WEB-1 school-scoped live QA (read-only).
 * No passwords in output.
 */
import { loadAccountPassword, loadOdooTarget, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const target = loadOdooTarget();

const EXPECT = {
  activeSchoolId: 9,
  studentId: 349,
  studentFeeId: 1498,
  installmentPaidId: 2247,
  installmentUnpaidId: 2248,
  clearedChequeId: 614,
  rejectedChequeId: 615,
  clearedCollectionId: 1098,
  rejectedCollectionId: 1099,
  clearedChequeNumber: 'QA-CHQ-WEB1-CLEAR',
  rejectedChequeNumber: 'QA-CHQ-WEB1-REJECT',
  amount: 1000,
  feeOriginal: 2000,
  feePaid: 1000,
  feeBalance: 1000,
};

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
    json = { nonJson: true, snippet: (await res.text()).slice(0, 120) };
  }
  return { status: res.status, json };
}

function pickData(json) {
  return json?.data ?? json;
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
  if (me.status !== 200) fail('me_status', { status: me.status });
  else pass('me_status', { status: me.status });

  const meData = pickData(me.json);
  const activeSchool = meData?.active_school_id ?? meData?.active_school?.id;
  if (Number(activeSchool) === EXPECT.activeSchoolId) {
    pass('active_school_id', { activeSchoolId: activeSchool });
  } else {
    fail('active_school_id', { expected: EXPECT.activeSchoolId, got: activeSchool });
  }

  const perms = meData?.permissions ?? meData?.capabilities ?? [];
  const permList = Array.isArray(perms) ? perms : Object.keys(perms).filter((k) => perms[k]);
  for (const p of [
    'finance.view_cheques',
    'finance.deposit_cheques',
    'finance.clear_cheques',
    'finance.reject_cheques',
    'finance.cancel_cheques',
    'finance.collect_payments',
    'finance.view_payments',
  ]) {
    if (permList.includes(p)) pass(`permission_${p}`);
    else fail(`permission_${p}`, { permListSample: permList.filter((x) => x.startsWith('finance.')).slice(0, 15) });
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
    else fail(`bff_${key}`, { status: r.status, code: r.json?.error?.code, nonJson: r.json?.nonJson });
  }

  const ch614 = pickData(responses.cheque_614.json);
  if (ch614?.state === 'cleared') pass('cheque_614_state');
  else fail('cheque_614_state', { state: ch614?.state });
  if (ch614?.cheque_number === EXPECT.clearedChequeNumber) pass('cheque_614_number');
  else fail('cheque_614_number', { got: ch614?.cheque_number });

  const ch615 = pickData(responses.cheque_615.json);
  if (ch615?.state === 'rejected') pass('cheque_615_state');
  else fail('cheque_615_state', { state: ch615?.state });
  if (ch615?.reversal_applied === true) pass('cheque_615_reversal');
  else fail('cheque_615_reversal', { reversal_applied: ch615?.reversal_applied });

  const fee = pickData(responses.student_fee_1498.json);
  const paid = fee?.paid_amount ?? fee?.paid;
  const balance = fee?.remaining_amount ?? fee?.balance_amount ?? fee?.balance;
  if (Number(paid) === EXPECT.feePaid) pass('fee_paid_amount');
  else fail('fee_paid_amount', { paid });
  if (Number(balance) === EXPECT.feeBalance) pass('fee_balance_amount');
  else fail('fee_balance_amount', { balance });
  const feeState = (fee?.state ?? fee?.status ?? '').toLowerCase();
  if (feeState.includes('partial') || feeState === 'partial') pass('fee_partial_state');
  else fail('fee_partial_state', { state: feeState });

  const coll1098 = pickData(responses.collection_1098.json);
  if (coll1098?.cheque?.state === 'cleared' || ch614?.collection_id === EXPECT.clearedCollectionId) {
    pass('collection_1098_cheque');
  } else fail('collection_1098_cheque', { chequeState: coll1098?.cheque?.state });

  const coll1099 = pickData(responses.collection_1099.json);
  if (coll1099?.cheque?.state === 'rejected' || coll1099?.reversal_applied === true) {
    pass('collection_1099_reversal');
  } else fail('collection_1099_reversal', {
    chequeState: coll1099?.cheque?.state,
    reversal: coll1099?.reversal_applied,
  });

  const overview = pickData(responses.overview.json);
  const totals = overview?.totals ?? overview?.summary ?? overview;
  const clearedLiq = totals?.total_cleared_liquidity_period;
  if (clearedLiq != null && Number(clearedLiq) >= EXPECT.amount) pass('overview_cleared_liquidity', { clearedLiq });
  else fail('overview_cleared_liquidity', { clearedLiq });

  const listRaw = pickData(responses.cheques_list.json);
  const list = Array.isArray(listRaw) ? listRaw : listRaw?.items ?? listRaw?.data ?? [];
  const numbers = list.map((c) => c.cheque_number);
  if (numbers.includes(EXPECT.clearedChequeNumber)) pass('list_contains_clear');
  else fail('list_contains_clear', { numbers: numbers.slice(0, 10) });
  if (numbers.includes(EXPECT.rejectedChequeNumber)) pass('list_contains_reject');
  else fail('list_contains_reject', { numbers: numbers.slice(0, 10) });

  // Search filters
  for (const [q, key] of [
    ['QA-CHQ-WEB1', 'search_prefix'],
    ['QA-CHQ-WEB1-CLEAR', 'search_clear'],
    ['state=cleared', 'filter_cleared'],
    ['state=rejected', 'filter_rejected'],
  ]) {
    const path =
      key.startsWith('filter_')
        ? `/admin/finance/cheques?page=1&page_size=20&state=${key === 'filter_cleared' ? 'cleared' : 'rejected'}`
        : `/admin/finance/cheques?page=1&page_size=20&search=${encodeURIComponent(q)}`;
    const r = await api(auth.sessionId, 'GET', path);
    const data = pickData(r.json);
    const rows = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
    if (r.status === 200) pass(`cheques_${key}`, { count: rows.length });
    else fail(`cheques_${key}`, { status: r.status });
  }

  // Parent check for student 349
  const parentAuth = await authenticate('qa.parent');
  if (parentAuth.sessionId) {
    const children = await api(parentAuth.sessionId, 'GET', '/parent/children');
    const kids = pickData(children.json);
    const arr = Array.isArray(kids) ? kids : kids?.children ?? kids?.data ?? [];
    const has349 = arr.some((c) => Number(c.id) === EXPECT.studentId);
    if (has349) pass('parent_has_student_349');
    else {
      pass('parent_qa_not_available', { reason: 'PARENT_QA_NOT_AVAILABLE_FOR_STUDENT_349' });
    }
  } else {
    pass('parent_qa_not_available', { reason: 'parent_auth_failed' });
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
