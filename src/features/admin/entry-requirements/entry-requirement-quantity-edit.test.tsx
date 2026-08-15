// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EntryRequirementCatalog } from './entry-requirement-catalog';
import type { RequirementItem } from '@/features/entry-requirements/entry-requirements-contract';

const notebook: RequirementItem = {
  id: 34,
  stable_key: 'notebook-34',
  sequence: 1,
  item_type: 'notebook',
  name: 'دفتر من فئة 96 صفحة',
  quantity: 2,
  subject_id: null,
  subject: null,
  importance: 'required',
  provision_source: 'family',
  provided_by_school: false,
  reusable_allowed: null,
  reusable: false,
  notes: null,
  needs_resolution: false,
};

afterEach(cleanup);

describe('Entry Requirements quantity edit', () => {
  it('lets a manager update the quantity of a draft item', async () => {
    const onQuantityChange = vi.fn(async () => true);

    render(
      <EntryRequirementCatalog
        items={[notebook]}
        canManage
        editable
        onLink={() => undefined}
        onManualLink={() => undefined}
        onDelete={() => undefined}
        onQuantityChange={onQuantityChange}
        onCoverChange={async () => true}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'تعديل كمية دفتر من فئة 96 صفحة' }));
    const input = screen.getByRole('spinbutton', { name: 'كمية دفتر من فئة 96 صفحة' });
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(onQuantityChange).toHaveBeenCalledWith(notebook, 3));
    await waitFor(() => expect(screen.queryByRole('spinbutton')).toBeNull());
  });

  it('does not expose quantity editing on a non-editable list', () => {
    render(
      <EntryRequirementCatalog
        items={[notebook]}
        canManage
        editable={false}
        onLink={() => undefined}
        onManualLink={() => undefined}
        onDelete={() => undefined}
        onQuantityChange={async () => true}
        onCoverChange={async () => true}
      />,
    );

    expect(screen.queryByRole('button', { name: 'تعديل كمية دفتر من فئة 96 صفحة' })).toBeNull();
  });

  it('distributes a notebook quantity across multiple cover colors', async () => {
    const onCoverChange = vi.fn(async () => true);
    render(
      <EntryRequirementCatalog
        items={[notebook]}
        canManage
        editable
        onLink={() => undefined}
        onManualLink={() => undefined}
        onDelete={() => undefined}
        onQuantityChange={async () => true}
        onCoverChange={onCoverChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة غلاف لـ دفتر من فئة 96 صفحة' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'لون الغلاف 1 لـ دفتر من فئة 96 صفحة' }), {
      target: { value: 'أحمر' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'كمية الغلاف 1 لـ دفتر من فئة 96 صفحة' }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ لون آخر' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'لون الغلاف 2 لـ دفتر من فئة 96 صفحة' }), {
      target: { value: 'أزرق' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(onCoverChange).toHaveBeenCalledWith(notebook, [
      { color: 'أحمر', quantity: 1 },
      { color: 'أزرق', quantity: 1 },
    ]));
  });
});
