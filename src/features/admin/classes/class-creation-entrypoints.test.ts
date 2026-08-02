import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('admin classes create entrypoints', () => {
  it('labels the classes list CTA as إنشاء قسم', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/app/admin/classes/page.tsx'),
      'utf8',
    );
    expect(page).toContain("addLabel={t('admin.createClass')}");
    expect(page).toContain('addHref="/admin/classes/new"');

    const ar = JSON.parse(
      readFileSync(join(process.cwd(), 'messages/ar.json'), 'utf8'),
    ) as { admin: { createClass: string; add: string } };
    expect(ar.admin.createClass).toBe('إنشاء قسم');
    expect(ar.admin.add).toBe('إضافة');
  });

  it('routes /admin/classes/new and academic-setup drawer through ClassForm', () => {
    const detailPage = readFileSync(
      join(process.cwd(), 'src/app/admin/classes/[id]/page.tsx'),
      'utf8',
    );
    expect(detailPage).toContain("const isNew = id === 'new'");
    expect(detailPage).toContain('<ClassForm');

    const drawer = readFileSync(
      join(process.cwd(), 'src/features/admin/academic-setup/components/class-drawer.tsx'),
      'utf8',
    );
    expect(drawer).toContain('<ClassForm');
    expect(drawer).toContain("mode === 'create'");
  });
});
