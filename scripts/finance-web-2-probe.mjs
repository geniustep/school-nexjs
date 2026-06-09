/**
 * FIN-WEB-2 finance API shape probe (read-only). No passwords in output.
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
  if (!obj || typeof obj !== 'object' || depth > 2) return obj;
  if (Array.isArray(obj)) {
    return obj.length ? [sampleKeys(obj[0], depth + 1)] : [];
  }
  const out = {};
  for (const k of Object.keys(obj).slice(0, 30)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = sampleKeys(v, depth + 1);
    else if (Array.isArray(v)) out[k] = v.length ? [sampleKeys(v[0], depth + 1)] : [];
    else out[k] = typeof v;
  }
  return out;
}

const ADMIN_PATHS = [
  '/admin/finance/overview',
  '/admin/finance/payment-journals',
  '/admin/finance/academic-years',
  '/admin/finance/reference-data',
  '/admin/finance/students/search?page=1&page_size=5',
  '/admin/finance/student-fees/1',
];

const PARENT_PATHS = ['/parent/finance'];

const ELIGIBLE_PATHS = [
  '/admin/finance/students/1/eligible-billing-partners',
  '/admin/finance/eligible-billing-partners?student_id=1',
  '/admin/finance/payment-collections/eligible-billing-partners?student_id=1',
];

const out = { target: { base: target.odooBaseUrl, db: target.odooDb }, admin: {}, parent: {}, eligible: {} };

try {
  const admin = await authenticate('qa.schoolmgr');
  if (!admin.sessionId) {
    out.admin.error = 'no_session';
  } else {
    for (const p of ADMIN_PATHS) {
      const [path, qs] = p.split('?');
      const query = {};
      if (qs) for (const part of qs.split('&')) {
        const [k, v] = part.split('=');
        query[k] = v;
      }
      const r = await apiGet(admin.sessionId, path, query);
      out.admin[p] = {
        status: r.status,
        success: r.body?.success,
        error: r.body?.error?.code,
        shape: sampleKeys(r.body?.data ?? r.body),
      };
    }
    for (const p of ELIGIBLE_PATHS) {
      const [path, qs] = p.split('?');
      const query = {};
      if (qs) for (const part of qs.split('&')) {
        const [k, v] = part.split('=');
        query[k] = v;
      }
      const r = await apiGet(admin.sessionId, path, query);
      out.eligible[p] = { status: r.status, success: r.body?.success, error: r.body?.error?.code, shape: sampleKeys(r.body?.data ?? r.body) };
    }
  }
} catch (e) {
  out.admin.error = String(e.message ?? e);
}

try {
  const parent = await authenticate('qa.parent');
  if (parent.sessionId) {
    for (const p of PARENT_PATHS) {
      const r = await apiGet(parent.sessionId, p);
      out.parent[p] = { status: r.status, success: r.body?.success, error: r.body?.error?.code, shape: sampleKeys(r.body?.data ?? r.body) };
    }
    const children = await apiGet(parent.sessionId, '/parent/children');
    const childId = children.body?.data?.[0]?.id ?? children.body?.data?.children?.[0]?.id;
    if (childId) {
      for (const suffix of ['', '/finance', '/finance/collections']) {
        const path = `/parent/children/${childId}${suffix}`;
        const r = await apiGet(parent.sessionId, path);
        out.parent[path] = { status: r.status, success: r.body?.success, error: r.body?.error?.code, shape: sampleKeys(r.body?.data ?? r.body) };
      }
    }
  }
} catch (e) {
  out.parent.error = String(e.message ?? e);
}

console.log(JSON.stringify(out, null, 2));
