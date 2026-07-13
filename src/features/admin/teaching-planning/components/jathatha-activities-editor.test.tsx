// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { JathathaActivity } from '@/types/jathatha';

vi.mock('../teaching-planning.css', () => ({}));

import { JathathaActivitiesEditor } from './jathatha-activities-editor';

function activity(name = 'Introduction', order = 1, duration = 20): JathathaActivity {
  return {
    id: order,
    sequence_order: order,
    name,
    activity_type: 'situation',
    planned_duration_minutes: duration,
    instructions: 'Follow the prompt',
    phases: [{
      id: order * 10,
      sequence_order: 1,
      phase_type: 'action',
      planned_duration_minutes: 10,
      instruction: 'Work in pairs',
      teacher_activity: 'Guide learners',
    }],
  };
}

function renderEditor(
  value: JathathaActivity[] = [],
  options: Partial<React.ComponentProps<typeof JathathaActivitiesEditor>> = {},
) {
  const onChange = vi.fn();
  render(
    <LocaleProvider>
      <JathathaActivitiesEditor value={value} onChange={onChange} detailLevel="standard" {...options} />
    </LocaleProvider>,
  );
  return onChange;
}

describe('JathathaActivitiesEditor', () => {
  beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the empty state and adds an activity', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor();
    expect(screen.getByText('No activities yet.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add activity' }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: '', sequence_order: 1, phases: [] }),
    ]);
  });

  it('edits an activity name and deletes the activity', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([activity()]);
    const name = screen.getByDisplayValue('Introduction');
    fireEvent.change(name, { target: { value: 'Discovery' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: 'Discovery' }),
    ]);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('moves activities by accessible labels and renumbers sequence_order', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([activity('First', 9), activity('Second', 4)]);
    const moveDown = screen.getAllByRole('button', { name: 'Move down' });
    expect(moveDown[0]).toBeTruthy();
    await user.click(moveDown[0]);
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: 'Second', sequence_order: 1 }),
      expect.objectContaining({ name: 'First', sequence_order: 2 }),
    ]);
    expect(screen.getAllByRole('button', { name: 'Move up' })).toHaveLength(4);
  });

  it('adds and deletes a phase', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([activity()]);
    await user.click(screen.getByRole('button', { name: 'Add phase' }));
    expect(onChange.mock.calls.at(-1)?.[0][0].phases).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    expect(onChange.mock.calls.at(-1)?.[0][0].phases).toHaveLength(0);
  });

  it('reports phase duration overflow and total durations', () => {
    renderEditor([{
      ...activity('Timed', 1, 15),
      phases: [
        { sequence_order: 1, phase_type: 'action', planned_duration_minutes: 10 },
        { sequence_order: 2, phase_type: 'practice', planned_duration_minutes: 10 },
      ],
    }]);
    expect(screen.getByRole('status').textContent).toContain('Phase durations exceed the activity duration.');
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
  });

  it('varies fields by detail level and preserves directional inputs', () => {
    const row = activity();
    const { rerender } = render(
      <LocaleProvider><JathathaActivitiesEditor value={[row]} detailLevel="compact" /></LocaleProvider>,
    );
    expect(screen.queryByText('Instructions')).toBeNull();
    expect(screen.getAllByRole('textbox')).toSatisfy((fields) => fields.every((field) => field.getAttribute('dir') === 'auto'));
    expect(screen.getAllByRole('spinbutton')).toSatisfy((fields) => fields.every((field) => field.getAttribute('dir') === 'ltr'));

    rerender(<LocaleProvider><JathathaActivitiesEditor value={[row]} detailLevel="standard" /></LocaleProvider>);
    expect(screen.getByText('Instructions')).toBeTruthy();
    expect(screen.queryByText('Teacher activity')).toBeNull();

    rerender(<LocaleProvider><JathathaActivitiesEditor value={[row]} detailLevel="detailed" /></LocaleProvider>);
    expect(screen.getByText('Teacher activity')).toBeTruthy();
  });

  it('hides mutations in read-only mode and shows a source pointer when requested', () => {
    renderEditor([{ ...activity(), source_activity_id: 42 }], { readOnly: true, showSourcePointers: true });
    expect(screen.queryByRole('button', { name: 'Add activity' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move up' })).toBeNull();
    expect(screen.getByText('42')).toBeTruthy();
  });
});
