// @vitest-environment happy-dom

import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EntryRequirementAdoptDialog } from './entry-requirement-adopt-dialog';
import { EntryRequirementCatalog } from './entry-requirement-catalog';
import type {
  RequirementItem,
  RequirementList,
} from '@/features/entry-requirements/entry-requirements-contract';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

const textbook: RequirementItem = {
  id: 40,
  stable_key: 'book-40',
  sequence: 10,
  item_type: 'textbook',
  name: 'المنير في اللغة العربية',
  title: 'المنير في اللغة العربية',
  quantity: 1,
  subject_id: 7,
  subject: 'اللغة العربية',
  importance: 'required',
  provision_source: 'family',
  provided_by_school: false,
  reusable_allowed: null,
  reusable: false,
  notes: null,
  needs_resolution: true,
  publisher: 'دار النشر المدرسي',
  edition: '2026',
  isbn: null,
  teaching_offering_id: null,
  teaching_reference_id: null,
};

const list: RequirementList = {
  id: 5,
  school_id: 3,
  name: 'تجهيزات الدخول المدرسي',
  state: 'draft',
  revision: 1,
  is_current: false,
  supersedes_id: null,
  published_at: null,
  active: true,
  notes: null,
  academic_year_id: 2,
  academic_year: '2026/2027',
  level_id: 6,
  level: 'السادس ابتدائي',
  class_id: null,
  class_name: null,
  track_id: null,
  track: null,
  item_count: 1,
  items: [textbook],
};

function LinkFlowHarness() {
  const [adoptItemId, setAdoptItemId] = useState<number | null>(null);
  const adoptItem = list.items?.find((item) => item.id === adoptItemId) ?? null;

  return (
    <>
      <EntryRequirementCatalog
        items={list.items ?? []}
        canManage
        editable
        onLink={(item) => setAdoptItemId(item.id)}
        onManualLink={() => undefined}
        onDelete={() => undefined}
      />
      {adoptItem ? (
        <EntryRequirementAdoptDialog
          open
          list={list}
          item={adoptItem}
          subjects={[{ id: 7, name: 'اللغة العربية' }]}
          onClose={() => setAdoptItemId(null)}
          onSuccess={() => undefined}
        />
      ) : null}
    </>
  );
}

describe('Entry Requirements link modal', () => {
  it('opens the modal immediately when the visible ربط button is clicked', () => {
    render(<LinkFlowHarness />);

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ربط' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('ربط الكتاب بالمقرر')).toBeTruthy();
    expect(screen.getAllByText('المنير في اللغة العربية').length).toBeGreaterThan(0);
    expect(screen.getByText('السادس ابتدائي')).toBeTruthy();
    expect(screen.getAllByText('اللغة العربية').length).toBeGreaterThan(0);
  });
});
