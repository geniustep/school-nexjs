// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AcademicContextFilters } from '@/features/academic-context/components/academic-context-filters';
import { EMPTY_ACADEMIC_CONTEXT_SELECTION } from '@/features/academic-context/utils/academic-context-reset';
import {
  LITERAL_ASSERTIONS,
  baseOptions,
  makeController,
} from '@/features/academic-context/test-helpers';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, vars?: Record<string, string>) => {
    if (vars?.language) return `${key}:${vars.language}`;
    if (vars?.count) return `${key}:${vars.count}`;
    return key;
  },
}));

const sessionCaps = vi.fn(() => [
  'teaching.offerings.manage',
  'teaching.references.manage',
]);

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    role: 'admin',
    effective_capabilities: sessionCaps(),
  }),
}));

vi.mock('@/lib/permissions/teaching-planning', () => ({
  canManageTeachingOfferings: () => sessionCaps().includes('teaching.offerings.manage'),
  canManageTeachingReferences: () => sessionCaps().includes('teaching.references.manage'),
}));

afterEach(() => {
  cleanup();
  sessionCaps.mockImplementation(() => [
    'teaching.offerings.manage',
    'teaching.references.manage',
  ]);
});

function field(id: string) {
  return document.getElementById(id) as HTMLSelectElement | HTMLElement | null;
}

function renderFilters(
  controller = makeController(),
  props: Partial<React.ComponentProps<typeof AcademicContextFilters>> = {},
) {
  return render(
    <AcademicContextFilters
      controller={controller}
      idPrefix="test"
      showAcademicYear
      showCycle
      showLevel
      showTrack
      showTeachingLanguage
      showSubject
      showOffering
      showReference
      showTerm
      showClass
      {...props}
    />,
  );
}

