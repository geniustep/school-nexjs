import { api } from '@/lib/api/client';
import {
  libraryEndpoints,
  type LibraryCirculationRow,
  type LibraryCopyAction,
  type LibraryCopyRow,
  type LibraryTitleRow,
} from './library-contract';
import type { LibraryTitleFormValues } from './title-form';
import type { PhysicalCopyFormValues } from './physical-copy-form';
import type { LibraryCopyEditValues } from './copy-edit-form';
import type { LibraryCheckoutValues } from './circulation-create-form';
import type { LibraryReturnValues } from './return-form';

export function toOdooDateTime(value: string): string {
  const normalized = value.trim().replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export async function createLibraryTitle(values: LibraryTitleFormValues) {
  return api.post<LibraryTitleRow>(libraryEndpoints.titles, {
    name: values.name.trim(),
    author_names: values.authors.trim() || undefined,
    publisher: values.publisher.trim() || undefined,
    isbn: values.isbn.trim() || undefined,
    default_circulation_policy: values.policy,
  });
}

export async function updateLibraryTitle(id: number, values: LibraryTitleFormValues) {
  return api.patch<LibraryTitleRow>(libraryEndpoints.title(id), {
    name: values.name.trim(),
    author_names: values.authors.trim() || undefined,
    publisher: values.publisher.trim() || undefined,
    isbn: values.isbn.trim() || undefined,
    default_circulation_policy: values.policy,
  });
}

export async function archiveLibraryTitle(id: number) {
  return api.post<LibraryTitleRow>(libraryEndpoints.archiveTitle(id));
}

export async function createLibraryCopy(values: PhysicalCopyFormValues) {
  return api.post<LibraryCopyRow>(libraryEndpoints.copies, {
    title_id: values.titleId,
    accession_code: values.accession.trim(),
    barcode: values.barcode.trim() || undefined,
    shelf_location: values.shelf.trim() || undefined,
  });
}

export async function updateLibraryCopy(copyId: number, values: LibraryCopyEditValues) {
  return api.patch<LibraryCopyRow>(libraryEndpoints.copy(copyId), {
    barcode: values.barcode.trim() || false,
    shelf_location: values.shelf.trim() || false,
    circulation_policy: values.policy,
    condition: values.condition,
  });
}

const lifecyclePath: Record<LibraryCopyAction, string> = {
  mark_lost: 'mark-lost',
  mark_damaged: 'mark-damaged',
  send_to_repair: 'send-to-repair',
  restore: 'restore',
  withdraw: 'withdraw',
};

export async function runLibraryCopyAction(copyId: number, action: LibraryCopyAction) {
  return api.post<LibraryCopyRow>(
    libraryEndpoints.copyAction(copyId, lifecyclePath[action]),
    action === 'restore' ? { condition: 'good' } : undefined,
  );
}

export async function checkoutLibraryStudent(copyId: number, values: LibraryCheckoutValues) {
  return api.post<{ circulation: LibraryCirculationRow; copy: LibraryCopyRow }>(
    libraryEndpoints.checkout(copyId),
    {
      student_id: values.studentId,
      due_at: toOdooDateTime(values.dueAt),
      notes: values.notes.trim() || undefined,
    },
  );
}

export async function returnLibraryLoan(loanId: number, values: LibraryReturnValues) {
  return api.post<{ circulation: LibraryCirculationRow; copy: LibraryCopyRow }>(
    libraryEndpoints.returnLoan(loanId),
    {
      return_condition: values.returnCondition,
      notes: values.notes.trim() || undefined,
    },
  );
}
