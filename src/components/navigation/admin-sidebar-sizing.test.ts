import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('admin sidebar hierarchy sizing (adopted Focus)', () => {
  const css = read('src/app/admin-sidebar.css');
  const shellTsx = read('src/components/layout/app-shell.tsx');
  const sidebar = read('src/components/navigation/admin-sidebar.tsx');

  it('defines a slightly wider bounded fluid admin sidebar without stealing content', () => {
    expect(css).toContain('clamp(304px, 21vw, 324px)');
    expect(css).toContain('--sidebar-w: 72px');
    expect(css).toMatch(
      /@media \(min-width: 901px\) and \(max-width: 1100px\)[\s\S]*?clamp\(286px,\s*27vw,\s*304px\)/,
    );
  });

  it('keeps larger readable group headers and navigation link sizes', () => {
    expect(css).toMatch(/\.focus-v2__group-toggle\s*\{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/\.focus-v2__group-toggle\s*\{[^}]*font-size:\s*15\.5px/s);
    expect(css).toMatch(/\.focus-v2__link\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.focus-v2__link\s*\{[^}]*font-size:\s*15px/s);
    expect(sidebar).toContain('IconChevronDown size={16}');
  });

  it('keeps nav scrollable and accent spine for hierarchy', () => {
    expect(css).toMatch(/\.focus-v2__nav\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.focus-v2__items\s*\{[^}]*border-inline-start:\s*2px solid/s);
  });

  it('does not change RBAC or href wiring', () => {
    expect(shellTsx).toContain('navForUser(user)');
    expect(shellTsx).toContain('AdminSidebarHost');
    expect(sidebar).not.toMatch(/canShowAdminNavPermission|FINANCE_VIEW|ADMISSION_VIEW/);
    expect(sidebar).toContain('sections.map');
  });

  it('does not use zoom or transform scale for sizing', () => {
    expect(css).not.toMatch(/zoom\s*:/);
    expect(css).not.toMatch(/transform:\s*scale\(/);
  });
});
