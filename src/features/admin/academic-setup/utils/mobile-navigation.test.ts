import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dual-layer mobile navigation', () => {
  it('preserves all academic context submenu links', () => {
    const source = readFileSync(
      resolve('src/features/admin/academic-setup/components/academic-section-switcher.tsx'),
      'utf8',
    );
    for (const key of [
      'overview',
      'classes',
      'subjects',
      'teachers',
      'staff',
      'assignments',
    ]) {
      expect(source).toContain(`key: '${key}'`);
    }
    expect(source).toContain('canViewAcademicSetupSection');
  });

  it('renders context navigation in a bottom sheet on mobile', () => {
    const tsx = readFileSync(
      resolve('src/features/admin/academic-setup/components/academic-section-switcher.tsx'),
      'utf8',
    );
    const css = readFileSync(
      resolve('src/features/admin/academic-setup/academic-setup-ui.css'),
      'utf8',
    );
    expect(tsx).toContain('MobileBottomSheet');
    expect(tsx).toContain('academic-section-switcher__mobile');
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*academic-section-switcher__desktop[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*academic-section-switcher__mobile[\s\S]*display:\s*block/);
  });

  it('portals bottom sheets to document.body to avoid fixed-position traps', () => {
    const sheet = readFileSync(
      resolve('src/components/ui/mobile-bottom-sheet.tsx'),
      'utf8',
    );
    expect(sheet).toContain('createPortal');
    expect(sheet).toContain('document.body');
  });

  it('coordinates main drawer and context navigation exclusivity', () => {
    const coordinator = readFileSync(
      resolve('src/hooks/mobile-nav-coordinator.tsx'),
      'utf8',
    );
    const appShell = readFileSync(resolve('src/components/layout/app-shell.tsx'), 'utf8');
    const switcher = readFileSync(
      resolve('src/features/admin/academic-setup/components/academic-section-switcher.tsx'),
      'utf8',
    );
    expect(coordinator).toContain("'main-drawer'");
    expect(coordinator).toContain("'context-nav'");
    expect(coordinator).toContain('usePathname');
    expect(appShell).toContain('useMobileNavCoordinator');
    expect(appShell).toContain('mainDrawerOpen');
    expect(switcher).toContain('setContextNavOpen');
  });

  it('keeps main sidebar navigation structure intact', () => {
    const appShell = readFileSync(resolve('src/components/layout/app-shell.tsx'), 'utf8');
    expect(appShell).toContain('navForUser');
    expect(appShell).toContain('sidebar__nav');
    expect(appShell).toContain('BrandLogo');
    expect(appShell).toContain('LocaleSwitcher');
    expect(appShell).toContain('sidebar__footer-logout');
  });
});
