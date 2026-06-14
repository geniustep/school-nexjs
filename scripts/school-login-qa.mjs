/**
 * School login smoke — credentials from env only (no hardcoded passwords).
 * Usage: node scripts/school-login-qa.mjs [host] [login]
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const HOST = process.argv[2] ?? 'school.raqeem.ma';
const LOGIN = process.argv[3] ?? 'done';
const BASE = `https://${HOST}`;

let PASSWORD;
try {
  PASSWORD = loadAccountPassword(LOGIN);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

function parseCookies(res) {
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]);
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
  });
  const body = await res.json();
  const setCookies = parseCookies(res);
  const bodyStr = JSON.stringify(body);
  return {
    status: res.status,
    success: body.success,
    error: body.error,
    user: body.data?.user
      ? { role: body.data.user.role, login: body.data.user.login, name: body.data.user.name }
      : null,
    setCookies,
    hasSession: setCookies.some((c) => c.startsWith('scc_session=')),
    hasTenant: setCookies.some((c) => c.startsWith('scc_tenant=')),
    tenantValue: setCookies.some((c) => c.startsWith('scc_tenant=')) ? '[present]' : null,
    leaksDb: bodyStr.includes('"db"'),
    jar: cookiesFrom(res),
  };
}

async function me(host, jar) {
  const res = await fetch(`https://${host}/api/odoo/me`, { headers: { Cookie: jar } });
  const body = await res.json().catch(() => ({}));
  return { host, status: res.status, success: body.success, user: body.data?.user?.login, error: body.error?.code };
}

async function protectedPage(jar) {
  const res = await fetch(`${BASE}/admin/dashboard`, { headers: { Cookie: jar }, redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location') };
}

async function logout(jar) {
  const res = await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: jar } });
  return { status: res.status, cleared: parseCookies(res), body: await res.json().catch(() => ({})) };
}

console.log(`=== Login ${HOST} (${LOGIN}) ===`);
const loginResult = await login();
console.log(JSON.stringify(loginResult, null, 2));

if (loginResult.jar) {
  console.log(`=== Protected page ===`);
  console.log(JSON.stringify(await protectedPage(loginResult.jar), null, 2));
  console.log(`=== Logout ===`);
  console.log(JSON.stringify(await logout(loginResult.jar), null, 2));
}
