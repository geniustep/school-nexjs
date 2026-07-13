// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { ReferenceJathathaDetail } from '@/types/jathatha';

vi.mock('../teaching-planning.css', () => ({}));

const createReferenceJathatha = vi.fn();
const updateReferenceJathatha = vi.fn();
vi.mock('../api/reference-jathathas-api', () => ({
  createReferenceJathatha: (...args: unknown[]) => createReferenceJathatha(...args),
  updateReferenceJathatha: (...args: unknown[]) => updateReferenceJathatha(...args),
}));

const fetchTeachingReferences = vi.fn();
vi.mock('../api/teaching-references-api', () => ({
  fetchTeachingReferences: (...args: unknown[]) => fetchTeachingReferences(...args),
}));

const fetchDidacticSequences = vi.fn();
const fetchDidacticSequence = vi.fn();
vi.mock('../api/didactic-sequences-api', () => ({
  fetchDidacticSequences: (...args: unknown[]) => fetchDidacticSequences(...args),
  fetchDidacticSequence: (...args: unknown[]) => fetchDidacticSequence(...args),
}));

import { ReferenceJathathaEditorDialog } from './reference-jathatha-dialogs';

function ok<T>(data: T) {
  return { success: true as const, data, meta: {} };
}

function sampleDetail(overrides: Partial<ReferenceJathathaDetail> = {}): ReferenceJathathaDetail {
  return {
    id: 42,
    name: 'Reference sheet',
    school: { id: 1, name: 'School' },
    reference: { id: 10, name: 'Book A' },
    sequence: { id: 20, name: 'Seq A' },
    session_template: { id: 30, name: 'Tpl A' },
    level: { id: 3, name: 'L6' },
    subject: { id: 4, name: 'Math' },
    teaching_language: null,
    track: null,
    default_detail_level: 'standard',
    activity_count: 0,
    phase_count: 0,
    planned_duration_minutes: 45,
    state: 'draft',
    version_label: 'v1',
    approved_at: null,
    activities: [],
    attachment_ids: [],
    blockers: [],
    warnings: [],
    ...overrides,
  };
}

async function openCreate() {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <LocaleProvider>
      <ReferenceJathathaEditorDialog open mode="create" onClose={onClose} onSaved={onSaved} />
    </LocaleProvider>,
  );
  await waitFor(() => expect(fetchTeachingReferences).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByRole('option', { name: 'Book A' })).toBeTruthy());
  return { onSaved, onClose };
}

