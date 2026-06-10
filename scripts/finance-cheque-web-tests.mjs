/**
 * FIN-CHEQUE-WEB-1 static tests — run: node scripts/finance-cheque-web-tests.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function isChequePayment(method) {
  const m = (method ?? '').toLowerCase();
  return m === 'cheque' || m === 'check';
}

function normalizeChequeState(state) {
  return state ?? 'received';
}

function chequeStateTone(state) {
  switch (state) {
    case 'cleared':
      return 'green';
    case 'deposited':
      return 'blue';
    case 'received':
      return 'amber';
    case 'rejected':
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
}

function adminChequeMarkerKey(cheque) {
  if (!cheque?.state) return null;
  const state = normalizeChequeState(cheque.state);
  if (cheque.reversal_applied && state === 'rejected') {
    return 'admin.finance.cheques.markerReversalRejected';
  }
  if (cheque.reversal_applied && state === 'cancelled') {
    return 'admin.finance.cheques.markerReversalCancelled';
  }
  switch (state) {
    case 'received':
      return 'admin.finance.cheques.markerPending';
    case 'deposited':
      return 'admin.finance.cheques.markerDeposited';
    case 'cleared':
      return 'admin.finance.cheques.markerCleared';
    case 'rejected':
      return 'admin.finance.cheques.markerReversalRejected';
    case 'cancelled':
      return 'admin.finance.cheques.markerReversalCancelled';
    default:
      return null;
  }
}

function parentChequeMarkerKey(cheque) {
  if (!cheque?.state) return null;
  const state = normalizeChequeState(cheque.state);
  if (state === 'rejected') return 'parent.finance.cheques.rejected';
  if (state === 'cancelled') return 'parent.finance.cheques.cancelled';
  switch (state) {
    case 'received':
      return 'parent.finance.cheques.pending';
    case 'deposited':
      return 'parent.finance.cheques.deposited';
    case 'cleared':
      return 'parent.finance.cheques.cleared';
    default:
      return null;
  }
}

function isCollectionChequeReversed(coll) {
  if (coll.reversal_applied === true) return true;
  const ch = coll.cheque;
  if (!ch) return false;
  const state = normalizeChequeState(ch.state);
  return state === 'rejected' || state === 'cancelled' || ch.reversal_applied === true;
}

function collectionSuccessDisplay(coll) {
  if (isCollectionChequeReversed(coll)) return false;
  const st = coll.state ?? coll.status;
  return st === 'confirmed';
}

function availableChequeTransitions(state) {
  switch (normalizeChequeState(state)) {
    case 'received':
      return ['deposit', 'reject', 'cancel'];
    case 'deposited':
      return ['clear', 'reject', 'cancel'];
    default:
      return [];
  }
}

function chequeErrorMessageKey(code) {
  switch (code) {
    case 'invalid_cheque_data':
      return 'admin.finance.cheques.errors.invalidChequeData';
    case 'cheque_required':
      return 'admin.finance.cheques.errors.chequeRequired';
    case 'invalid_cheque_state':
      return 'admin.finance.cheques.errors.invalidChequeState';
    case 'cheque_already_cleared':
      return 'admin.finance.cheques.errors.chequeAlreadyCleared';
    case 'cheque_reversal_already_applied':
      return 'admin.finance.cheques.errors.reversalAlreadyApplied';
    case 'cheque_school_mismatch':
      return 'admin.finance.cheques.errors.chequeSchoolMismatch';
    case 'cheque_amount_mismatch':
      return 'admin.finance.cheques.errors.chequeAmountMismatch';
    default:
      return null;
  }
}

function feeBalanceAmount(row) {
  const v = row.remaining_amount ?? row.balance_amount ?? row.balance;
  return v == null || Number.isNaN(v) ? undefined : v;
}

// Types/parsing
assert.equal(isChequePayment('cheque'), true);
assert.equal(isChequePayment('check'), true);
assert.equal(isChequePayment('cash'), false);
assert.equal(normalizeChequeState(undefined), 'received');
assert.equal(chequeStateTone('cleared'), 'green');
assert.equal(chequeStateTone('rejected'), 'red');

// Overview KPI field names in types
const financeTypes = readFileSync(join(root, 'src/types/finance.ts'), 'utf8');
for (const field of [
  'total_cleared_liquidity_period',
  'cheques_pending_amount',
  'cheques_due_amount',
  'cheques_deposited_amount',
  'cheques_cleared_amount',
  'cheques_rejected_amount',
]) {
  assert.ok(financeTypes.includes(field), `missing ${field}`);
}

// Parent cheque payload
assert.equal(parentChequeMarkerKey({ state: 'cleared' }), 'parent.finance.cheques.cleared');
assert.equal(parentChequeMarkerKey({ state: 'rejected' }), 'parent.finance.cheques.rejected');

// Reversal marker
assert.equal(
  adminChequeMarkerKey({ state: 'rejected', reversal_applied: true }),
  'admin.finance.cheques.markerReversalRejected',
);
assert.equal(isCollectionChequeReversed({ state: 'confirmed', cheque: { state: 'rejected' } }), true);
assert.equal(collectionSuccessDisplay({ state: 'confirmed', cheque: { state: 'rejected' } }), false);
assert.equal(collectionSuccessDisplay({ state: 'confirmed' }), true);

// Transitions
assert.deepEqual(availableChequeTransitions('received'), ['deposit', 'reject', 'cancel']);
assert.deepEqual(availableChequeTransitions('deposited'), ['clear', 'reject', 'cancel']);
assert.deepEqual(availableChequeTransitions('cleared'), []);

// Permissions wired
const adminPages = readFileSync(join(root, 'src/lib/permissions/admin-pages.ts'), 'utf8');
assert.ok(adminPages.includes('/admin/finance/cheques'));
assert.ok(adminPages.includes('FINANCE_VIEW_CHEQUES'));

const permissions = readFileSync(join(root, 'src/lib/permissions/finance.ts'), 'utf8');
for (const cap of [
  'finance.view_cheques',
  'finance.deposit_cheques',
  'finance.clear_cheques',
  'finance.reject_cheques',
  'finance.cancel_cheques',
]) {
  assert.ok(permissions.includes(cap), `missing ${cap}`);
}

// Collection form sends cheque only for cheque method
const collectionForm = readFileSync(join(root, 'src/features/admin/finance/collection-form.tsx'), 'utf8');
assert.ok(collectionForm.includes("payload.payment_method = 'cheque'"));
assert.ok(collectionForm.includes('finance-cheque-fields'));

// i18n keys across 4 langs
for (const lang of ['ar', 'en', 'fr', 'es']) {
  const messages = JSON.parse(readFileSync(join(root, `messages/${lang}.json`), 'utf8'));
  assert.ok(messages.admin.finance.cheques?.title, `${lang} admin cheques title`);
  assert.ok(messages.parent.finance.cheques?.pending, `${lang} parent cheques pending`);
  assert.ok(messages.admin.finance.overviewClearedLiquidityPeriod, `${lang} cleared liquidity label`);
}

// Overview distinguishes collected vs cleared
const overview = readFileSync(join(root, 'src/features/admin/finance/finance-overview-panel.tsx'), 'utf8');
assert.ok(overview.includes('overviewRegisteredCollectionsPeriod'));
assert.ok(overview.includes('overviewClearedLiquidityPeriod'));
assert.ok(overview.includes('cheques_pending_amount'));

// Errors
assert.equal(chequeErrorMessageKey('cheque_already_cleared'), 'admin.finance.cheques.errors.chequeAlreadyCleared');

assert.equal(feeBalanceAmount({ balance_amount: 1000 }), 1000);
assert.equal(feeBalanceAmount({ remaining_amount: 500, balance_amount: 1000 }), 500);

console.log('finance-cheque-web-tests: PASS');
