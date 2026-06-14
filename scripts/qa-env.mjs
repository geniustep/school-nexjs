/**
 * Shared QA credential loader — never hardcode passwords.
 *
 * Password resolution per login (first match):
 *   1. Account-specific env (QA_PM_PASSWORD, …) or Odoo aliases (ODOO_QA_RBAC_PASSWORD, …)
 *   2. QA_PASSWORD (common fallback)
 *   3. QA_PASSWORD_FILE (single-line or QA_PASSWORD= in file)
 *   4. `.env.local` then `.env.qa.local` (gitignored; `.env.local` wins on conflict)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** login → ordered list of env var names */
const PASSWORD_ENV_BY_LOGIN = {
  'qa.pm': ['QA_PM_PASSWORD', 'ODOO_QA_PM_PASSWORD', 'ODOO_QA_RBAC_PASSWORD', 'QA_PASSWORD'],
  'qa.schoolmgr': [
    'QA_SCHOOLMGR_PASSWORD',
    'ODOO_QA_SCHOOLMGR_PASSWORD',
    'ODOO_QA_RBAC_PASSWORD',
    'QA_PASSWORD',
  ],
  'qa.supervisor': [
    'QA_SUPERVISOR_PASSWORD',
    'ODOO_QA_SUPERVISOR_PASSWORD',
    'ODOO_QA_RBAC_PASSWORD',
    'QA_PASSWORD',
  ],
  'qa.staff': ['QA_STAFF_PASSWORD', 'ODOO_QA_STAFF_PASSWORD', 'ODOO_QA_RBAC_PASSWORD', 'QA_PASSWORD'],
  'qa.teacher': ['QA_TEACHER_PASSWORD', 'ODOO_QA_TEACHER_PASSWORD', 'QA_PASSWORD'],
  'qa.parent': ['QA_PARENT_PASSWORD', 'ODOO_QA_PARENT_PASSWORD', 'QA_PASSWORD'],
  'qa.student': ['QA_STUDENT_PASSWORD', 'ODOO_QA_STUDENT_PASSWORD', 'QA_PASSWORD'],
  done: ['QA_PASSWORD_LEGACY', 'ODOO_QA_ADMIN_PASSWORD', 'QA_PASSWORD'],
};

const DOTENV_KEYS = [
  'ODOO_URL',
  'ODOO_BASE_URL',
  'ODOO_DB',
  'QA_PASSWORD',
  'QA_PM_PASSWORD',
  'QA_SCHOOLMGR_PASSWORD',
  'QA_SUPERVISOR_PASSWORD',
  'QA_STAFF_PASSWORD',
  'QA_TEACHER_PASSWORD',
  'QA_PARENT_PASSWORD',
  'QA_STUDENT_PASSWORD',
  'ODOO_QA_RBAC_PASSWORD',
  'ODOO_QA_ADMIN_PASSWORD',
  'ODOO_QA_TEACHER_PASSWORD',
  'ODOO_QA_PARENT_PASSWORD',
  'ODOO_QA_STUDENT_PASSWORD',
  'QA_PASSWORD_LEGACY',
  'STUDENT_360_QA_PASSWORD',
  'STUDENT_360_QA_LOGIN',
  'STUDENT_360_QA_HOST',
  'ODOO_DB_QA',
];

const LOCAL_ENV_FILES = ['.env.qa.local', '.env.local'];

function parseDotEnvLine(line) {
  const t = line.trim();
  if (!t || t.startsWith('#')) return null;
  const i = t.indexOf('=');
  if (i < 1) return null;
  const key = t.slice(0, i).trim();
  let val = t.slice(i + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

function loadDotEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const p = parseDotEnvLine(line);
    if (p?.key && p.val) map[p.key] = p.val;
  }
  return map;
}

let cachedLocalEnv = null;
function localEnv() {
  if (!cachedLocalEnv) {
    const merged = {};
    for (const file of LOCAL_ENV_FILES) {
      Object.assign(merged, loadDotEnvFile(path.join(ROOT, file)));
    }
    cachedLocalEnv = merged;
  }
  return cachedLocalEnv;
}

