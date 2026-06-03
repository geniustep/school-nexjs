/**
 * Direct Odoo /web/session/authenticate probe — no passwords in source.
 * Usage: set env vars then: node scripts/odoo-direct-auth-probe.mjs
 */
import {
  loadAccountPassword,
  loadOdooTarget,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

primeQaEnvFromLocal();

const target = loadOdooTarget();

const ACCOUNTS = [
  'qa.pm',
  'qa.schoolmgr',
  'qa.supervisor',
  'qa.staff',
  'qa.teacher',
  'qa.parent',
  'qa.student',
];

async function odooAuthenticate(login, password) {
  const url = `${target.odooBaseUrl}/web/session/authenticate`;
  let res;
  try {
    res = await fetch(url, {
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
    return { ok: false, error: 'network_error', message: String(e.message ?? e) };
  }
  let json = {};
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: 'parse_error', status: res.status };
  }
  const uid = json.result?.uid ?? null;
  if (uid) return { ok: true, uid, db: target.odooDb, url };
  return {
    ok: false,
    error: json.error?.data?.name ?? json.error?.message ?? 'invalid_credentials',
    status: res.status,
    db: target.odooDb,
    url,
  };
}

const out = { target, accounts: [] };
for (const login of ACCOUNTS) {
  let password;
  try {
    password = loadAccountPassword(login);
  } catch (e) {
    out.accounts.push({ login, ok: false, error: 'no_password_config', message: e.message });
    continue;
  }
  const r = await odooAuthenticate(login, password);
  out.accounts.push({
    login,
    passwordEnv: passwordSourceForLogin(login),
    ...r,
  });
}

console.log(JSON.stringify(out, null, 2));
