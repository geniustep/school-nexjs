'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { loginSchoolLogoBffPath } from '@/lib/public-school-branding/client';
import '@/features/teaching-planning/print/teaching-print.css';

export type TeachingPrintBranding = {
  schoolName: string;
  academicYearLabel: string | null;
  logoUrl: string | null;
  logoAvailable: boolean;
};

export type TeachingPrintMetaItem = {
  label: string;
  value: ReactNode;
  ltr?: boolean;
};

export function TeachingPrintActions({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel?: string;
}) {
  const t = useT();
  return (
    <div className="teaching-print__toolbar no-print">
      <Link href={backHref} className="btn btn--ghost btn--sm">
        {backLabel ?? t('admin.teachingPlanning.print.back')}
      </Link>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => window.print()}
      >
        {t('admin.teachingPlanning.print.action')}
      </button>
    </div>
  );
}

export function TeachingPrintStatus({
  state,
  label,
  tone,
}: {
  state: string;
  label: string;
  tone?: 'draft' | 'voided' | 'superseded' | 'default';
}) {
  const resolved =
    tone ??
    (state === 'draft'
      ? 'draft'
      : state === 'voided'
        ? 'voided'
        : state === 'superseded'
          ? 'superseded'
          : 'default');
  return (
    <span
      className={`teaching-print__status teaching-print__status--${resolved}`}
      data-state={state}
    >
      {label}
    </span>
  );
}

export function TeachingPrintMeta({ items }: { items: TeachingPrintMetaItem[] }) {
  return (
    <dl className="teaching-print__meta">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd dir={item.ltr ? 'ltr' : 'auto'} className={item.ltr ? 'teaching-print__ltr' : undefined}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TeachingPrintSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="teaching-print__section">
      <h2 className="teaching-print__section-title">{title}</h2>
      {children}
    </section>
  );
}

export function TeachingPrintTable({
  caption,
  columns,
  rows,
}: {
  caption?: string;
  columns: Array<{ key: string; header: string; ltr?: boolean }>;
  rows: Array<Record<string, ReactNode>>;
}) {
  return (
    <div className="teaching-print__table-wrap">
      <table className="teaching-print__table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  dir={col.ltr ? 'ltr' : 'auto'}
                  className={col.ltr ? 'teaching-print__ltr' : undefined}
                >
                  {row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeachingPrintSignatureArea() {
  const t = useT();
  return (
    <div className="teaching-print__signature">
      <div>
        <div className="teaching-print__signature-line">
          {t('admin.teachingPlanning.print.signatureReview')}
        </div>
      </div>
      <div>
        <div className="teaching-print__signature-line">
          {t('admin.teachingPlanning.print.printedBy')}
        </div>
      </div>
    </div>
  );
}

export function TeachingPrintHeader({
  documentTitle,
  branding,
  statusNode,
  revision,
  draftMark,
}: {
  documentTitle: string;
  branding: TeachingPrintBranding;
  statusNode?: ReactNode;
  revision?: string | number | null;
  draftMark?: boolean;
}) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const [logoBroken, setLogoBroken] = useState(false);
  const showLogo = branding.logoAvailable && branding.logoUrl && !logoBroken;

  return (
    <header className="teaching-print__header">
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="teaching-print__logo"
          src={branding.logoUrl!}
          alt=""
          onError={() => setLogoBroken(true)}
        />
      ) : null}
      <div className="teaching-print__brand">
        <p className="teaching-print__school" dir="auto">
          {branding.schoolName || t('admin.teachingPlanning.print.brandingUnavailable')}
        </p>
        <h1 className="teaching-print__doc-title">{documentTitle}</h1>
        {branding.academicYearLabel ? (
          <p className="teaching-print__generated" dir="auto">
            {branding.academicYearLabel}
          </p>
        ) : null}
        <p className="teaching-print__generated" dir="ltr">
          {t('admin.teachingPlanning.print.generatedOn')}: {formatDateTime(new Date().toISOString())}
        </p>
        {revision != null && revision !== '' ? (
          <p className="teaching-print__generated teaching-print__ltr" dir="ltr">
            {t('admin.teachingPlanning.print.revision')}: {revision}
          </p>
        ) : null}
      </div>
      <div className="teaching-print__status-row">
        {draftMark ? (
          <div className="teaching-print__watermark" role="status">
            {t('admin.teachingPlanning.print.draftWatermark')}
          </div>
        ) : null}
        {statusNode}
      </div>
    </header>
  );
}

