import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Role Switcher placement contract', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  const account = read('src/components/layout/admin-account-sheet.tsx');
  const css = read('src/app/admin-workspace.css');

  it('shows a labeled topbar switcher for admin desktop only', () => {
    expect(shell).toMatch(/isAdmin && \(\s*<RoleSwitcher className="role-switcher--topbar"/);
    expect(shell).not.toMatch(/RoleSwitcher hideLabel className="role-switcher--topbar"/);
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
    expect(account).toContain('shouldShowRoleSwitcher');
    expect(account).toContain('role-switcher-account-sheet');
  });

  it('hides admin topbar switcher on narrow viewports (account sheet remains)', () => {
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.role-switcher--topbar[\s\S]*display:\s*none/);
  });
});
