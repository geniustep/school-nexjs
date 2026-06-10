/**
 * FIN-WEB-2 auth diagnosis — read-only, no secrets in output.
 * Usage: node scripts/finance-auth-diagnosis.mjs [nextBaseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadAccountPassword,
  loadOdooTarget,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

primeQaEnvFromLocal();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = loadOdooTarget();
const nextBase = (process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const ACCOUNTS = ['qa.pm', 'done', 'qa.parent'];

function mergeCookies(prev, res) {
  const jar = new Map();
  for (const part of (prev ?? '').split('; ').filter(Boolean)) {
    const [k, ...v] = part.split('=');
    jar.set(k, v.join('='));
  }
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const [k, ...v] = pair.split('=');
    jar.set(k.trim(), v.join('='));
  }
  const single = res.headers.get('set-cookie');
  if (single && !setCookies.length) {
    for (const part of single.split(/,(?=[^;]+?=)/)) {
      const [pair] = part.split(';');
      const [k, ...v] = pair.split('=');
      if (k?.trim()) jar.set(k.trim(), v.join('='));
    }
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function odooAuthenticate(login) {
  let password;
  let passwordEnv;
  try {
    password = loadAccountPassword(login);
    passwordEnv = passwordSourceForLogin(login);
  } catch (e) {
    return { login, step: 'password', ok: false, error: e.message };
  }

  let res;
  try {
    res = await fetch(`${target.odooBaseUrl}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'call',
        params: { db: target.odooDb, login, password },
      }),
    });
  } catch (e) {
    return { login, passwordEnv, step: 'authenticate', ok: false, error: String(e.message ?? e) };
  }

  const json = await res.json().catch(() => ({}));
  const uid = json.result?.uid ?? null;
  const cookieJar = mergeCookies('', res);
  const hasSessionCookie = /session_id=/.test(cookieJar);

  if (!uid) {
    return {
      login,
      passwordEnv,
      step: 'authenticate',
      ok: false,
      status: res.status,
      uid: null,
      hasSessionCookie,
      error: json.error?.data?.name ?? json.error?.message ?? 'no_uid',
      db: target.odooDb,
    };
  }

  const meRes = await fetch(`${target.odooBaseUrl}${target.apiPrefix}/me`, {
    headers: { Cookie: cookieJar, Accept: 'application/json' },
  });
  const meBody = await meRes.json().catch(() => ({}));
  const user = meBody.data?.user ?? meBody.data ?? meBody.user ?? null;

  const financePerms = (user?.permissions ?? []).filter((p) => String(p).startsWith('finance.'));
  const overview = await fetch(`${target.odooBaseUrl}${target.apiPrefix}/admin/finance/overview`, {
    headers: { Cookie: cookieJar, Accept: 'application/json' },
  });
  const overviewBody = await overview.json().catch(() => ({}));

  return {
    login,
    passwordEnv,
    step: 'complete',
    ok: true,
    uid,
    hasSessionCookie,
    db: target.odooDb,
    meStatus: meRes.status,
    role: user?.role ?? null,
    admin_kind: user?.admin_kind ?? null,
    financePermissions: financePerms,
    overview: {
      status: overview.status,
      success: overviewBody.success,
      error: overviewBody.error?.code ?? null,
    },
  };
}

async function nextLogin(login) {
  let password;
  let passwordEnv;
  try {
    password = loadAccountPassword(login);
    passwordEnv = passwordSourceForLogin(login);
  } catch (e) {
    return { login, via: 'next-bff', ok: false, error: e.message };
  }
  let res;
  try {
    res = await fetch(`${nextBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ login, password }),
    });
  } catch (e) {
    return { login, via: 'next-bff', ok: false, passwordEnv, error: 'next_unreachable', message: String(e.message ?? e) };
  }
  const body = await res.json().catch(() => ({}));
  const cookieJar = mergeCookies('', res);
  const hasScc = /scc_session=/.test(cookieJar);
  if (!body.success) {
    return {
      login,
      via: 'next-bff',
      ok: false,
      passwordEnv,
      status: res.status,
      code: body.error?.code,
      hasSccCookie: hasScc,
    };
  }
  const user = body.data?.user ?? body.user;
  const proxy = await fetch(`${nextBase}/api/odoo/admin/finance/overview`, {
    headers: { Cookie: cookieJar, Accept: 'application/json' },
  });
  const proxyBody = await proxy.json().catch(() => ({}));
  return {
    login,
    via: 'next-bff',
    ok: true,
    passwordEnv,
    status: res.status,
    hasSccCookie: hasScc,
    role: user?.role,
    financePermissions: (user?.permissions ?? []).filter((p) => String(p).startsWith('finance.')),
    overviewProxy: { status: proxy.status, success: proxyBody.success, error: proxyBody.error?.code ?? null },
  };
}

const out = {
  target: { odooBaseUrl: target.odooBaseUrl, db: target.odooDb, nextBase },
  envLocalPresent: fs.existsSync(path.join(ROOT, '.env.local')),
  odooDirect: [],
  nextBff: [],
};

for (const login of ACCOUNTS) {
  out.odooDirect.push(await odooAuthenticate(login));
}

for (const login of ACCOUNTS) {
  out.nextBff.push(await nextLogin(login));
}

console.log(JSON.stringify(out, null, 2));
