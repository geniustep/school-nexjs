import { describe, expect, it, vi } from 'vitest';
import {
  fetchAllPaginatedForPrint,
  TEACHING_PRINT_SAFE_MAX_RECORDS,
} from '@/features/teaching-planning/print/utils/fetch-all-paginated-for-print';
import {
  buildPrintReportQuery,
  isDraftLikeState,
  parsePrintScope,
  printStatusTone,
} from '@/features/teaching-planning/print/utils/print-helpers';
import fs from 'node:fs';
import path from 'node:path';

describe('fetchAllPaginatedForPrint', () => {
  it('returns one page for current_page scope', async () => {
    const fetchPage = vi.fn(async () => ({
      success: true as const,
      data: [{ id: 1 }, { id: 2 }],
      meta: { pagination: { page: 2, page_size: 2, total: 5, total_pages: 3 } },
    }));
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'current_page',
      page: 2,
      pageSize: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(2);
    expect(result.scope).toBe('current_page');
    expect(result.pagesFetched).toBe(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('collects multiple pages for all_filtered', async () => {
    const fetchPage = vi.fn(async (params) => {
      const page = Number(params.page);
      if (page === 1) {
        return {
          success: true as const,
          data: [{ id: 1 }, { id: 2 }],
          meta: { pagination: { page: 1, page_size: 2, total: 5, total_pages: 3 } },
        };
      }
      if (page === 2) {
        return {
          success: true as const,
          data: [{ id: 3 }, { id: 4 }],
          meta: { pagination: { page: 2, page_size: 2, total: 5, total_pages: 3 } },
        };
      }
      return {
        success: true as const,
        data: [{ id: 5 }],
        meta: { pagination: { page: 3, page_size: 2, total: 5, total_pages: 3 } },
      };
    });
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'all_filtered',
      pageSize: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.map((x) => x.id)).toEqual([1, 2, 3, 4, 5]);
    expect(result.pagesFetched).toBe(3);
    expect(result.truncated).toBe(false);
  });

  it('handles final partial page', async () => {
    const fetchPage = vi.fn(async (params) => {
      if (Number(params.page) === 1) {
        return {
          success: true as const,
          data: [{ id: 1 }, { id: 2 }],
          meta: { pagination: { page: 1, page_size: 2, total: 3, total_pages: 2 } },
        };
      }
      return {
        success: true as const,
        data: [{ id: 3 }],
        meta: { pagination: { page: 2, page_size: 2, total: 3, total_pages: 2 } },
      };
    });
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'all_filtered',
      pageSize: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(3);
  });

  it('protects against duplicate pages', async () => {
    const fetchPage = vi.fn(async () => ({
      success: true as const,
      data: [{ id: 1 }],
      meta: { pagination: { page: 1, page_size: 1, total: 3, total_pages: 3 } },
    }));
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'all_filtered',
      pageSize: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('duplicate_page');
  });

  it('treats missing pagination metadata as single page', async () => {
    const fetchPage = vi.fn(async () => ({
      success: true as const,
      data: [{ id: 1 }, { id: 2 }],
      meta: {},
    }));
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'all_filtered',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(2);
    expect(result.pagesFetched).toBe(1);
  });

  it('warns when safe maximum is exceeded', async () => {
    const fetchPage = vi.fn(async (params) => {
      const page = Number(params.page);
      return {
        success: true as const,
        data: Array.from({ length: 100 }, (_, i) => ({ id: (page - 1) * 100 + i + 1 })),
        meta: {
          pagination: {
            page,
            page_size: 100,
            total: TEACHING_PRINT_SAFE_MAX_RECORDS + 50,
            total_pages: 11,
          },
        },
      };
    });
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'all_filtered',
      pageSize: 100,
      maxRecords: TEACHING_PRINT_SAFE_MAX_RECORDS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.truncated).toBe(true);
    expect(result.warning).toBe('safe_maximum_exceeded');
    expect(result.items).toHaveLength(TEACHING_PRINT_SAFE_MAX_RECORDS);
  });

  it('propagates network errors', async () => {
    const fetchPage = vi.fn(async () => ({
      success: false as const,
      error: { code: 'network_error', message: 'down' },
    }));
    const result = await fetchAllPaginatedForPrint({
      fetchPage,
      scope: 'all_filtered',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('network_error');
  });

  it('supports abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await fetchAllPaginatedForPrint({
      fetchPage: async () => ({ success: true as const, data: [] }),
      scope: 'all_filtered',
      signal: controller.signal,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('aborted');
  });

  it('never mutates — fetchPage only used for GET-like reads', async () => {
    const fetchPage = vi.fn(async () => ({
      success: true as const,
      data: [{ id: 1 }],
      meta: {},
    }));
    await fetchAllPaginatedForPrint({ fetchPage, scope: 'current_page' });
    expect(fetchPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });
});

describe('print helpers', () => {
  it('marks draft states', () => {
    expect(isDraftLikeState('draft')).toBe(true);
    expect(isDraftLikeState('confirmed')).toBe(false);
  });

  it('maps status tones', () => {
    expect(printStatusTone('draft')).toBe('draft');
    expect(printStatusTone('voided')).toBe('voided');
    expect(printStatusTone('superseded')).toBe('superseded');
    expect(printStatusTone('confirmed')).toBe('default');
  });

  it('parses print scope with all_filtered default', () => {
    expect(parsePrintScope(null)).toBe('all_filtered');
    expect(parsePrintScope('current_page')).toBe('current_page');
  });

  it('builds report query with explicit scope', () => {
    const qs = buildPrintReportQuery({ state: 'current', search: 'math' }, 'all_filtered');
    expect(qs).toContain('print_scope=all_filtered');
    expect(qs).toContain('state=current');
    expect(qs).toContain('search=math');
  });
});

describe('teaching print CSS safety', () => {
  const cssPath = path.join(
    process.cwd(),
    'src/features/teaching-planning/print/teaching-print.css',
  );
  const css = fs.readFileSync(cssPath, 'utf8');

  it('uses teaching-print namespace root', () => {
    expect(css).toContain('.teaching-print');
    expect(css).toContain('.teaching-print__sheet');
  });

  it('defines @media print and @page A4', () => {
    expect(css).toContain('@media print');
    expect(css).toContain('size: A4');
  });

  it('supports landscape class and hides controls', () => {
    expect(css).toContain('.teaching-print--landscape');
    expect(css).toContain('.teaching-print__toolbar');
    expect(css).toContain('display: none !important');
  });

  it('does not use broad global element restyles outside print root', () => {
    expect(css).not.toMatch(/^body\s*\{/m);
    expect(css).not.toMatch(/^html\s*\{/m);
    expect(css).not.toMatch(/^\*\s*\{/m);
  });
});

describe('print routes exist', () => {
  const routes = [
    'src/app/admin/teaching-planning/distributions/[id]/print/page.tsx',
    'src/app/admin/teaching-planning/reference-jathathas/[id]/print/page.tsx',
    'src/app/admin/teaching-planning/teacher-jathathas/[id]/print/page.tsx',
    'src/app/admin/teaching-planning/actual-deliveries/[id]/print/page.tsx',
    'src/app/admin/teaching-planning/class-journal/[id]/print/page.tsx',
    'src/app/admin/teaching-planning/class-journal/print/page.tsx',
    'src/app/admin/teaching-planning/progress/[id]/print/page.tsx',
    'src/app/admin/teaching-planning/progress/print/page.tsx',
    'src/app/teacher/teaching-planning/distributions/[id]/print/page.tsx',
    'src/app/teacher/jathathas/[id]/print/page.tsx',
    'src/app/teacher/actual-deliveries/[id]/print/page.tsx',
    'src/app/teacher/class-journal/[id]/print/page.tsx',
    'src/app/teacher/class-journal/print/page.tsx',
    'src/app/teacher/teaching-progress/[id]/print/page.tsx',
    'src/app/teacher/teaching-progress/print/page.tsx',
  ];

  it.each(routes)('%s exists', (route) => {
    expect(fs.existsSync(path.join(process.cwd(), route))).toBe(true);
  });

  it('avoids treating print as dynamic id for journal/progress reports', () => {
    expect(
      fs.existsSync(
        path.join(process.cwd(), 'src/app/admin/teaching-planning/class-journal/print/page.tsx'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(process.cwd(), 'src/app/admin/teaching-planning/progress/print/page.tsx'),
      ),
    ).toBe(true);
  });
});

describe('print i18n parity', () => {
  const locales = ['ar', 'en', 'fr', 'es'] as const;

  function flatten(obj: unknown, prefix = ''): string[] {
    if (obj == null || typeof obj !== 'object') return [prefix];
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
      flatten(value, prefix ? `${prefix}.${key}` : key),
    );
  }

  it('keeps print key parity across locales', () => {
    const maps = Object.fromEntries(
      locales.map((locale) => {
        const data = JSON.parse(
          fs.readFileSync(path.join(process.cwd(), `messages/${locale}.json`), 'utf8'),
        );
        return [locale, new Set(flatten(data.admin.teachingPlanning.print))];
      }),
    );
    const base = [...maps.en];
    for (const locale of locales) {
      for (const key of base) {
        expect(maps[locale].has(key), `missing ${key} in ${locale}`).toBe(true);
      }
      expect(maps[locale].size).toBe(maps.en.size);
    }
  });

  it('does not reuse finance/receipt print keys for teaching print', () => {
    const en = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'messages/en.json'), 'utf8'),
    );
    expect(en.admin.teachingPlanning.print.action).toBeTruthy();
    expect(en.admin.teachingPlanning.print.documents.referenceJathatha).not.toEqual(
      en.admin.teachingPlanning.print.documents.teacherJathatha,
    );
  });
});

describe('semantic safety markers', () => {
  it('keeps document type labels distinct', () => {
    const en = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'messages/en.json'), 'utf8'),
    ).admin.teachingPlanning.print.documents;
    expect(en.referenceJathatha).not.toBe(en.teacherJathatha);
    expect(en.teacherJathatha).not.toBe(en.actualDelivery);
    expect(en.actualDelivery).not.toBe(en.classJournal);
    expect(en.classJournal).not.toBe(en.teachingProgress);
    expect(en.annualDistribution).not.toBe(en.teachingProgress);
  });

  it('preserves protected manual CSS files untouched by this print module', () => {
    const printCss = fs.readFileSync(
      path.join(process.cwd(), 'src/features/teaching-planning/print/teaching-print.css'),
      'utf8',
    );
    expect(printCss).toContain('.admin-sidebar');
    expect(printCss).not.toContain('admissions.css');
    expect(printCss).not.toContain('.admission-');
    expect(
      fs.existsSync(path.join(process.cwd(), 'src/app/admin-sidebar.css')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(process.cwd(), 'src/features/admin/admissions/admissions.css')),
    ).toBe(true);
  });
});
