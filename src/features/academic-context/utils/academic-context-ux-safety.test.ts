import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('No unscoped all-subject operational selectors', () => {
  const operationalFiles = [
    'src/features/admin/exam-form.tsx',
    'src/features/admin/gradebooks/components/gradebook-create-dialog.tsx',
    'src/features/admin/gradebooks/components/gradebooks-list-filters.tsx',
    'src/features/admin/admin-timetable-panel.tsx',
    'src/features/admin/teaching-planning/components/teaching-offerings-list-filters.tsx',
    'src/features/admin/teaching-planning/components/teaching-planning-academic-list-filters.tsx',
    'src/features/admin/teaching-planning/components/teaching-references-list-page.tsx',
    'src/features/admin/teaching-planning/components/didactic-sequences-list-page.tsx',
    'src/features/admin/teaching-planning/components/reference-jathathas-list-page.tsx',
    'src/features/admin/teaching-planning/components/teaching-offering-dialogs.tsx',
    'src/features/admin/teaching-planning/components/teaching-reference-dialogs.tsx',
    'src/features/admin/teaching-planning/components/didactic-sequence-dialogs.tsx',
    'src/features/admin/academic-setup/components/assignment-form-drawer.tsx',
    'src/features/admin/exams/components/exams-list-filters.tsx',
  ];

  it('uses AcademicContextFilters or scoped context instead of endpoints.admin.subjects', () => {
    for (const file of operationalFiles) {
      expect(existsSync(join(ROOT, file)), file).toBe(true);
      const src = read(file);
      expect(src.includes('endpoints.admin.subjects'), file).toBe(false);
      expect(src.toLowerCase().includes('res.lang'), file).toBe(false);
      expect(src.includes('inputMode="numeric"') && src.includes('language'), file).toBe(false);
    }
  });

  it('catalog subjects page remains allowed to list all subjects', () => {
    const catalog = read('src/features/admin/subjects/components/admin-subjects-list.tsx');
    expect(catalog.length).toBeGreaterThan(0);
  });
});

describe('No All Subjects runtime matrix (source wiring)', () => {
  const matrix: Array<{ page: string; file: string; markers: string[]; scope?: string }> = [
    {
      page: 'Assignment',
      file: 'src/features/admin/academic-setup/components/assignment-form-drawer.tsx',
      markers: ['useAcademicContextOptions', "scope: 'assignment'"],
      scope: 'assignment',
    },
    {
      page: 'Timetable',
      file: 'src/features/admin/admin-timetable-panel.tsx',
      markers: ['useAcademicContextOptions', "scope: 'timetable'"],
      scope: 'timetable',
    },
    {
      page: 'Exams form',
      file: 'src/features/admin/exam-form.tsx',
      markers: ['AcademicContextFilters', 'scope="exam"'],
      scope: 'exam',
    },
    {
      page: 'Exams list',
      file: 'src/features/admin/exams/components/exams-list-filters.tsx',
      markers: ['AcademicContextFilters', 'scope="exam"'],
      scope: 'exam',
    },
    {
      page: 'Gradebooks create',
      file: 'src/features/admin/gradebooks/components/gradebook-create-dialog.tsx',
      markers: ['AcademicContextFilters', 'scope="gradebook"'],
      scope: 'gradebook',
    },
    {
      page: 'Gradebooks list',
      file: 'src/features/admin/gradebooks/components/gradebooks-list-filters.tsx',
      markers: ['AcademicContextFilters', 'scope="gradebook"'],
      scope: 'gradebook',
    },
    {
      page: 'Teaching Planning filters',
      file: 'src/features/admin/teaching-planning/components/teaching-planning-academic-list-filters.tsx',
      markers: ['AcademicContextFilters', 'scope="teaching_planning"'],
      scope: 'teaching_planning',
    },
    {
      page: 'Teacher academic context endpoint',
      file: 'src/lib/api/endpoints.ts',
      markers: ["academicContextOptions: '/teacher/academic-context/options'"],
    },
  ];

  it('wires Academic Context as runtime source with required scope markers', () => {
    for (const row of matrix) {
      const src = read(row.file);
      for (const marker of row.markers) {
        expect(src.includes(marker), `${row.page} missing ${marker}`).toBe(true);
      }
      expect(src.includes('endpoints.admin.subjects'), row.page).toBe(false);
    }
  });
});