function fromEnvKey(key) {
  const v = process.env[key];
  if (v) return v;
  return localEnv()[key] ?? null;
}

function resolveFromKeys(keys) {
  for (const key of keys) {
    const v = fromEnvKey(key);
    if (v) return { password: v, source: key };
  }
  return null;
}

/** @param {string} login Odoo login */
export function loadAccountPassword(login) {
  const explicitLogin = process.env.STUDENT_360_QA_LOGIN;
  const explicitPassword = process.env.STUDENT_360_QA_PASSWORD?.trim();
  if (explicitLogin && explicitPassword && login === explicitLogin) {
    return explicitPassword;
  }

  const keys = PASSWORD_ENV_BY_LOGIN[login];
  if (!keys) throw new Error(`Unknown QA login: ${login}`);
  const hit = resolveFromKeys(keys);
  if (hit) return hit.password;

  const fileEnv = process.env.QA_PASSWORD_FILE;
  if (fileEnv && fs.existsSync(path.resolve(fileEnv))) {
    const map = loadDotEnvFile(path.resolve(fileEnv));
    for (const key of keys) {
      if (map[key]) return map[key];
    }
    if (map.QA_PASSWORD) return map.QA_PASSWORD;
  }

  throw new Error(
    `No password for ${login}. Set one of: ${keys.join(', ')} or QA_PASSWORD / .env.local`,
  );
}

function passwordFileMap() {
  const fileEnv = process.env.QA_PASSWORD_FILE;
  if (!fileEnv || !fs.existsSync(path.resolve(fileEnv))) return null;
  return loadDotEnvFile(path.resolve(fileEnv));
}

/** Which env key supplied the password (for probe diagnostics, not the secret). */
export function passwordSourceForLogin(login) {
  const keys = PASSWORD_ENV_BY_LOGIN[login] ?? [];
  for (const key of keys) {
    if (fromEnvKey(key)) return key;
  }
  const map = passwordFileMap();
  if (map) {
    for (const key of keys) {
      if (map[key]) return `QA_PASSWORD_FILE:${key}`;
    }
    if (map.QA_PASSWORD) return 'QA_PASSWORD_FILE:QA_PASSWORD';
  }
  return null;
}

/** Load `.env.local` / `.env.qa.local` into process.env (gitignored; file wins over stale shell). */
export function primeQaEnvFromLocal() {
  const map = localEnv();
  for (const key of DOTENV_KEYS) {
    if (map[key]) process.env[key] = map[key];
  }
}

const F1_LOGINS = Object.keys(PASSWORD_ENV_BY_LOGIN);

/** True if at least one F-1 account can resolve a password. */
export function hasAnyQaCredential() {
  return F1_LOGINS.some((login) => {
    try {
      loadAccountPassword(login);
      return true;
    } catch {
      return false;
    }
  });
}

export function loadQaPassword() {
  return fromEnvKey('QA_PASSWORD') ?? fromEnvKey('ODOO_QA_RBAC_PASSWORD');
}

export function requireQaPassword() {
  const p = loadQaPassword();
  if (!p) {
    console.error(
      'QA password required: set QA_PASSWORD or per-account QA_*_PASSWORD (see .env.qa.local.example).',
    );
    process.exit(1);
  }
  return p;
}

export function loadOdooTarget() {
  const dotEnv = loadDotEnvFile(path.join(ROOT, '.env'));
  const local = localEnv();
  const base =
    process.env.ODOO_BASE_URL ??
    process.env.ODOO_URL ??
    local.ODOO_BASE_URL ??
    local.ODOO_URL ??
    dotEnv.ODOO_BASE_URL ??
    dotEnv.ODOO_URL ??
    'http://localhost:8069';
  return {
    odooBaseUrl: base.replace(/\/$/, ''),
    odooDb: process.env.ODOO_DB ?? local.ODOO_DB ?? dotEnv.ODOO_DB ?? 'alwah',
    apiPrefix: '/api/v1',
    authPath: '/web/session/authenticate',
    nextPublicApp: process.env.NEXT_PUBLIC_APP_URL ?? null,
  };
}

export { PASSWORD_ENV_BY_LOGIN, DOTENV_KEYS, F1_LOGINS };