export function TeachingPrintLayout({
  documentTitle,
  backHref,
  branding,
  statusNode,
  revision,
  draftMark,
  landscape,
  children,
  showSignature,
  footerNote,
}: {
  documentTitle: string;
  backHref: string;
  branding: TeachingPrintBranding;
  statusNode?: ReactNode;
  revision?: string | number | null;
  draftMark?: boolean;
  landscape?: boolean;
  children: ReactNode;
  showSignature?: boolean;
  footerNote?: ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  return (
    <div
      className={`teaching-print${landscape ? ' teaching-print--landscape' : ''}`}
      data-teaching-print-root="true"
    >
      <TeachingPrintActions backHref={backHref} />
      <div className="teaching-print__sheet">
        <TeachingPrintHeader
          documentTitle={documentTitle}
          branding={branding}
          statusNode={statusNode}
          revision={revision}
          draftMark={draftMark}
        />
        {children}
        {showSignature ? <TeachingPrintSignatureArea /> : null}
        <footer className="teaching-print__footer">
          <span>{footerNote ?? t('admin.teachingPlanning.print.preview')}</span>
          <span className="teaching-print__ltr" dir="ltr">
            {t('admin.teachingPlanning.print.pageFooter')}
          </span>
        </footer>
      </div>
    </div>
  );
}

/** Resolve school branding for print without hardcoding school/year. */
export function useTeachingPrintBranding(options?: {
  schoolName?: string | null;
  academicYearLabel?: string | null;
  schoolCode?: string | null;
  audience?: 'admin' | 'teacher';
}): TeachingPrintBranding {
  const t = useT();
  const user = useSession();
  const sessionSchool =
    user.school?.name ??
    user.schools?.find((s) => s.id === user.active_school_id)?.name ??
    user.schools?.[0]?.name ??
    null;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoAvailable, setLogoAvailable] = useState(false);
  const [apiSchoolName, setApiSchoolName] = useState<string | null>(null);
  const [apiYear, setApiYear] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (options?.audience === 'admin') {
        try {
          const res = await fetch('/api/admin/school-branding', {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          const body = await res.json();
          if (cancelled || !res.ok || !body?.success) return;
          const branding = body.data?.branding;
          if (!branding) return;
          if (typeof branding.schoolName === 'string' && branding.schoolName) {
            setApiSchoolName(branding.schoolName);
          }
          if (typeof branding.academicYearLabel === 'string' && branding.academicYearLabel) {
            setApiYear(branding.academicYearLabel);
          }
          if (branding.logoAvailable && branding.schoolCode) {
            setLogoAvailable(true);
            setLogoUrl(loginSchoolLogoBffPath(branding.schoolCode));
          }
        } catch {
          // Text fallback only — never block print.
        }
      } else if (options?.schoolCode) {
        setLogoAvailable(true);
        setLogoUrl(loginSchoolLogoBffPath(options.schoolCode));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [options?.audience, options?.schoolCode]);

  const schoolName =
    options?.schoolName?.trim() ||
    apiSchoolName ||
    sessionSchool ||
    t('admin.teachingPlanning.print.brandingUnavailable');

  return {
    schoolName,
    academicYearLabel: options?.academicYearLabel ?? apiYear,
    logoUrl,
    logoAvailable,
  };
}

export function TeachingPrintLink({
  href,
  className = 'btn btn--ghost btn--sm',
}: {
  href: string;
  className?: string;
}) {
  const t = useT();
  return (
    <Link href={href} className={className}>
      {t('admin.teachingPlanning.print.action')}
    </Link>
  );
}
