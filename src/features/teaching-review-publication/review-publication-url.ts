/**
 * Stage 9 workspace URL helpers — validated IDs, safe return_to, no sensitive content.
 */

import type {
  AdminReviewPublicationTab,
  TeacherReviewPublicationTab,
} from '@/types/teaching-review-publication';
import { TEACHING_DOCUMENT_TYPES } from '@/types/teaching-review-publication';

const ADMIN_TABS = new Set<AdminReviewPublicationTab>([
  'queue',
  'publications',
  'archive',
  'exports',
  'closure',
]);

const TEACHER_TABS = new Set<TeacherReviewPublicationTab>([
  'status',
  'publications',
  'print',
  'closure',
]);

const ALLOWED_RETURN_PREFIXES = [
  '/admin/teaching-planning',
  '/teacher/teaching',
  '/teacher/teaching-planning',
  '/teacher/teaching-progress',
  '/teacher/today',
  '/teacher/session',
  '/teacher/homeworks',
  '/teacher/jathathas',
  '/teacher/actual-deliveries',
  '/teacher/class-journal',
] as const;

function positiveId(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.trunc(n));
}

export function safeInternalReturnTo(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  const path = raw.split('?')[0] ?? raw;
  const allowed = ALLOWED_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? raw : null;
}

function documentTypeOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return (TEACHING_DOCUMENT_TYPES as readonly string[]).includes(raw) ? raw : null;
}

export type AdminReviewPublicationQuery = {
  academicYearId?: string | number | null;
  termId?: string | number | null;
  teacherId?: string | number | null;
  documentType?: string | null;
  reviewState?: string | null;
  status?: string | null;
  tab?: string | null;
  page?: string | number | null;
  documentId?: string | number | null;
  publicationId?: string | number | null;
  returnTo?: string | null;
};

export function buildAdminReviewPublicationHref(
  params: AdminReviewPublicationQuery = {},
): string {
  const q = new URLSearchParams();
  const academicYearId = positiveId(params.academicYearId);
  const termId = positiveId(params.termId);
  const teacherId = positiveId(params.teacherId);
  const documentId = positiveId(params.documentId);
  const publicationId = positiveId(params.publicationId);
  const page = positiveId(params.page);
  const documentType = documentTypeOrNull(params.documentType ?? null);
  const tab =
    params.tab && ADMIN_TABS.has(params.tab as AdminReviewPublicationTab)
      ? params.tab
      : null;
  if (academicYearId) q.set('academic_year_id', academicYearId);
  if (termId) q.set('term_id', termId);
  if (teacherId) q.set('teacher_id', teacherId);
  if (documentType) q.set('document_type', documentType);
  if (params.reviewState) q.set('review_state', params.reviewState);
  if (params.status) q.set('status', params.status);
  if (tab) q.set('tab', tab);
  if (page && page !== '1') q.set('page', page);
  if (documentId) q.set('document_id', documentId);
  if (publicationId) q.set('publication_id', publicationId);
  const returnTo = safeInternalReturnTo(params.returnTo ?? null);
  if (returnTo) q.set('return_to', returnTo);
  const qs = q.toString();
  return qs
    ? `/admin/teaching-planning/review-publication?${qs}`
    : '/admin/teaching-planning/review-publication';
}

export function parseAdminReviewPublicationQuery(
  search: URLSearchParams | { get(name: string): string | null },
): {
  academicYearId: string;
  termId: string;
  teacherId: string;
  documentType: string;
  reviewState: string;
  status: string;
  tab: AdminReviewPublicationTab;
  page: number;
  documentId: string;
  publicationId: string;
  returnTo: string | null;
} {
  const tabRaw = search.get('tab') ?? 'queue';
  const pageRaw = positiveId(search.get('page'));
  return {
    academicYearId: positiveId(search.get('academic_year_id')) ?? '',
    termId: positiveId(search.get('term_id')) ?? '',
    teacherId: positiveId(search.get('teacher_id')) ?? '',
    documentType: documentTypeOrNull(search.get('document_type')) ?? '',
    reviewState: search.get('review_state') ?? '',
    status: search.get('status') ?? '',
    tab: ADMIN_TABS.has(tabRaw as AdminReviewPublicationTab)
      ? (tabRaw as AdminReviewPublicationTab)
      : 'queue',
    page: pageRaw ? Number(pageRaw) : 1,
    documentId: positiveId(search.get('document_id')) ?? '',
    publicationId: positiveId(search.get('publication_id')) ?? '',
    returnTo: safeInternalReturnTo(search.get('return_to')),
  };
}

export type TeacherReviewPublicationQuery = {
  academicYearId?: string | number | null;
  termId?: string | number | null;
  documentType?: string | null;
  documentId?: string | number | null;
  publicationId?: string | number | null;
  tab?: string | null;
  page?: string | number | null;
  returnTo?: string | null;
};

export function buildTeacherReviewPublicationHref(
  params: TeacherReviewPublicationQuery = {},
): string {
  const q = new URLSearchParams();
  const academicYearId = positiveId(params.academicYearId);
  const termId = positiveId(params.termId);
  const documentId = positiveId(params.documentId);
  const publicationId = positiveId(params.publicationId);
  const page = positiveId(params.page);
  const documentType = documentTypeOrNull(params.documentType ?? null);
  const tab =
    params.tab && TEACHER_TABS.has(params.tab as TeacherReviewPublicationTab)
      ? params.tab
      : null;
  if (academicYearId) q.set('academic_year_id', academicYearId);
  if (termId) q.set('term_id', termId);
  if (documentType) q.set('document_type', documentType);
  if (documentId) q.set('document_id', documentId);
  if (publicationId) q.set('publication_id', publicationId);
  if (tab) q.set('tab', tab);
  if (page && page !== '1') q.set('page', page);
  const returnTo = safeInternalReturnTo(params.returnTo ?? null);
  if (returnTo) q.set('return_to', returnTo);
  const qs = q.toString();
  return qs
    ? `/teacher/teaching/review-publication?${qs}`
    : '/teacher/teaching/review-publication';
}

export function parseTeacherReviewPublicationQuery(
  search: URLSearchParams | { get(name: string): string | null },
): {
  academicYearId: string;
  termId: string;
  documentType: string;
  documentId: string;
  publicationId: string;
  tab: TeacherReviewPublicationTab;
  page: number;
  returnTo: string | null;
} {
  const tabRaw = search.get('tab') ?? 'status';
  const pageRaw = positiveId(search.get('page'));
  return {
    academicYearId: positiveId(search.get('academic_year_id')) ?? '',
    termId: positiveId(search.get('term_id')) ?? '',
    documentType: documentTypeOrNull(search.get('document_type')) ?? '',
    documentId: positiveId(search.get('document_id')) ?? '',
    publicationId: positiveId(search.get('publication_id')) ?? '',
    tab: TEACHER_TABS.has(tabRaw as TeacherReviewPublicationTab)
      ? (tabRaw as TeacherReviewPublicationTab)
      : 'status',
    page: pageRaw ? Number(pageRaw) : 1,
    returnTo: safeInternalReturnTo(search.get('return_to')),
  };
}
