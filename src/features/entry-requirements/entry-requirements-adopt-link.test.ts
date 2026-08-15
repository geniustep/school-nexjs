import { describe, expect, it } from 'vitest';

import {
  buildAdoptTextbookAndLinkPayload,
  parseAdoptAmbiguity,
  shouldShowAdoptTextbookAction,
} from './entry-requirements-adopt-link';

describe('entry requirement adopt-and-link UI contract', () => {
  it('shows the preferred action for every unresolved textbook, even when an offering is already linked', () => {
    expect(shouldShowAdoptTextbookAction({ item_type: 'textbook', needs_resolution: true })).toBe(true);
    expect(shouldShowAdoptTextbookAction({ item_type: 'textbook', needs_resolution: false })).toBe(false);
    expect(shouldShowAdoptTextbookAction({ item_type: 'notebook', needs_resolution: true })).toBe(false);
  });

  it('builds only positive confirmed identifiers into the backend payload', () => {
    expect(buildAdoptTextbookAndLinkPayload({
      subjectId: '211',
      teachingLanguageId: '3',
      confirmReferenceId: '546',
      confirmOfferingId: '547',
    })).toEqual({
      subject_id: 211,
      teaching_language_id: 3,
      confirm_reference_id: 546,
      confirm_offering_id: 547,
    });

    expect(buildAdoptTextbookAndLinkPayload({
      subjectId: '',
      teachingLanguageId: 0,
      confirmReferenceId: null,
      confirmOfferingId: undefined,
    })).toEqual({});
  });

  it('preserves reference candidates returned by Odoo 316', () => {
    const ambiguity = parseAdoptAmbiguity('entry_requirement_ambiguous_reference', {
      candidate_type: 'teaching_reference',
      candidates: [{
        id: 546,
        title: 'كتابي في اللغة العربية',
        publisher: null,
        edition: null,
        isbn: null,
        state: 'approved',
        subject_id: 211,
        subject: 'اللغة العربية',
        level_id: 2446,
        level: 'السادسة ابتدائي',
        teaching_language_id: 3,
        teaching_language: 'العربية',
        track_id: null,
        track: null,
      }],
    });

    expect(ambiguity?.kind).toBe('reference');
    expect(ambiguity?.candidates.map((row) => row.id)).toEqual([546]);
  });

  it('preserves offering candidates returned by Odoo 316', () => {
    const ambiguity = parseAdoptAmbiguity('entry_requirement_ambiguous_offering', {
      candidate_type: 'teaching_offering',
      candidates: [{
        id: 547,
        state: 'draft',
        academic_year_id: 1,
        academic_year: '2026-2027',
        level_id: 2446,
        level: 'السادسة ابتدائي',
        subject_id: 211,
        subject: 'اللغة العربية',
        teaching_language_id: 3,
        teaching_language: 'العربية',
        track_id: null,
        track: null,
        reference: {
          id: 546,
          title: 'كتابي في اللغة العربية',
          publisher: null,
          edition: null,
          isbn: null,
        },
      }],
    });

    expect(ambiguity?.kind).toBe('offering');
    expect(ambiguity?.candidates.map((row) => row.id)).toEqual([547]);
  });

  it('keeps candidate-limit failures fail-closed', () => {
    expect(parseAdoptAmbiguity('entry_requirement_ambiguous_reference', {
      candidate_type: 'teaching_reference',
      candidates: [],
      candidate_limit_exceeded: true,
    })).toEqual({
      kind: 'reference',
      candidates: [],
      candidateLimitExceeded: true,
    });
  });

  it('does not interpret unrelated errors as a picker contract', () => {
    expect(parseAdoptAmbiguity('entry_requirement_offering_reference_conflict', {
      candidate_type: 'teaching_offering',
      candidates: [{ id: 1 }],
    })).toBeNull();
  });
});
