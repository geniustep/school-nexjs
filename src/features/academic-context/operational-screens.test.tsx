// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ACADEMIC_CONTEXT_SELECTION } from '@/features/academic-context/utils/academic-context-reset';
import { baseOptions, makeController } from '@/features/academic-context/test-helpers';
import { AcademicContextFilters } from '@/features/academic-context/components/academic-context-filters';
import { GradebooksListFilters } from '@/features/admin/gradebooks/components/gradebooks-list-filters';
import { ExamsListFilters } from '@/features/admin/exams/components/exams-list-filters';
import { TeachingPlanningAcademicListFilters } from '@/features/admin/teaching-planning/components/teaching-planning-academic-list-filters';
import { AssignmentFormDrawer } from '@/features/admin/academic-setup/components/assignment-form-drawer';
import type { TeachingAssignment } from '@/types/academic-setup';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, vars?: Record<string, string>) => {
    if (vars?.language) return `${key}:${vars.language}`;
    if (vars?.className) return `${key}:${vars.className}`;
    if (vars?.status) return `${key}:${vars.status}`;
    if (vars?.count) return `${key}:${vars.count}`;
    return key;
  },
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    role: 'admin',
    effective_capabilities: [
      'academic.context.view',
      'teaching.offerings.manage',
      'teaching.references.manage',
    ],
    permissions: ['view_classes', 'view_teachers', 'manage_classes', 'manage_teachers'],
  }),
}));

vi.mock('@/lib/permissions/teaching-planning', () => ({
  canManageTeachingOfferings: () => true,
  canManageTeachingReferences: () => true,
}));

vi.mock('@/features/academic-context/hooks/use-academic-context-options', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/academic-context/hooks/use-academic-context-options')
  >('@/features/academic-context/hooks/use-academic-context-options');
  return {
    ...actual,
    useAcademicContextOptions: (args: {
      enabled?: boolean;
      initialSelection?: Record<string, string>;
      selection?: Record<string, string>;
      onSelectionChange?: (next: Record<string, string>) => void;
      scope?: string;
    }) => {
      if (args?.enabled === false) {
        return makeController({
          selection: {
            ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
            ...(args.selection as object),
          },
        });
      }
      // Assignment / page hooks: return scoped offerings for class+subject
      return makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          classId: args.initialSelection?.classId ?? '40',
          subjectId: args.initialSelection?.subjectId ?? '11',
          offeringId: args.initialSelection?.offeringId ?? '',
          academicYearId: args.selection?.academicYearId ?? args.initialSelection?.academicYearId ?? '',
          termId: args.selection?.termId ?? '',
          levelId: args.selection?.levelId ?? args.initialSelection?.levelId ?? '5',
          ...(args.selection as object),
        },
        setField: vi.fn((field: string, value: string) => {
          args.onSelectionChange?.({
            ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
            ...args.selection,
            ...args.initialSelection,
            [`${field}Id`.replace(/IdId$/, 'Id')]: value,
          } as never);
        }),
        options: baseOptions({
          teaching_languages: [{ id: 9, name: 'العربية', code: 'ar_001' }],
        }),
      });
    },
  };
});

vi.mock('@/features/admin/teachers/components/eligible-teachers-picker', () => ({
  EligibleTeachersPicker: ({
    onChange,
  }: {
    onChange: (next: { teacherId: number | null; override: boolean; overrideReason: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ teacherId: 3, override: false, overrideReason: '' })}
    >
      pick-eligible-teacher
    </button>
  ),
  eligibleTeachersSelectionValid: (input: {
    teacherId: number | null;
    override: boolean;
    overrideReason: string;
  }) =>
    input.teacherId != null &&
    (!input.override || Boolean(input.overrideReason.trim())),
}));

