import type { NavItem, NavSection } from '@/components/navigation/nav-config';

export function stripNavQuery(href: string): string {
  return href.split('?')[0];
}

export function isNavLinkActive(pathname: string, href: string, item?: NavItem): boolean {
  if (item?.isActive) return item.isActive(pathname);
  const base = stripNavQuery(href);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function sectionHasActiveLink(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isNavLinkActive(pathname, item.href, item));
}

export function sectionGroupId(section: NavSection, index: number): string {
  return section.groupId ?? `section-${index}`;
}

export function countNavLinks(sections: NavSection[]): number {
  return sections.reduce((sum, section) => sum + section.items.length, 0);
}

export function collectNavHrefs(sections: NavSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.href));
}
