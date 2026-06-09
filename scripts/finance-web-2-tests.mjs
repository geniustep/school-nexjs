/**
 * FIN-WEB-2 static tests — run: node scripts/finance-web-2-tests.mjs
 */
import assert from 'node:assert/strict';

function formatMoney(amount, currency) {
  if (amount == null || Number.isNaN(amount)) return '—';
  const cur = currency?.trim();
  if (!cur) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

function isPositiveAmount(v) {
  return v != null && !Number.isNaN(v) && v > 0;
}

function installmentIsOverdue(row) {
  if (row.is_overdue === true || row.overdue === true) return true;
  return (row.state ?? row.status ?? '').toLowerCase() === 'overdue';
}

function normalizeMoneyValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseFinanceList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['items', 'results', 'children', 'students', 'data']) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function journalErrorMessageKey(code) {
  switch (code) {
    case 'invalid_journal':
      return 'admin.finance.errors.invalidJournal';
    default:
      return null;
  }
}

assert.equal(formatMoney(null), '—');
assert.ok(formatMoney(100, 'MAD').includes('100'));
assert.equal(isPositiveAmount(0), false);
assert.equal(isPositiveAmount(0.01), true);
assert.equal(installmentIsOverdue({ state: 'overdue' }), true);
assert.equal(normalizeMoneyValue('12.5'), 12.5);
assert.deepEqual(parseFinanceList({ items: [{ id: 1 }] }), [{ id: 1 }]);
assert.equal(journalErrorMessageKey('invalid_journal'), 'admin.finance.errors.invalidJournal');

console.log('finance-web-2-tests: PASS');