vi.mock('@/features/admin/academic-setup/components/setup-drawer', () => ({
  SetupDrawer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('@/features/admin/teaching-planning/components/teaching-planning-list-search', () => ({
  TeachingPlanningListSearch: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input aria-label="search" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

afterEach(() => cleanup());

describe('Global academic year with year-scoped term selectors', () => {
  it('GradebooksListFilters hides the duplicate year selector and keeps term', () => {
    render(
      <GradebooksListFilters
        academicYearId="1"
        termId="31"
        classId=""
        subjectId=""
        offeringId=""
        stateFilter=""
        hasActiveFilters
        onTermIdChange={vi.fn()}
        onClassIdChange={vi.fn()}
        onSubjectIdChange={vi.fn()}
        onOfferingIdChange={vi.fn()}
        onStateFilterChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('academicContext.fields.academicYear')).toBeNull();
    expect(screen.getByLabelText('academicContext.fields.term')).toBeTruthy();
  });

  it('ExamsListFilters hides the duplicate year selector and keeps term', () => {
    render(
      <ExamsListFilters
        classId="40"
        academicYearId="1"
        termId="31"
        stateFilter=""
        classes={[{ id: 40, name: '6A', code: '6A', academic_year: null, student_count: 0, capacity: null, teachers: [], subjects: [], status: 'active', level: null }]}
        hasActiveFilters
        onClassIdChange={vi.fn()}
        onAcademicYearIdChange={vi.fn()}
        onTermIdChange={vi.fn()}
        onStateFilterChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('academicContext.fields.academicYear')).toBeNull();
    expect(screen.getByLabelText('academicContext.fields.term')).toBeTruthy();
  });
});

describe('Assignment form academic context', () => {
  const assignment: TeachingAssignment = {
    id: 9,
    school: { id: 1, name: 'School' },
    class: { id: 40, name: '6A', level_id: 5, level_name: 'السادس' },
    subject: { id: 11, name: 'الرياضيات', code: 'MATH' },
    teacher: { id: 3, name: 'Teacher' },
    weekly_hours: 2,
    role: 'main',
    state: 'active',
    active: true,
    teaching_offering_id: null,
    teaching_offering: null,
  };

  it('shows scoped offerings, blocks create on ambiguity without selection, and includes teaching_offering_id', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onUpdate = vi.fn();
    render(
      <AssignmentFormDrawer
        open
        onClose={vi.fn()}
        assignment={null}
        classes={[]}
        subjects={[]}
        missingIssue={{
          code: 'assignment_missing',
          severity: 'warning',
          title: 'Missing',
          message: 'Missing',
          target: { section: 'assignments', query: { class_id: 40, subject_id: 11 } },
        } as never}
        canManage
        saving={false}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('academicContext.fields.offering')).toBeTruthy(),
    );
    const offering = screen.getByLabelText('academicContext.fields.offering') as HTMLSelectElement;
    expect(offering.value).toBe('');
    expect(offering.textContent).toContain('الرياضيات · السادس · العربية');
    expect(offering.textContent).toContain('Mathématiques · 6AP · Français');
    expect(screen.getByText('academicContext.hints.ambiguousOfferings')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/res\.lang|endpoints\.admin\.subjects/);

    const confirm = screen.getByRole('button', {
      name: 'admin.academicSetup.confirmAssignment',
    });
    await user.click(confirm);
    expect(onCreate).not.toHaveBeenCalled();

    await user.click(screen.getByText('pick-eligible-teacher'));
    await user.click(confirm);
    expect(onCreate).not.toHaveBeenCalled();

    await user.selectOptions(offering, '100');
    await user.click(confirm);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        class_id: 40,
        subject_id: 11,
        teacher_id: 3,
        teaching_offering_id: 100,
      }),
    );
  });

  it('allows legacy assignment edit without forcing offering immediately', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <AssignmentFormDrawer
        open
        onClose={vi.fn()}
        assignment={assignment}
        classes={[]}
        subjects={[]}
        missingIssue={null}
        canManage
        saving={false}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('academicContext.hints.legacyMissingOffering')).toBeTruthy();
    const save = await screen.findByRole('button', {
      name: 'admin.academicSetup.confirmAssignment',
    });
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    await user.click(save);
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
  });
});

describe('Teaching Planning operational filters', () => {
  it('renders hierarchical Academic Context and never all-subjects endpoint text', async () => {
    const user = userEvent.setup();
    const onSubjectIdChange = vi.fn();
    render(
      <TeachingPlanningAcademicListFilters
        search=""
        stateFilter=""
        levelId="5"
        subjectId=""
        stateOptions={[{ value: 'approved', label: 'Approved' }]}
        hasActiveFilters
        onSearchChange={vi.fn()}
        onSearchClear={vi.fn()}
        onStateFilterChange={vi.fn()}
        onLevelIdChange={vi.fn()}
        onSubjectIdChange={onSubjectIdChange}
        onReset={vi.fn()}
      />,
    );
    expect(document.getElementById('test-level') || screen.getByText('academicContext.fields.level')).toBeTruthy();
    expect(screen.getByText('academicContext.fields.subject')).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/endpoints\.admin\.subjects|res\.lang/);
    const subject = document.querySelector('select.academic-context-filters__select') as HTMLSelectElement | null;
    // Subject select exists among academic context selects
    const selects = Array.from(
      document.querySelectorAll('select.academic-context-filters__select'),
    ) as HTMLSelectElement[];
    const subjectSelect = selects.find((el) => el.id.includes('subject')) ?? selects[selects.length - 1];
    if (subjectSelect) {
      await user.selectOptions(subjectSelect, '11');
      expect(onSubjectIdChange).toHaveBeenCalledWith('11');
    }
  });
});

describe('Shared filter payload safety', () => {
  it('exposes offering field for scoped subject context', () => {
    render(
      <AcademicContextFilters
        controller={makeController({
          selection: {
            ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
            levelId: '5',
            subjectId: '11',
            offeringId: '100',
            referenceId: '200',
          },
        })}
        showLevel
        showSubject
        showOffering
        showReference
        idPrefix="payload"
      />,
    );
    expect(document.getElementById('payload-offering')).toBeTruthy();
    expect(
      (document.getElementById('payload-offering') as HTMLSelectElement).textContent,
    ).toContain('الرياضيات · السادس · العربية');
  });
});
