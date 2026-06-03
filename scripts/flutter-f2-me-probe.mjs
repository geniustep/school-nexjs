/**
 * Flutter F-2 contract probe — Odoo auth + GET /api/v1/me + expected RoleRouter home.
 * No passwords, cookies, or session IDs in stdout JSON.
 */
import {
  loadAccountPassword,
  loadOdooTarget,
  passwordSourceForLogin,
  primeQaEnvFromLocal,
} from './qa-env.mjs';

primeQaEnvFromLocal();

const ACCOUNTS = [
  'qa.pm',
  'qa.schoolmgr',
  'qa.supervisor',
  'qa.staff',
  'qa.teacher',
  'qa.parent',
  'qa.student',
];

const FLUTTER_HOME = {
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  student: '/student',
};

function flutterHome(role) {
  return FLUTTER_HOME[role] ?? '/unsupported';
}

async function authenticate(login, password, target) {
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
  const json = await res.json().catch(() => ({}));
  const uid = json.result?.uid ?? null;
  if (!uid) {
    return {
      ok: false,
      error: json.error?.data?.name ?? json.error?.message ?? 'auth_failed',
    };
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const sessionPair = setCookie
    .map((c) => c.split(';')[0])
    .find((p) => p.startsWith('session_id='));
  if (!sessionPair) {
    return { ok: false, error: 'no_session_cookie' };
  }
  return { ok: true, uid, cookieHeader: sessionPair };
}

async function fetchMe(target, cookieHeader) {
  const res = await fetch(`${target.odooBaseUrl}${target.apiPrefix}/me`, {
    headers: { Accept: 'application/json', Cookie: cookieHeader },
  });
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return { ok: false, status: res.status, error: 'non_json_me' };
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, error: 'parse_error' };
  }
  const user = body?.user ?? body?.data?.user ?? body;
  if (!user?.role) {
    return { ok: false, status: res.status, error: 'missing_user_role' };
  }
  return {
    ok: true,
    status: res.status,
    role: user.role,
    admin_kind: user.admin_kind ?? null,
    permissionCount: user.permissions?.length ?? 0,
    school_ids: user.school_ids ?? (user.school?.id ? [user.school.id] : []),
    active_school_id: user.active_school_id ?? null,
    scope_type: user.scope_type ?? user.scope?.type ?? null,
  };
}

const target = loadOdooTarget();
const out = { target: { odooBaseUrl: target.odooBaseUrl, odooDb: target.odooDb }, accounts: [] };

for (const login of ACCOUNTS) {
  const row = { login, passwordEnv: passwordSourceForLogin(login) };
  let password;
  try {
    password = loadAccountPassword(login);
  } catch (e) {
    row.auth = { ok: false, error: 'no_password_config', message: e.message };
    out.accounts.push(row);
    continue;
  }
  const auth = await authenticate(login, password, target);
  if (!auth.ok) {
    row.auth = auth;
    out.accounts.push(row);
    continue;
  }
  row.auth = { ok: true, uid: auth.uid };
  const me = await fetchMe(target, auth.cookieHeader);
  row.me = me;
  if (me.ok) {
    row.flutterHome = flutterHome(me.role);
    row.adminKind = me.admin_kind;
  }
  out.accounts.push(row);
}

console.log(JSON.stringify(out, null, 2));
