/**
 * FIN-CASH-DESK-1 contract probe (read-only). No passwords in output.
 */
import { loadAccountPassword, loadOdooTarget, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const target = loadOdooTarget();

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

async function apiGet(sessionId, path, query = {}) {
  const sp = new URLSearchParams(query);
  const url = `${target.odooBaseUrl}${target.apiPrefix}${path}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, {
    headers: { Cookie: `session_id=${sessionId}`, Accept: 'application/json' },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = { parseError: true, status: res.status };
  }
  return { status: res.status, body };
}

function sampleKeys(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return typeof obj;
  if (Array.isArray(obj)) {
    return obj.length ? [sampleKeys(obj[0], depth + 1)] : [];
  }
  const out = {};
  for (const k of Object.keys(obj).slice(0, 40)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = sampleKeys(v, depth + 1);
    else if (Array.isArray(v)) out[k] = v.length ? [sampleKeys(v[0], depth + 1)] : [];
    else out[k] = typeof v;
  }
  return out;
}

const CASH_PATHS = [
  '/admin/finance/cash-sessions',
  '/admin/finance/cash-sessions/current',
  '/admin/finance/cash-sessions/legacy-dry-run',
  '/admin/finance/payment-journals',
  '/admin/finance/reference-data',
];

const out = { target: { base: target.odooBaseUrl, db: target.odooDb }, endpoints: {} };

try {
  const admin = await authenticate('done');
  if (!admin.sessionId) {
    out.error = 'no_session';
  } else {
    out.uid = admin.uid;
    for (const path of CASH_PATHS) {
      const { status, body } = await apiGet(admin.sessionId, path, { page: '1', page_size: '5' });
      const data = body?.data ?? body?.result ?? body;
      out.endpoints[path] = {
        status,
        success: body?.success,
        error: body?.error,
        shape: sampleKeys(data),
        rawTopKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : null,
      };
    }
  }
} catch (e) {
  out.error = e.message;
}

console.log(JSON.stringify(out, null, 2));
