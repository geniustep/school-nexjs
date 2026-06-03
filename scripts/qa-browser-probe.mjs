import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
const BASE = process.argv[2] ?? 'http://localhost:3001';

async function cookieJarFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function login(login) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password: loadAccountPassword(login) }),
  });
  const body = await res.json();
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
  return jar;
}

{
  const jar = await login('qa.pm');
  const dash = await (await fetch(`${BASE}/admin/dashboard`, { headers: { Cookie: jar } })).text();
  const options = [...dash.matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]+)</g)].map((m) => ({
    id: m[1],
    name: m[2],
  }));
  console.log('--- qa.pm switcher', {
    hasSwitcher: dash.includes('school-switcher'),
    options,
  });
}

for (const name of ['qa.staff', 'qa.supervisor', 'qa.pm', 'qa.schoolmgr']) {
  const jar = await login(name);
  const ac = await (await fetch(`${BASE}/admin/academic`, { headers: { Cookie: jar } })).text();
  const ch = await (await fetch(`${BASE}/admin/channels`, { headers: { Cookie: jar } })).text();
  const att = await (await fetch(`${BASE}/admin/attendance?date=today`, { headers: { Cookie: jar } })).text();
  const st = await (await fetch(`${BASE}/admin/students`, { headers: { Cookie: jar } })).text();
  console.log('---', name);
  let switch9 = null;
  if (name === 'qa.schoolmgr') {
    const dash = await (await fetch(`${BASE}/admin/dashboard`, { headers: { Cookie: jar } })).text();
    console.log('schoolmgr switcher hidden', !dash.includes('school-switcher'));
    const sw = await fetch(`${BASE}/api/auth/active-school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: jar },
      body: JSON.stringify({ school_id: 9 }),
    });
    switch9 = { status: sw.status, body: await sw.json().catch(() => ({})) };
  }
  const academicNav = [...ac.matchAll(/href="(\/admin\/[^"?#]+)/g)]
    .map((m) => m[1])
    .filter((h) => h.startsWith('/admin/') && h !== '/admin/academic');
  console.log({
    switch9,
    academicForbidden: ac.includes('الوصول مقيّد'),
    academicHubLinks: [...new Set(academicNav)],
    academicHasHomeworkLink: ac.includes('href="/admin/homeworks"'),
    channelsForbidden: ch.includes('الوصول مقيّد'),
    channelsAdminHref: ch.includes('href="/admin/channels"') || ch.includes('/admin/channels'),
    attendanceForbidden: att.includes('الوصول مقيّد'),
    attendanceHasLeftEarly: /left_early|leftEarly|متأخر|غادر/.test(att),
    attendanceExcused: /excused/.test(att),
    studentsNew: st.includes('/admin/students/new'),
    studentsAddBtn: /btn--primary/.test(st) && st.includes('/admin/students/new'),
  });
}
