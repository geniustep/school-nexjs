import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Role Switcher placement contract', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  const desktopAccount = read('src/components/layout/admin-account-menu.tsx');
  const mobileAccount = read('src/components/layout/admin-account-sheet.tsx');

  it('keeps the admin desktop role switcher inside the account menu instead of the topbar', () => {
    expect(shell).toContain('<AdminAccountMenu');
    expect(shell).not.toContain('role-switcher--topbar');
    expect(desktopAccount).toContain('shouldShowRoleSwitcher');
    expect(desktopAccount).toContain('role-switcher-account-menu');
  });

  it('hosts a labeled sidebar switcher for teacher/parent shells', () => {
    expect(shell).toContain('sidebar__role-switcher');
    expect(shell).toContain('role-switcher-sidebar');
    // Must not also keep a second instance inside the mobile footer block.
    const footerBlock = shell.match(
      /sidebar__footer sidebar__footer--mobile[\s\S]*?<\/div>\s*<\/aside>/,
    )?.[0];
    expect(footerBlock).toBeTruthy();
    expect(footerBlock).not.toContain('<RoleSwitcher');
  });

  it('keeps mobile account-sheet access for all multi-role users', () => {
    expect(mobileAccount).toContain('shouldShowRoleSwitcher');
    expect(mobileAccount).toContain('role-switcher-account-sheet');
  });

  it('keeps multi-school switching available without putting the school selector back in the topbar', () => {
    expect(shell).not.toContain('<SchoolSwitcher');
    expect(desktopAccount).toContain('isMultiSchoolAdmin');
    expect(desktopAccount).toContain('<SchoolSwitcher hideLabel />');
  });
});
