/**
 * Teacher Kanban context smoke — verifies teacher cannot reach admin Kanban.
 * DB: school. Account: qa.teacher.
 * Usage: node scripts/admin-students-kanban-teacher-context-smoke-1.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const LOCAL_BASE = (process.argv[2] ?? process.env.STUDENTS_KANBAN_QA_LOCAL_URL ?? 'http://localhost:3030').replace(
  /\/$/,
  '',
);
const FORWARDED_HOST = process.env.STUDENTS_KANBAN_QA_HOST ?? 'school.raqeem.ma';
const LOGIN = process.env.STUDENTS_KANBAN_QA_LOGIN ?? 'qa.teacher';
const PASSWORD = loadAccountPassword(LOGIN);

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function loginViaApi(request, context) {
  const res = await request.post(`${LOCAL_BASE}/api/auth/login`, {
    headers: { 'X-Forwarded-Host': FORWARDED_HOST },
    data: { login: LOGIN, password: PASSWORD },
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers()['set-cookie'];
  if (setCookies && context) {
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((raw) => {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: LOCAL_BASE };
    });
    await context.addCookies(cookies);
  }
  return { ok: body.success === true, status: res.status(), role: body.user?.role, error: body.error?.code };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-Host': FORWARDED_HOST },
  });
  const page = await context.newPage();

  const login = await loginViaApi(context.request, context);
  record('teacher_login', login.ok, login);
  if (!login.ok) {
    await browser.close();
    console.log(
      JSON.stringify(
        {
          status: 'BLOCKED',
          teacherKanbanContext: 'TEACHER_LOGIN_UNAVAILABLE',
          results,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  await page.goto(`${LOCAL_BASE}/admin/students`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const url = page.url();
  const kanbanVisible = await page.locator('.students-kanban').isVisible().catch(() => false);
  const redirectedAwayFromAdminStudents =
    !url.includes('/admin/students') || url.includes('/teacher') || url.includes('/login');

  record('admin_students_not_accessible', redirectedAwayFromAdminStudents || !kanbanVisible, {
    url,
    kanbanVisible,
  });

  await browser.close();

  const contextNote = 'TEACHER_KANBAN_RUNTIME_CONTEXT_NOT_AVAILABLE';
  const passed = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: passed ? 'PASS' : 'FAILED',
        teacherKanbanContext: contextNote,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
