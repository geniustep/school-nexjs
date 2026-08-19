import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectNavHrefs,
  countNavLinks,
  isNavLinkActive,
  sectionGroupId,
  sectionHasActiveLink,
} from '@/components/navigation/admin-sidebar-nav-utils';
import type { NavSection } from '@/components/navigation/nav-config';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

const sampleSections: NavSection[] = [
  {
    groupId: 'ops',
    titleKey: 'nav.adminOperations',
    defaultOpen: true,
    items: [
      { labelKey: 'nav.dashboard', href: '/admin/dashboard', icon: '🏠' },
      { labelKey: 'nav.attendance', href: '/admin/attendance', icon: '🗓️' },
    ],
  },
  {
    groupId: 'finance',
    titleKey: 'nav.financeSection',
    items: [{ labelKey: 'nav.finance', href: '/admin/finance', icon: '💰' }],
  },
];

describe('official admin Focus sidebar adoption', () => {
  it('wires AdminSidebar as the only admin chrome without preview/lab resolvers', () => {
    const host = read('src/components/navigation/admin-sidebar-host.tsx');
    const sidebar = read('src/components/navigation/admin-sidebar.tsx');
    const shell = read('src/components/layout/app-shell.tsx');
    const globals = read('src/app/globals.css');
    expect(shell).toContain('AdminSidebarHost');
    expect(shell).toContain('navForUser(user)');
    expect(host).toContain('AdminSidebar');
    expect(host).not.toContain('sidebarPreview');
    expect(host).not.toContain('sidebarLab');
    expect(host).not.toContain('AdminSidebarClassic');
    expect(host).not.toContain('AdminSidebarFocusV1');
    expect(host).not.toContain('Suspense');
    expect(sidebar).toContain('data-sidebar-variant="admin"');
    expect(sidebar).not.toContain('navForUser');
    expect(sidebar).not.toContain('/admin/finance');
    expect(globals).toContain("admin-sidebar.css");
    expect(globals).not.toContain('admin-sidebar-focus-v1.css');
    expect(globals).not.toContain('admin-sidebar-focus-v2.css');
  });

  it('keeps adopted Focus sizing slightly wider with larger text', () => {
    const css = read('src/app/admin-sidebar.css');
    expect(css).toContain('clamp(304px, 21vw, 324px)');
    expect(css).toContain('--sidebar-w: 72px');
    expect(css).toMatch(/\.focus-v2__group-toggle\s*\{[^}]*font-size:\s*15\.5px/s);
    expect(css).toMatch(/\.focus-v2__group-toggle\s*\{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/\.focus-v2__link\s*\{[^}]*font-size:\s*15px/s);
    expect(css).toMatch(/\.focus-v2__link\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.focus-v2__items\s*\{[^}]*border-inline-start:\s*2px solid/s);
    expect(css).toMatch(/\.focus-v2__header\s*\{[^}]*linear-gradient/s);
    expect(css).not.toContain('sidebar-lab');
    expect(css).not.toContain('sidebar-active-badge');
    expect(css).not.toContain('clamp(284px, 20vw, 300px)');
  });

  it('keeps one group open and scrolls newly opened groups into the top of the nav viewport', () => {
    const sidebar = read('src/components/navigation/admin-sidebar.tsx');
    expect(sidebar).toContain('scrollGroupToTop');
    expect(sidebar).toContain("document.getElementById('admin-sidebar-nav')");
    expect(sidebar).toContain('nav.scrollTo({ top, behavior })');
    expect(sidebar).toContain("id={`admin-sidebar-group-${groupId}`}");
    expect(sidebar).toContain('next[id] = !!section.titleKey && id === groupId ? opening : false');
  });

  it('preserves shared nav helpers for RBAC parity', () => {
    expect(sampleSections).toHaveLength(2);
    expect(countNavLinks(sampleSections)).toBe(3);
    expect(collectNavHrefs(sampleSections)).toEqual([
      '/admin/dashboard',
      '/admin/attendance',
      '/admin/finance',
    ]);
    expect(sectionGroupId(sampleSections[0], 0)).toBe('ops');
    expect(isNavLinkActive('/admin/dashboard', '/admin/dashboard')).toBe(true);
    expect(isNavLinkActive('/admin/finance/receipts', '/admin/finance')).toBe(true);
    expect(sectionHasActiveLink('/admin/dashboard', sampleSections[0])).toBe(true);
  });
});
