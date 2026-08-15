import type {
  RequirementItem,
  TeachingOfferingChoice,
} from '@/features/entry-requirements/entry-requirements-contract';

export type AdoptTextbookReferenceCandidate = {
  id: number;
  title: string | null;
  publisher: string | null;
  edition: string | null;
  isbn: string | null;
  state: string;
  subject_id: number;
  subject: string | null;
  level_id: number;
  level: string | null;
  teaching_language_id: number | null;
  teaching_language: string | null;
  track_id: number | null;
  track: string | null;
};

export type AdoptTextbookOfferingCandidate = {
  id: number;
  state: string;
  academic_year_id: number;
  academic_year: string | null;
  level_id: number;
  level: string | null;
  subject_id: number;
  subject: string | null;
  teaching_language_id: number | null;
  teaching_language: string | null;
  track_id: number | null;
  track: string | null;
  reference: {
    id: number | null;
    title: string | null;
    publisher: string | null;
    edition: string | null;
    isbn: string | null;
  };
};

export type AdoptTextbookAndLinkResult = {
  item: RequirementItem;
  reference: Record<string, unknown>;
  offering: TeachingOfferingChoice;
  reference_created: boolean;
  reference_reused: boolean;
  offering_created: boolean;
  offering_reused: boolean;
  already_linked: boolean;
};

export type AdoptTextbookAndLinkPayload = {
  subject_id?: number;
  teaching_language_id?: number;
  confirm_reference_id?: number;
  confirm_offering_id?: number;
};

export type AdoptAmbiguity =
  | {
      kind: 'reference';
      candidates: AdoptTextbookReferenceCandidate[];
      candidateLimitExceeded: boolean;
    }
  | {
      kind: 'offering';
      candidates: AdoptTextbookOfferingCandidate[];
      candidateLimitExceeded: boolean;
    };

function positiveInt(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function shouldShowAdoptTextbookAction(
  item: Pick<RequirementItem, 'item_type' | 'needs_resolution'>,
): boolean {
  return item.item_type === 'textbook' && item.needs_resolution;
}

export function buildAdoptTextbookAndLinkPayload(input: {
  subjectId?: string | number | null;
  teachingLanguageId?: string | number | null;
  confirmReferenceId?: string | number | null;
  confirmOfferingId?: string | number | null;
}): AdoptTextbookAndLinkPayload {
  const payload: AdoptTextbookAndLinkPayload = {};
  const subjectId = positiveInt(input.subjectId);
  const languageId = positiveInt(input.teachingLanguageId);
  const referenceId = positiveInt(input.confirmReferenceId);
  const offeringId = positiveInt(input.confirmOfferingId);
  if (subjectId) payload.subject_id = subjectId;
  if (languageId) payload.teaching_language_id = languageId;
  if (referenceId) payload.confirm_reference_id = referenceId;
  if (offeringId) payload.confirm_offering_id = offeringId;
  return payload;
}

export function parseAdoptAmbiguity(
  code: string,
  details: Record<string, unknown> | undefined,
): AdoptAmbiguity | null {
  if (!details) return null;
  const rawCandidates = Array.isArray(details.candidates) ? details.candidates : [];
  const candidateLimitExceeded = details.candidate_limit_exceeded === true;

  if (
    code === 'entry_requirement_ambiguous_reference'
    && details.candidate_type === 'teaching_reference'
  ) {
    return {
      kind: 'reference',
      candidates: rawCandidates as AdoptTextbookReferenceCandidate[],
      candidateLimitExceeded,
    };
  }

  if (
    code === 'entry_requirement_ambiguous_offering'
    && details.candidate_type === 'teaching_offering'
  ) {
    return {
      kind: 'offering',
      candidates: rawCandidates as AdoptTextbookOfferingCandidate[],
      candidateLimitExceeded,
    };
  }

  return null;
}
