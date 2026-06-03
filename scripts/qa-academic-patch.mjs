import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const BASE = process.argv[2] ?? 'http://localhost:3001';

async function cookieJarFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function login(login, password = loadAccountPassword(login)) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`${login} login failed`);
  let jar = await cookieJarFrom(res);
  const sid = body.data.user.school_ids?.[0];
  if (body.data.user.role === 'admin' && sid) {
    const sw = await fetch(`${BASE}/api/auth/active-school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: jar },
      body: JSON.stringify({ school_id: sid }),
    });
    jar = await cookieJarFrom(sw, jar);
  }
  return { jar, user: body.data.user };
}

function hubLinks(html) {
  return [
    ...new Set(
      [...html.matchAll(/href="(\/admin\/(?:homeworks|resources|exams|exam-results|timetable|classes|levels|subjects))"/g)].map(
        (m) => m[1],
      ),
    ),
  ];
}

const rows = [];
for (const [name, account] of [
  ['qa.staff', 'qa.staff'],
  ['qa.supervisor', 'qa.supervisor'],
  ['qa.pm', 'qa.pm'],
  ['qa.schoolmgr', 'qa.schoolmgr'],
]) {
  const { jar } = await login(account);
  const ac = await (await fetch(`${BASE}/admin/academic`, { headers: { Cookie: jar } })).text();
  const nav = await (await fetch(`${BASE}/admin/students`, { headers: { Cookie: jar } })).text();
  const forbidden = ac.includes('الوصول مقيّد') || ac.includes('Access restricted');
  rows.push({
    account: name,
    academic: forbidden ? 'Forbidden' : '200',
    hubLinks: hubLinks(ac),
    navHasAcademic: nav.includes('href="/admin/academic"') || nav.includes('/admin/academic'),
    pass:
      name === 'qa.staff'
        ? forbidden && !nav.includes('/admin/academic')
        : !forbidden && hubLinks(ac).length > 0,
  });
}

for (const [account, portal] of [
  ['qa.teacher', 'teacher'],
  ['qa.parent', 'parent'],
  ['qa.student', 'student'],
]) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: account, password: PASS }),
  });
  const jar = await cookieJarFrom(res);
  const d = await fetch(`${BASE}/admin/academic`, { headers: { Cookie: jar }, redirect: 'manual' });
  rows.push({
    account,
    academic: `redirect ${d.status}`,
    pass: d.status === 307 && (d.headers.get('location') ?? '').includes(portal),
  });
}

console.log(JSON.stringify(rows, null, 2));
