// Server-side allowlist for `/api/odoo/[...path]` — families from `endpoints.ts` (not bare admin/*).
// Dynamic IDs are allowed within listed families; Odoo technical namespaces are denied.

const ALL_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Second-level admin families referenced by `src/lib/api/endpoints.ts`. */
export const BFF_ADMIN_FAMILIES = [
  'dashboard',
  'school-branding',
  'students',
  'financial-agreements',
  'service-subscriptions',
  'finance',
  'guardians',
  'parents',
  'teachers',
  'classes',
  'levels',
  'subjects',
  'setup',
  'academic-context',
  'academic-years',
  'teaching-assignments',
  'teaching-references',
  'teaching-offerings',
  'didactic-sequences',
  'annual-distributions',
  'reference-jathathas',
  'teacher-jathathas',
  'actual-deliveries',
  'class-journal',
  'teaching-progress-lines',
  'teaching-progress-summary',
  /** V3 next-item decisions / remaining under /admin/teaching/* */
  'teaching',
  'staff',
  'tracks',
  'attendance',
  'homeworks',
  'attachments',
  'exams',
  'resources',
  'timetable',
  'exam-results',
  'assessment',
  'channels',
  'communication',
  'admissions',
] as const;

const BFF_TEACHER_FAMILIES = [
  'dashboard',
  'classes',
  'academic-context',
  'homeworks',
  'attachments',
  'exams',
  'resources',
  'exam-results',
  'assessment',
  'timetable',
  'annual-distributions',
  'didactic-sequences',
  'session-occurrences',
  'jathathas',
  'actual-deliveries',
  'class-journal',
  'teaching-progress',
  'teaching-progress-summary',
  /** V3 remaining / suggested-next / decision under /teacher/teaching/* */
  'teaching',
] as const;

const BFF_PARENT_FAMILIES = ['dashboard', 'children', 'finance'] as const;

const BFF_STUDENT_FAMILIES = [
  'dashboard',
  'profile',
  'attendance',
  'homeworks',
  'resources',
  'exams',
  'exam-results',
  'timetable',
] as const;

const DENIED_SEGMENTS = new Set([
  'web',
  'dataset',
  'call_kw',
  'jsonrpc',
  'xmlrpc',
  'search_read',
  'execute_kw',
  'report',
  'model',
  'domain',
]);

/**
 * Admin mutation families where top-level school_id / active_school_id must match
 * the trusted active school (defense-in-depth; Odoo remains final authority).
 */
const BIND_ACTIVE_SCHOOL_ADMIN_FAMILIES = new Set([
  'students',
  'finance',
  'financial-agreements',
  'service-subscriptions',
  'staff',
  'admissions',
  'classes',
  'levels',
  'subjects',
  'teachers',
  'attendance',
  'timetable',
  'homeworks',
  'resources',
  'exams',
  'exam-results',
  'assessment',
  'school-branding',
  'setup',
  'academic-context',
  'academic-years',
  'teaching-assignments',
  'teaching-references',
  'teaching-offerings',
  'didactic-sequences',
  'annual-distributions',
  'reference-jathathas',
  'teacher-jathathas',
  'actual-deliveries',
  'class-journal',
  'teaching-progress-lines',
  'teaching-progress-summary',
  'teaching',
  'tracks',
  'guardians',
  'parents',
  'channels',
  'communication',
]);

type MethodSet = readonly string[];

type RouteRule = {
  methods: MethodSet;
  /** Match pathname without trailing slash (except root). */
  test: (pathname: string) => boolean;
};

function familyPattern(root: string, families: readonly string[]): RegExp {
  const joined = families.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`^/${root}/(?:${joined})(?:/.*)?$`);
}

const ROUTE_RULES: RouteRule[] = [
  { methods: ['GET', 'HEAD'], test: (p) => p === '/me' },
  { methods: ['POST'], test: (p) => p === '/auth/logout' || p === '/auth/refresh' },
  {
    methods: ALL_METHODS,
    test: (p) => familyPattern('admin', BFF_ADMIN_FAMILIES).test(p),
  },
  {
    methods: ALL_METHODS,
    test: (p) => familyPattern('teacher', BFF_TEACHER_FAMILIES).test(p),
  },
  {
    methods: ALL_METHODS,
    test: (p) => familyPattern('parent', BFF_PARENT_FAMILIES).test(p),
  },
  {
    methods: ALL_METHODS,
    test: (p) => familyPattern('student', BFF_STUDENT_FAMILIES).test(p),
  },
  {
    methods: ['GET', 'HEAD', 'POST'],
    test: (p) =>
      /^\/channels(?:\/[^/]+(?:\/(?:messages|my-pending-messages|pending-messages\/[^/]+\/resubmit))?)?$/.test(
        p,
      ),
  },
  {
    methods: ['GET', 'HEAD'],
    test: (p) => /^\/attachments\/[^/]+\/(?:download|preview|thumbnail)$/.test(p),
  },
];

export type BffRoutePolicyResult =
  | { ok: true }
  | { ok: false; reason: 'method_not_allowed' | 'path_not_allowed' | 'denied_namespace' };

function normalizePolicyPath(path: string): string {
  if (!path) return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  if (withSlash.length > 1 && withSlash.endsWith('/')) return withSlash.slice(0, -1);
  return withSlash;
}

/** True when any path segment is an Odoo technical / ORM namespace. */
export function hasDeniedBffNamespace(pathname: string): boolean {
  const parts = normalizePolicyPath(pathname).split('/').filter(Boolean);
  return parts.some((part) => DENIED_SEGMENTS.has(part.toLowerCase()));
}

/**
 * Enforce explicit BFF route + method policy for browser → `/api/odoo/*` traffic.
 * Paths must already be canonicalized (no traversal).
 */
export function assertBffRoutePolicy(path: string, method: string): BffRoutePolicyResult {
  const pathname = normalizePolicyPath(path);
  const httpMethod = method.toUpperCase();

  if (hasDeniedBffNamespace(pathname)) {
    return { ok: false, reason: 'denied_namespace' };
  }

  for (const rule of ROUTE_RULES) {
    if (!rule.test(pathname)) continue;
    if (!rule.methods.includes(httpMethod)) {
      return { ok: false, reason: 'method_not_allowed' };
    }
    return { ok: true };
  }

  return { ok: false, reason: 'path_not_allowed' };
}

/** Whether JSON mutation body should be bound to the trusted active school. */
export function shouldBindActiveSchoolInBody(path: string, method: string): boolean {
  const pathname = normalizePolicyPath(path);
  const httpMethod = method.toUpperCase();
  if (!MUTATION_METHODS.has(httpMethod)) return false;
  if (!pathname.startsWith('/admin/')) return false;
  const family = pathname.split('/')[2] ?? '';
  return BIND_ACTIVE_SCHOOL_ADMIN_FAMILIES.has(family);
}

/**
 * Whether to inject active_school_id into the JSON body.
 * School is already forwarded as a query param for /admin/*; some Odoo
 * write endpoints reject active_school_id as an unsupported field
 * (finance services catalog, student guardian relationship mutations).
 */
export function shouldInjectActiveSchoolIdInBody(path: string): boolean {
  const pathname = normalizePolicyPath(path);
  if (/^\/admin\/finance\/services(?:\/|$)/.test(pathname)) return false;
  // Student guardian link/create/update/end/remove — school stays on query only.
  if (/^\/admin\/students\/[^/]+\/guardians(?:\/|$)/.test(pathname)) return false;
  return true;
}
