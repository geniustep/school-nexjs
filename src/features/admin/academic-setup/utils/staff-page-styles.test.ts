import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('academic setup stylesheet wiring', () => {
  it('imports feature CSS from the server layout', () => {
    const layout = readFileSync(
      resolve('src/app/admin/settings/academic-setup/layout.tsx'),
      'utf8',
    );
    expect(layout).toContain("import '@/features/admin/academic-setup/academic-setup-ui.css'");
    expect(layout).not.toContain("'use client'");
  });

  it('keeps client shell separate from stylesheet import', () => {
    const shell = readFileSync(
      resolve('src/features/admin/academic-setup/components/academic-setup-shell.tsx'),
      'utf8',
    );
    expect(shell).toContain("'use client'");
    expect(shell).not.toContain('academic-setup-ui.css');
  });
});

describe('staff page responsive filter classes', () => {
  it('defines mutually exclusive mobile select and desktop segmented filters', () => {
    const css = readFileSync(
      resolve('src/features/admin/academic-setup/academic-setup-ui.css'),
      'utf8',
    );
    expect(css).toContain('.academic-staff-status-select');
    expect(css).toContain('.academic-staff-filter--desktop');
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.academic-staff-status-select[\s\S]*display:\s*block/);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.academic-staff-filter--desktop[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media \(min-width: 641px\)[\s\S]*\.academic-staff-status-select[\s\S]*display:\s*none/);
  });

  it('maps staff page structure classes in JSX and CSS', () => {
    const page = readFileSync(
      resolve('src/app/admin/settings/academic-setup/staff/page.tsx'),
      'utf8',
    );
    const card = readFileSync(
      resolve('src/features/admin/academic-setup/components/staff-card.tsx'),
      'utf8',
    );
    const actions = readFileSync(
      resolve('src/features/admin/academic-setup/components/staff-card-actions.tsx'),
      'utf8',
    );
    const css = readFileSync(
      resolve('src/features/admin/academic-setup/academic-setup-ui.css'),
      'utf8',
    );
    for (const className of [
      'academic-staff-page',
      'academic-toolbar--staff',
      'academic-staff-filter--desktop',
    ]) {
      expect(page).toContain(className);
      expect(css).toContain(`.${className}`);
    }
    expect(page).toContain('StaffCardGrid');
    expect(card).toContain('academic-staff-grid');
    expect(actions).toContain('academic-staff-card__footer');
    expect(css).toContain('.academic-staff-grid');
    expect(css).toContain('.academic-staff-card__footer');
  });
});
