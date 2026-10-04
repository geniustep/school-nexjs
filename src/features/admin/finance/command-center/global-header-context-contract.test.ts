import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Finance Command Center global header context contract', () => {
  const page = source(
    'src/features/admin/finance/command-center/finance-command-center-page.tsx',
  );
  const hook = source(
    'src/features/admin/finance/command-center/use-finance-command-center.ts',
  );
  const adminResource = source('src/lib/hooks/use-admin-resource.ts');
  const contextSection = page.slice(
    page.indexOf('function ContextBar'),
    page.indexOf('function MetricCard'),
  );

  it('does not own school or academic-year selectors inside the page', () => {
    expect(page).not.toContain('setActiveAcademicYear');
    expect(page).not.toContain('academicYears.map');
    expect(page).not.toContain('activeSchool?.name');
    expect(contextSection).not.toContain('<select');
  });

  it('uses the global academic-year context for command-center API queries', () => {
    expect(hook).toContain('const { activeAcademicYearId } = useAdminSession();');
    expect(hook).toContain('academic_year_id: activeAcademicYearId');
  });

  it('uses the global active-school context through the shared admin resource hook', () => {
    expect(adminResource).toContain('activeSchoolId');
    expect(adminResource).toContain('active_school_id: safeActiveSchoolId');
  });

  it('clears all command-center resources when their context/query changes', () => {
    const failClosedResources = hook.match(/keepPreviousData:\s*false/g) ?? [];
    expect(failClosedResources).toHaveLength(4);
  });
});
