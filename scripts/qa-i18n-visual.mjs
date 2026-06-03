/**
 * I18N-1A visual QA probe (Playwright).
 * Usage: node scripts/qa-i18n-visual.mjs [baseUrl]
 * Requires: npx playwright (chromium) — not added to package.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const BASE = (process.argv[2] ?? 'http://localhost:3002').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts', 'qa-i18n-visual-output.json');

const LOCALES = ['ar', 'fr', 'en', 'es'];

const AR_NAV_TERMS = [
  'تلميذ',
  'ولي الأمر',
  'الواجبات',
  'الموارد',
  'استعمال الزمن',
  'الامتحانات',
  'النتائج',
  'الحضور',
  'أقسامي',
  'التسليمات',
];

const EN_NAV_SNIPPETS = ['Dashboard', 'Homework', 'Resources', 'Attendance'];

const ROLE_PLAN = [
  {
    login: 'qa.pm',
    label: 'admin',
    pages: ['/admin/dashboard', '/admin/students', '/admin/attendance?date=today'],
    localeChecks: { ar: AR_NAV_TERMS, en: EN_NAV_SNIPPETS },
  },
  {
    login: 'qa.teacher',
    label: 'teacher',
    pages: ['/teacher/dashboard', '/teacher/homeworks', '/teacher/timetable'],
    localeChecks: {
      ar: ['لوحة التحكم', 'الواجبات', 'استعمال الزمن', 'أقسامي'],
      en: ['Dashboard', 'Homework', 'Timetable'],
    },
  },
  {
    login: 'qa.parent',
    label: 'parent',
    pages: ['/parent/dashboard', '/parent/channels'],
    localeChecks: {
      ar: ['أبنائي', 'القنوات', 'ولي'],
      en: ['children', 'Channels'],
    },
  },
  {
    login: 'qa.student',
    label: 'student',
    pages: ['/student/dashboard', '/student/homeworks', '/student/timetable'],
    localeChecks: {
      ar: ['الواجبات', 'استعمال الزمن', 'حضوري'],
      en: ['Homework', 'Timetable'],
    },
  },
];

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
  if (!body.success) throw new Error(`login ${login}: ${body.error?.code ?? 'failed'}`);
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

function parseCookies(jar) {
  const baseUrl = new URL(BASE);
  return jar.split('; ').filter(Boolean).map((pair) => {
    const i = pair.indexOf('=');
    return {
      name: pair.slice(0, i),
      value: pair.slice(i + 1),
      domain: baseUrl.hostname,
      path: '/',
    };
  });
}

function leakedKeys(text) {
  const hits = new Set();
  const re = /\b(?:nav|errors|admin|dashboard|attendance|channels|common|empty|studentPortal|parent)\.[a-zA-Z0-9_.]+\b/g;
  for (const m of text.matchAll(re)) hits.add(m[0]);
  return [...hits];
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('Playwright not available. Run: npx --yes playwright@1.49.1 install chromium');
    process.exit(2);
  }

  const results = {
    base: BASE,
    at: new Date().toISOString(),
    locales: LOCALES,
    roles: [],
    summary: { pass: 0, fail: 0, warn: 0 },
  };

  const browser = await chromium.launch({ headless: true });

  for (const plan of ROLE_PLAN) {
    const roleResult = { role: plan.label, login: plan.login, locales: {} };
    let session;
    try {
      session = await login(plan.login);
    } catch (e) {
      roleResult.loginError = String(e.message ?? e);
      results.roles.push(roleResult);
      results.summary.fail += 1;
      continue;
    }

    for (const locale of LOCALES) {
      const locResult = { pages: [], dir: null, lang: null, leaks: [], termMisses: [] };
      const context = await browser.newContext();
      const baseUrl = new URL(BASE);
      await context.addCookies([
        ...parseCookies(session.jar),
        {
          name: 'scc_locale',
          value: locale,
          domain: baseUrl.hostname,
          path: '/',
        },
      ]);
      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          locResult.consoleErrors = locResult.consoleErrors ?? [];
          locResult.consoleErrors.push(msg.text().slice(0, 200));
        }
      });

      await page.addInitScript((loc) => {
        try {
          localStorage.setItem('scc_locale', loc);
        } catch {
          /* ignore */
        }
      }, locale);

      for (const href of plan.pages) {
        const url = `${BASE}${href}`;
        const entry = { href, ok: true, issues: [] };
        try {
          const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
          if (!res || res.status() >= 400) {
            entry.ok = false;
            entry.issues.push(`http_${res?.status() ?? 'none'}`);
          }
          await page.waitForTimeout(800);
          const shell = await page.evaluate(() => ({
            dir: document.documentElement.getAttribute('dir'),
            lang: document.documentElement.getAttribute('lang'),
            text: document.body?.innerText?.slice(0, 12000) ?? '',
          }));
          locResult.dir = shell.dir;
          locResult.lang = shell.lang;
          const leaks = leakedKeys(shell.text);
          if (leaks.length) {
            entry.ok = false;
            entry.issues.push(`leaked_keys:${leaks.join(',')}`);
            locResult.leaks.push(...leaks);
          }
          if (locale === 'ar' && shell.dir !== 'rtl') {
            entry.ok = false;
            entry.issues.push('rtl_expected');
          }
          if (locale !== 'ar' && shell.dir === 'rtl') {
            entry.ok = false;
            entry.issues.push('ltr_expected');
          }
          const terms = plan.localeChecks?.[locale] ?? plan.localeChecks?.[locale === 'ar' ? 'ar' : 'en'];
          if (terms) {
            for (const term of terms) {
              if (!shell.text.includes(term)) locResult.termMisses.push({ href, term });
            }
          }
        } catch (e) {
          entry.ok = false;
          entry.issues.push(`error:${String(e.message ?? e).slice(0, 120)}`);
        }
        locResult.pages.push(entry);
      }

      locResult.consoleErrors = [...new Set(locResult.consoleErrors ?? [])].slice(0, 5);
      const pageFails = locResult.pages.filter((p) => !p.ok).length;
      const termFails = locResult.termMisses.length;
      locResult.status =
        pageFails || (locale === 'ar' && locResult.dir !== 'rtl') ? 'FAIL' : termFails ? 'WARN' : 'PASS';
      if (locResult.status === 'PASS') results.summary.pass += 1;
      else if (locResult.status === 'WARN') results.summary.warn += 1;
      else results.summary.fail += 1;

      roleResult.locales[locale] = locResult;
      await context.close();
    }
    results.roles.push(roleResult);
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ summary: results.summary, out: OUT }, null, 2));
  process.exit(results.summary.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
