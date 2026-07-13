import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/i18n/use-format', () => ({
  useFormat: () => ({
    formatDateTime: (value: string) => value,
    formatDate: (value: string) => value,
  }),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    role: 'admin',
    school: { id: 1, name: 'Demo School' },
    schools: [{ id: 1, name: 'Demo School' }],
    active_school_id: 1,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import {
  TeachingPrintActions,
  TeachingPrintHeader,
  TeachingPrintStatus,
} from '@/features/teaching-planning/print/components/teaching-print-layout';

describe('TeachingPrintLayout pieces', () => {
  it('renders branding school name and missing-logo fallback safely', () => {
    const html = renderToStaticMarkup(
      <TeachingPrintHeader
        documentTitle="Doc"
        branding={{
          schoolName: 'Demo School',
          academicYearLabel: '2025/2026',
          logoUrl: null,
          logoAvailable: false,
        }}
        statusNode={<TeachingPrintStatus state="draft" label="Draft" tone="draft" />}
        draftMark
      />,
    );
    expect(html).toContain('Demo School');
    expect(html).toContain('2025/2026');
    expect(html).toContain('admin.teachingPlanning.print.draftWatermark');
    expect(html).not.toContain('<img');
  });

  it('keeps toolbar actions as no-print and does not auto-print markup', () => {
    const html = renderToStaticMarkup(<TeachingPrintActions backHref="/back" />);
    expect(html).toContain('no-print');
    expect(html).toContain('admin.teachingPlanning.print.action');
    expect(html).toContain('admin.teachingPlanning.print.back');
    expect(html).not.toContain('autoPrint');
  });

  it('exposes document status as text', () => {
    const html = renderToStaticMarkup(
      <TeachingPrintStatus state="voided" label="Voided" tone="voided" />,
    );
    expect(html).toContain('Voided');
    expect(html).toContain('data-state="voided"');
  });
});