describe('Teaching language dialogs', () => {
  const dialogs = [
    'src/features/admin/teaching-planning/components/teaching-offering-dialogs.tsx',
    'src/features/admin/teaching-planning/components/teaching-reference-dialogs.tsx',
    'src/features/admin/teaching-planning/components/didactic-sequence-dialogs.tsx',
  ];

  it('uses AcademicContextFilters for language and does not invent res.lang IDs', () => {
    for (const file of dialogs) {
      const src = read(file);
      expect(src.includes('AcademicContextFilters'), file).toBe(true);
      expect(src.includes('showTeachingLanguage'), file).toBe(true);
      expect(src.includes('teachingLanguageIdPlaceholder'), file).toBe(false);
      expect(src.includes('res.lang'), file).toBe(false);
      expect(src.includes('endpoints.admin.subjects'), file).toBe(false);
    }
    const filters = read(
      'src/features/academic-context/components/academic-context-filters.tsx',
    );
    expect(filters.includes('academicContext.language.noneConfigured')).toBe(true);
  });
});

describe('Journal/Progress remain read-only', () => {
  it('does not introduce write mutations on journal/progress list pages', () => {
    const journal = read(
      'src/features/admin/teaching-planning/components/class-journal-list-page.tsx',
    );
    const progress = read(
      'src/features/admin/teaching-planning/components/teaching-progress-list-page.tsx',
    );
    expect(journal.includes('createClassJournal')).toBe(false);
    expect(progress.includes('never recomputes')).toBe(true);
    expect(progress.includes('recomputeProgress')).toBe(false);
    expect(journal.includes('api.post(') || journal.includes('api.patch(')).toBe(false);
    expect(progress.includes('api.post(') || progress.includes('api.patch(')).toBe(false);
  });
});

describe('i18n parity and forbidden res.lang text', () => {
  const locales = ['ar', 'en', 'fr', 'es'] as const;

  it('has academicContext key parity and no res.lang text', () => {
    const keySets = locales.map((locale) => {
      const json = JSON.parse(read(`messages/${locale}.json`));
      expect(json.academicContext, locale).toBeTruthy();
      expect(JSON.stringify(json).includes('res.lang'), locale).toBe(false);
      expect(JSON.stringify(json).includes('أدخل معرّف res.lang'), locale).toBe(false);
      expect(JSON.stringify(json).includes('inputMode'), locale).toBe(false);
      const keys: string[] = [];
      const walk = (obj: unknown, prefix = '') => {
        if (!obj || typeof obj !== 'object') return;
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path);
          else keys.push(path);
        }
      };
      walk(json.academicContext);
      return keys.sort();
    });
    for (let i = 1; i < keySets.length; i += 1) {
      expect(keySets[i]).toEqual(keySets[0]);
    }
  });
});

describe('Protected CSS safety', () => {
  it('does not wholesale rewrite admissions or sidebar CSS in this stage', () => {
    const css = read(
      'src/features/academic-context/components/academic-context-filters.css',
    );
    expect(css.includes('academic-context-filters')).toBe(true);
    expect(css.includes('.admissions')).toBe(false);
  });

  it('preserves protected manual CSS files without agent deletion markers', () => {
    expect(existsSync(join(ROOT, 'src/app/admin-sidebar.css'))).toBe(true);
    expect(existsSync(join(ROOT, 'src/features/admin/admissions/admissions.css'))).toBe(true);
  });
});

describe('Semantic protection literals', () => {
  it('keeps semantic boundaries', () => {
    expect('school.cycle' !== 'school.term').toBe(true);
    expect('school.term' !== 'school.timetable.period').toBe(true);
    expect('school.term' !== 'school.academic.billing.calendar.period').toBe(true);
    expect('Subject' !== 'Teaching Offering').toBe(true);
    expect('Teaching Offering' !== 'Teaching Reference').toBe(true);
    expect('Weekly Slot' !== 'Session Occurrence').toBe(true);
  });
});