describe('ReferenceJathathaEditorDialog', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    fetchTeachingReferences.mockResolvedValue(
      ok([
        { id: 10, name: 'Book A' },
        { id: 11, name: 'Book B' },
      ]),
    );
    fetchDidacticSequences.mockResolvedValue(
      ok([
        {
          id: 20,
          name: 'Seq A',
          reference: { id: 10, name: 'Book A' },
          school: { id: 1, name: 'S' },
          subject: { id: 4, name: 'Math' },
          level: { id: 3, name: 'L6' },
          teaching_language: null,
          track: null,
          unit: null,
          lesson: null,
          state: 'approved',
          active: true,
          expected_session_count: 1,
          session_template_count: 1,
          version_label: null,
          readiness: null,
        },
        {
          id: 21,
          name: 'Seq B other ref',
          reference: { id: 11, name: 'Book B' },
          school: { id: 1, name: 'S' },
          subject: { id: 4, name: 'Math' },
          level: { id: 3, name: 'L6' },
          teaching_language: null,
          track: null,
          unit: null,
          lesson: null,
          state: 'approved',
          active: true,
          expected_session_count: 1,
          session_template_count: 1,
          version_label: null,
          readiness: null,
        },
      ]),
    );
    fetchDidacticSequence.mockResolvedValue(
      ok({
        id: 20,
        name: 'Seq A',
        session_templates: [
          { id: 30, order: 1, name: 'Tpl A', session_type: 'lesson', expected_session_count: 1, objective: null, pages: null, completion_criteria: null, support_notes: null, active: true },
          { id: 31, order: 2, name: 'Tpl B', session_type: 'lesson', expected_session_count: 1, objective: null, pages: null, completion_criteria: null, support_notes: null, active: true },
        ],
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('opens create dialog and filters sequences by selected reference', async () => {
    const user = userEvent.setup();
    await openCreate();
    expect(screen.getByText('Create reference jathatha')).toBeTruthy();

    const referenceSelect = screen.getByLabelText(/^Teaching Reference$|^Reference$/i);
    await user.selectOptions(referenceSelect, '10');

    const sequenceSelect = screen.getByLabelText(/^Sequence$/i);
    expect(within(sequenceSelect).getByRole('option', { name: 'Seq A' })).toBeTruthy();
    expect(within(sequenceSelect).queryByRole('option', { name: 'Seq B other ref' })).toBeNull();
  });

  it('loads session templates after sequence selection without auto-selecting a template', async () => {
    const user = userEvent.setup();
    await openCreate();
    await user.selectOptions(screen.getByLabelText(/^Teaching Reference$|^Reference$/i), '10');
    await user.selectOptions(screen.getByLabelText(/^Sequence$/i), '20');
    await waitFor(() => expect(fetchDidacticSequence).toHaveBeenCalledWith('20'));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Tpl A' })).toBeTruthy());

    const templateSelect = screen.getByLabelText(/Session template/i) as HTMLSelectElement;
    expect(templateSelect.value).toBe('');
    expect(screen.getByRole('option', { name: 'Tpl B' })).toBeTruthy();
  });

  it('requires name/reference/sequence and keeps inputs after backend validation error', async () => {
    const user = userEvent.setup();
    await openCreate();
    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    expect(await screen.findByText(/Name, reference, and sequence are required/i)).toBeTruthy();
    expect(createReferenceJathatha).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Title$|^Name$|^العنوان$/i), 'My sheet');
    await user.selectOptions(screen.getByLabelText(/^Teaching Reference$|^Reference$/i), '10');
    await user.selectOptions(screen.getByLabelText(/^Sequence$/i), '20');
    createReferenceJathatha.mockResolvedValue({
      success: false,
      error: { code: 'reference_jathatha_context_mismatch', message: 'Context mismatch' },
      meta: {},
    });
    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    expect(await screen.findByText('Context mismatch')).toBeTruthy();
    expect((screen.getByLabelText(/^Title$|^Name$|^العنوان$/i) as HTMLInputElement).value).toBe('My sheet');
  });

  it('submits nested create payload once and prevents double submit', async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = await openCreate();
    await user.type(screen.getByLabelText(/^Title$|^Name$|^العنوان$/i), 'My sheet');
    await user.selectOptions(screen.getByLabelText(/^Teaching Reference$|^Reference$/i), '10');
    await user.selectOptions(screen.getByLabelText(/^Sequence$/i), '20');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Tpl A' })).toBeTruthy());
    await user.selectOptions(screen.getByLabelText(/Session template/i), '30');

    let resolveCreate: (value: unknown) => void = () => undefined;
    createReferenceJathatha.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const save = screen.getByRole('button', { name: /^Save$/i });
    await user.click(save);
    await user.click(save);
    expect(createReferenceJathatha).toHaveBeenCalledTimes(1);
    expect(createReferenceJathatha).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My sheet',
        teaching_reference_id: 10,
        didactic_sequence_id: 20,
        sequence_session_template_id: 30,
        default_detail_level: 'standard',
        activities: [],
      }),
    );

    resolveCreate(ok(sampleDetail({ name: 'My sheet' })));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('opens edit mode with initial values and patches via update API', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    updateReferenceJathatha.mockResolvedValue(ok(sampleDetail({ name: 'Updated sheet' })));
    render(
      <LocaleProvider>
        <ReferenceJathathaEditorDialog
          open
          mode="edit"
          initial={sampleDetail()}
          onClose={vi.fn()}
          onSaved={onSaved}
        />
      </LocaleProvider>,
    );
    await waitFor(() => expect(screen.getByDisplayValue('Reference sheet')).toBeTruthy());
    expect(screen.getByText('Edit reference jathatha')).toBeTruthy();
    await user.clear(screen.getByDisplayValue('Reference sheet'));
    await user.type(screen.getByLabelText(/^Title$|^Name$|^العنوان$/i), 'Updated sheet');
    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    await waitFor(() =>
      expect(updateReferenceJathatha).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ name: 'Updated sheet', teaching_reference_id: 10 }),
      ),
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
