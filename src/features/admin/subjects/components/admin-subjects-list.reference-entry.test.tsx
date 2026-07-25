// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminSubjectsList } from './admin-subjects-list';

const sessionUser = vi.hoisted(() =>
  vi.fn(() => ({
    id: 1,
    name: 'Admin',
    email: null,
    role: 'admin' as const,
    permissions: ['manage_classes', 'view_classes', 'export_data', 'import_data'],
    school: { id: 1, name: 'مدرسة' },
    effective_capabilities: [] as string[],
  })),
);

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionUser(),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
  useLocale: () => ({ locale: 'ar' }),
}));

vi.mock('@/features/admin/subject-enablement/components/subject-levels-enablement-drawer', () => ({
  SubjectLevelsEnablementDrawer: () => null,
}));

vi.mock('@/features/admin/csv-import-panel', () => ({
  CsvImportPanel: () => null,
}));

vi.mock('@/features/admin/export-button', () => ({
  ExportButton: () => null,
}));

describe('AdminSubjectsList reference entry', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps operational add and hides reference add without capability', () => {
    sessionUser.mockImplementation(() => ({
      id: 1,
      name: 'Mgr',
      email: null,
      role: 'admin' as const,
      permissions: ['manage_classes', 'view_classes', 'export_data', 'import_data'],
      school: { id: 1, name: 'مدرسة' },
      admin_kind: 'school_manager',
      effective_capabilities: [],
    }));

    render(<AdminSubjectsList subjects={[]} levels={[]} />);
    const operationalLinks = screen
      .getAllByRole('link', { name: 'admin.addSubject' })
      .map((el) => el.getAttribute('href'));
    expect(operationalLinks.every((href) => href === '/admin/subjects/new')).toBe(true);
    expect(screen.queryByText('admin.referenceSubjects.add')).toBeNull();
  });

  it('shows reference secondary link when capability is present', () => {
    sessionUser.mockImplementation(() => ({
      id: 1,
      name: 'PM',
      email: null,
      role: 'admin' as const,
      permissions: ['manage_classes', 'view_classes', 'export_data', 'import_data'],
      school: { id: 1, name: 'مدرسة' },
      effective_capabilities: ['reference.subject.manage'],
    }));

    render(<AdminSubjectsList subjects={[]} levels={[]} />);
    expect(
      screen.getAllByRole('link', { name: 'admin.addSubject' }).some(
        (el) => el.getAttribute('href') === '/admin/subjects/new',
      ),
    ).toBe(true);
    expect(
      screen.getByRole('link', { name: 'admin.referenceSubjects.add' }).getAttribute('href'),
    ).toBe('/admin/subjects/reference/new');
  });
});
