import { describe, expect, it } from 'vitest';
import {
  envelopeExposesPayload,
  normalizeArchiveList,
  normalizeClosurePreview,
  normalizeExportRequest,
  normalizeOfficialPublication,
  normalizeReviewQueuePayload,
  normalizeTeacherClosureStatus,
} from './normalize-review-publication';
import {
  documentTypeMessageKey,
  exportFormatMessageKey,
  reviewStateMessageKey,
} from './review-publication-labels';
import { teachingStage9ErrorMessageKey } from './review-publication-errors';
import {
  buildAdminReviewPublicationHref,
  buildTeacherReviewPublicationHref,
  safeInternalReturnTo,
} from './review-publication-url';
import { TEACHING_EXPORT_FORMATS } from '@/types/teaching-review-publication';

describe('teaching stage 9 normalization', () => {
  it('normalizes review queue envelope with counts and allowed actions', () => {
    const payload = normalizeReviewQueuePayload({
      data: {
        items: [
          {
            document_type: 'homework',
            document_id: 12,
            title: 'HW',
            review_state: 'correction_requested',
            correction_requested: true,
            latest_correction_reason: 'Fix date',
            officially_published: false,
            allowed_actions: {
              mark_reviewed: false,
              request_changes: true,
              approve_official: false,
              view_versions: true,
            },
          },
        ],
        pagination: { page: 1, page_size: 50, total: 1, has_more: false },
        counts: {
          by_document_type: { homework: 1 },
          pending_review: 0,
          correction_requested: 1,
          reviewed_not_officially_published: 0,
          officially_published: 0,
          zero_state: false,
        },
      },
    });
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]?.latest_correction_reason).toBe('Fix date');
    expect(payload.counts.correction_requested).toBe(1);
    expect(payload.items[0]?.allowed_actions.approve_official).toBe(false);
  });

  it('strips payload from official publication detail', () => {
    const pub = normalizeOfficialPublication(
      {
        id: 9,
        publication_no: 'PUB-1',
        document_type: 'homework',
        status: 'approved',
        payload: { secret: true },
        payload_json: '{"secret":true}',
        events: [{ id: 1, event_type: 'approved', actor_id: 2, event_at: '2026-01-01' }],
      },
      { includeEvents: true },
    );
    expect(pub?.publication_no).toBe('PUB-1');
    expect(Object.prototype.hasOwnProperty.call(pub, 'payload')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(pub, 'payload_json')).toBe(false);
    expect(pub?.events).toHaveLength(1);
  });

  it('normalizes archive without payload_json', () => {
    const archive = normalizeArchiveList({
      items: [
        {
          id: 3,
          publication_no: 'PUB-3',
          document_type: 'class_journal',
          status: 'archived',
          locales_available: ['ar', 'fr'],
          allowed_actions: { download: true, view: true, archive: false },
          payload_json: '{"no":"list"}',
        },
      ],
      pagination: { page: 1, page_size: 50, total: 1 },
    });
    expect(archive.items[0]?.locales_available).toEqual(['ar', 'fr']);
    expect(envelopeExposesPayload(archive.items[0])).toBe(false);
  });

  it('normalizes export statuses and supported formats only in UI constant', () => {
    const req = normalizeExportRequest({
      id: 4,
      export_type: 'csv',
      status: 'ready',
      download_ready: true,
      document_types: ['homework'],
    });
    expect(req?.download_ready).toBe(true);
    expect(TEACHING_EXPORT_FORMATS).toEqual(['pdf', 'csv', 'zip', 'json_audit']);
    expect(TEACHING_EXPORT_FORMATS).not.toContain('xlsx');
    expect(exportFormatMessageKey('xlsx')).toBe(
      'teachingReviewPublication.exportFormats.unknown',
    );
  });

  it('normalizes closure preview blockers warnings and legacy flag', () => {
    const preview = normalizeClosurePreview({
      preview: {
        school_id: 1,
        academic_year_id: 2,
        scope_type: 'term',
        legacy_closed: true,
        legacy_kind: 'legacy_term',
        warnings: [{ code: 'homework_drafts', count: 2 }],
        hard_blockers: [{ code: 'teaching_period_hard_blockers', message: 'integrity' }],
      },
      preview_checksum: 'abc',
      warning_count: 1,
      blocker_count: 1,
      can_close: false,
    });
    expect(preview?.can_close).toBe(false);
    expect(preview?.preview.legacy_closed).toBe(true);
    expect(preview?.preview.hard_blockers[0]?.code).toBe('teaching_period_hard_blockers');
  });

  it('normalizes teacher closure status read-only payload', () => {
    const status = normalizeTeacherClosureStatus({
      closed: true,
      legacy_closed: false,
      kind: 'teaching_closure',
      academic_year_id: 2,
      teacher_id: 8,
      closure: {
        id: 1,
        state: 'closed',
        closure_revision: 2,
        scope_type: 'term',
      },
    });
    expect(status.closed).toBe(true);
    expect(status.closure?.closure_revision).toBe(2);
  });
});

describe('teaching stage 9 labels and errors', () => {
  it('maps enums to message keys and never returns raw enum as key', () => {
    expect(documentTypeMessageKey('homework')).toContain('homework');
    expect(reviewStateMessageKey('correction_requested')).toContain('correctionRequested');
    expect(teachingStage9ErrorMessageKey('teaching_export_expired')).toContain('exportExpired');
    expect(teachingStage9ErrorMessageKey('unknown_code')).toContain('generic');
  });
});

describe('teaching stage 9 urls', () => {
  it('validates ids and blocks open redirects', () => {
    expect(safeInternalReturnTo('https://evil.example')).toBeNull();
    expect(safeInternalReturnTo('//evil')).toBeNull();
    expect(safeInternalReturnTo('/teacher/teaching/planning')).toBe(
      '/teacher/teaching/planning',
    );
    expect(
      buildAdminReviewPublicationHref({
        academicYearId: '12',
        tab: 'closure',
        page: 2,
        documentType: 'homework',
      }),
    ).toContain('academic_year_id=12');
    expect(
      buildTeacherReviewPublicationHref({
        documentType: 'homework',
        documentId: 5,
        returnTo: '/admin/finance',
      }),
    ).not.toContain('return_to=/admin/finance');
  });
});
