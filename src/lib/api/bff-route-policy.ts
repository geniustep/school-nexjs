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
  'parent-activation-campaigns',
  'admin-requests',
  'teachers',
  'teacher-domain',
  'classes',
  'levels',
  'subjects',
  'setup',
  'academic-context',
  'academic-years',
  'academic-setup',
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
  'library',
  'entry-requirement-lists',
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
  'entry-requirements',
] as const;

const BFF_PARENT_FAMILIES = [
  'dashboard',
  'children',
  'finance',
  'entry-requirements',
  'admin-requests',
] as const;

const BFF_STUDENT_FAMILIES = [
  'dashboard',
  'profile',
  'attendance',
  'homeworks',
  'resources',
  'exams',
  'exam-results',
  'timetable',
  'library',
  'admin-requests',
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
  'teacher-domain',
  'attendance',
  'timetable',
  'homeworks',
  'resources',
  'library',
  'entry-requirement-lists',
  'exams',
  'exam-results',
  'assessment',
  'school-branding',
  'setup',
  'academic-context',
  'academic-years',
  'academic-setup',
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
  'parent-activation-campaigns',
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
  /**
   * Platform reference subject create — exact POST only.
   * Not added to BFF_ADMIN_FAMILIES (no nested /id routes) and not bound for body school injection.
   */
  {
    methods: ['POST'],
    test: (p) => p === '/admin/reference-subjects',
  },
  /**
   * Central Raqeem Messaging business event — exact POST only.
   * Do not widen to an integrations family and do not inject active_school_id into
   * its strict JSON body. Odoo resolves trusted tenant/school context itself.
   */
  {
    methods: ['POST'],
    test: (p) => p === '/admin/integrations/raqeem/messaging/account-activation',
  },
  {
    methods: ['POST'],
    test: (p) => p === '/admin/integrations/raqeem/messaging/account-activation-link',
  },
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
  /** B4 portal channel recipient preview — POST only (advisory, no write). */
  {
    methods: ['POST'],
    test: (p) => /^\/channels\/[^/]+\/messages\/recipient-preview$/.test(p),
  },
  {
    methods: ['POST'],
    test: (p) => /^\/channels\/[^/]+\/messages\/upload-sessions\/[^/]+\/finalize$/.test(p),
  },
  /**
   * B4 staff communication content recipient preview only.
   * Narrow allowlist — not a general /staff/* family.
   */
  {
    methods: ['POST'],
    test: (p) => /^\/staff\/communication\/content\/[^/]+\/recipient-preview$/.test(p),
  },
  /** Assigned administrative requests — narrow staff inbox, never a general /staff/* family. */
  {
    methods: ['GET', 'HEAD'],
    test: (p) => /^\/staff\/admin-requests(?:\/[^/]+)?$/.test(p),
  },
  {
    methods: ['POST'],
    test: (p) => /^\/staff\/admin-requests\/[^/]+\/reply$/.test(p),
  },
  {
    methods: ['GET', 'HEAD'],
    test: (p) => /^\/attachments\/[^/]+\/(?:download|preview|thumbnail)$/.test(p),
  },
  { methods: ['POST'], test: (p) => p === '/attachments/upload-sessions' },
  {
    methods: ['GET', 'HEAD'],
    test: (p) => /^\/attachments\/upload-sessions\/[^/]+$/.test(p),
  },
  {
    methods: ['POST'],
    test: (p) => /^\/attachments\/upload-sessions\/[^/]+\/(?:files|links|cancel)$/.test(p),
  },
  {
    methods: ['DELETE'],
    test: (p) => /^\/attachments\/upload-sessions\/[^/]+\/materials\/[^/]+$/.test(p),
  },
  {
    methods: ['GET', 'HEAD'],
    test: (p) => /^\/attachments\/upload-sessions\/[^/]+\/materials\/[^/]+\/(?:download|preview|thumbnail)$/.test(p),
  },
  /**
   * Governed announcement recipient APIs (Odoo 5D2B / 18.0.1.0.247).
   * Published-only deliveries; Backend enforces audience + active role.
   */
  {
    methods: ['GET', 'HEAD'],
    test: (p) => /^\/communication\/announcements(?:\/[^/]+)?$/.test(p),
  },
  {
    methods: ['POST'],
    test: (p) => /^\/communication\/announcements\/[^/]+\/read$/.test(p),
  },
  {
    methods: ['GET', 'HEAD'],
    test: (p) =>
      /^\/communication\/announcements\/[^/]+\/attachments\/[^/]+\/download$/.test(p),
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
 * Admin channel lifecycle create / update / delete / archive / restore only.
 * Odoo 18.0.1.0.253 channel allowlists reject active_school_id in the JSON body;
 * school scope stays on query + session. Must not use startsWith('/admin/channels')
 * so messages, recipient-preview, and other nested routes keep prior injection.
 */
export function isAdminChannelLifecycleMutationPath(pathname: string): boolean {
  const path = normalizePolicyPath(pathname);
  return (
    /^\/admin\/channels$/.test(path) ||
    /^\/admin\/channels\/\d+$/.test(path) ||
    /^\/admin\/channels\/\d+\/(?:archive|restore)$/.test(path)
  );
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
  // Odoo 236 subject enablement update — strict body allowlist (no active_school_id).
  // School scope remains on the query string + session.
  if (/^\/admin\/subjects\/enablement\/update$/.test(pathname)) return false;
  // Academic term writes — Odoo school.term create/update reject unknown body keys
  // (active_school_id). Year/term ids + session/query carry tenant school scope.
  // Exact path only: do not match /terms/initialize or other *terms* families.
  if (/^\/admin\/academic-years\/[^/]+\/terms$/.test(pathname)) return false;
  if (/^\/admin\/academic-setup\/terms\/[^/]+$/.test(pathname)) return false;
  // Selective family conversion — body is idempotency_key + application_ids only.
  // School scope remains on the query string + session.
  if (/^\/admin\/admissions\/family-batches\/[^/]+\/convert-to-students$/.test(pathname)) {
    return false;
  }
  // Campaign preparation accepts an optional name only; school scope stays trusted in query/session.
  if (/^\/admin\/parent-activation-campaigns\/prepare$/.test(pathname)) return false;
  // Channel lifecycle — query/session scope only; no body injection.
  if (isAdminChannelLifecycleMutationPath(pathname)) return false;
  return true;
}