describe('AcademicContextFilters screen rendering', () => {
  it('renders standard hierarchical fields with labels and options', () => {
    renderFilters();
    expect(field('test-year')).toBeTruthy();
    expect(field('test-cycle')).toBeTruthy();
    expect(field('test-level')).toBeTruthy();
    expect(field('test-track')).toBeTruthy();
    expect(field('test-subject')).toBeTruthy();
    expect(field('test-offering')).toBeTruthy();
    expect(field('test-reference')).toBeTruthy();
    expect(field('test-term')).toBeTruthy();
    expect(field('test-class')).toBeTruthy();
    expect(document.body.textContent).toContain('السادس ابتدائي');
    expect(document.body.textContent).toContain('الرياضيات');
    expect(screen.getByText('academicContext.fields.offering')).toBeTruthy();
  });

  it('applies compact layout class and required markers', () => {
    const { container } = renderFilters(makeController(), {
      layout: 'compact',
      requiredFields: ['level', 'subject', 'offering'],
    });
    expect(container.querySelector('.academic-context-filters--compact')).toBeTruthy();
    expect(container.querySelectorAll('.academic-context-filters__required').length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading and refetch states without wiping options', () => {
    const { rerender } = renderFilters(
      makeController({ loading: true, options: null }),
    );
    expect(screen.getByText('academicContext.loading')).toBeTruthy();

    rerender(
      <AcademicContextFilters
        controller={makeController({ loading: false, refetching: true })}
        idPrefix="test"
        showSubject
        showLevel
      />,
    );
    expect(screen.getByText('academicContext.refetching')).toBeTruthy();
    expect(field('test-subject')).toBeTruthy();
  });

  it('renders error and permission denied states', () => {
    renderFilters(
      makeController({
        error: { code: 'academic_context_level_track_mismatch', message: 'mismatch' },
      }),
    );
    expect(screen.getByRole('alert').textContent).toMatch(/academic_context_level_track_mismatch|mismatch/);

    cleanup();
    renderFilters(makeController({ permissionDenied: true }));
    expect(screen.getByText('academicContext.permissionDenied')).toBeTruthy();
  });

  it('disables subject/offering/term when prerequisites missing', () => {
    renderFilters(
      makeController({
        selection: { ...EMPTY_ACADEMIC_CONTEXT_SELECTION },
        options: baseOptions({ subjects: [], offerings: [], terms: [] }),
      }),
    );
    expect((field('test-subject') as HTMLSelectElement).disabled).toBe(true);
    expect((field('test-offering') as HTMLSelectElement).disabled).toBe(true);
    expect((field('test-term') as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText('academicContext.hints.chooseLevelOrClassFirst')).toBeTruthy();
  });

  it('invokes setField on dependent changes and announces resets', async () => {
    const user = userEvent.setup();
    const setField = vi.fn();
    renderFilters(
      makeController({
        setField,
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          academicYearId: '1',
          levelId: '5',
          subjectId: '11',
          offeringId: '100',
          termId: '31',
        },
      }),
    );
    await user.selectOptions(field('test-level') as HTMLSelectElement, '5');
    expect(setField).toHaveBeenCalled();
    expect(document.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});

describe('Teaching language UX states A–F', () => {
  it('A — multiple labeled languages render a select without IDs', () => {
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
        },
      }),
    );
    const lang = field('test-language') as HTMLSelectElement;
    expect(lang.tagName).toBe('SELECT');
    expect(lang.textContent).toContain('العربية');
    expect(lang.textContent).toContain('Français');
    expect(lang.innerHTML).not.toMatch(/value="9"[^>]*>9</);
    expect(document.body.innerHTML).not.toMatch(/res\.lang|inputMode="numeric"/);
  });

  it('B — single language from Offering is read-only derived context', () => {
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
          offeringId: '100',
        },
        options: baseOptions({
          teaching_languages: [],
          offerings: [
            {
              id: 100,
              name: 'Math AR',
              display_label: 'الرياضيات · العربية',
              teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
            },
          ],
        }),
      }),
    );
    expect(field('test-language')?.tagName).not.toBe('SELECT');
    expect(document.body.textContent).toContain('academicContext.language.derivedFromOffering:العربية');
    expect(field('test-language')?.textContent).toContain('العربية');
  });

  it('C — prerequisites missing shows helper without error', () => {
    renderFilters(
      makeController({
        selection: { ...EMPTY_ACADEMIC_CONTEXT_SELECTION, levelId: '5' },
      }),
    );
    expect(screen.getAllByText('academicContext.language.chooseLevelSubjectFirst').length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('D — empty languages with complete context shows Data Quality + CTA by permission', () => {
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
        },
        options: baseOptions({ teaching_languages: [], offerings: [], references: [] }),
      }),
    );
    expect(screen.getAllByText('academicContext.language.noneConfigured').length).toBeGreaterThan(0);
    expect(screen.getByText('academicContext.language.completeOfferingOrReference')).toBeTruthy();
    expect(screen.getByText('academicContext.language.openOfferings')).toBeTruthy();

    cleanup();
    sessionCaps.mockImplementation(() => []);
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
        },
        options: baseOptions({ teaching_languages: [], offerings: [], references: [] }),
      }),
    );
    expect(screen.getAllByText('academicContext.language.noneConfigured').length).toBeGreaterThan(0);
    expect(screen.queryByText('academicContext.language.openOfferings')).toBeNull();
  });

  it('E — language derived from approved Reference', () => {
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
          offeringId: '100',
          referenceId: '200',
        },
        options: baseOptions({
          teaching_languages: [],
          offerings: [
            {
              id: 100,
              name: 'Math AR',
              display_label: 'Math AR',
              teaching_language: null,
            },
          ],
        }),
      }),
    );
    expect(field('test-language')?.textContent).toContain('العربية');
    expect(field('test-language')?.tagName).not.toBe('SELECT');
  });

  it('F — incomplete Backend language labels block with contract error (no guessed mapping)', () => {
    renderFilters(
      makeController({
        languageContractIncomplete: true,
        options: null,
      }),
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.language.contractIncomplete',
    );
    expect(document.body.textContent).not.toMatch(/res\.lang/);
  });

  it('literal language safety assertions', () => {
    expect(LITERAL_ASSERTIONS.neverResLang).toContain('never asked to enter a res.lang ID');
    expect(LITERAL_ASSERTIONS.labelsFromBackend).toContain('Backend context');
    expect(LITERAL_ASSERTIONS.noHardcodedIds).toContain('No local hardcoded res.lang');
    expect(LITERAL_ASSERTIONS.noNumericInput).toContain('No numeric teaching-language input');
  });
});

describe('Offering/Reference contextual labels and ambiguity', () => {
  it('keeps ambiguous offerings separate without auto-select and warns incomplete reference', () => {
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
          offeringId: '',
        },
      }),
    );
    const offering = field('test-offering') as HTMLSelectElement;
    expect(offering.value).toBe('');
    expect(offering.textContent).toContain('الرياضيات · السادس · العربية');
    expect(offering.textContent).toContain('Mathématiques · 6AP · Français');
    expect(screen.getByText('academicContext.hints.ambiguousOfferings')).toBeTruthy();
  });

  it('distinguishes same-name references by context and marks incomplete', () => {
    renderFilters(
      makeController({
        selection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          subjectId: '11',
          offeringId: '101',
        },
      }),
    );
    const reference = field('test-reference') as HTMLSelectElement;
    expect(reference.textContent).toContain('المنير في الرياضيات');
    expect(reference.textContent).toContain('academicContext.reference.incomplete');
    const incompleteOption = within(reference).getByRole('option', {
      name: /incomplete/i,
    }) as HTMLOptionElement;
    expect(incompleteOption.disabled).toBe(true);
  });

  it('renders class recommended code and level alias without silent rename', () => {
    renderFilters();
    const classSelect = field('test-class') as HTMLSelectElement;
    expect(classSelect.textContent).toContain('6AP-A');
    expect(classSelect.textContent).toMatch(/Class 6A Raw|LEGACY-6A/);
  });
});
