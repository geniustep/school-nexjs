'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Intent-aware school communication entrypoint.
 * Announcement and message reuse the same governed compose journey;
 * channel compose remains separate.
 */

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GeneralCommunicationComposeWorkspace } from '@/features/communication/components/general-communication-compose-workspace';
import { useT } from '@/features/i18n/locale-context';

type ComposeContentType = 'announcement' | 'message';

function readContentType(raw: string | null): ComposeContentType | null {
  return raw === 'announcement' || raw === 'message' ? raw : null;
}

function AdminCommunicationComposeContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const contentType = readContentType(searchParams.get('content_type'));

  if (!contentType) {
    return (
      <div
        className="general-comm admin-workspace"
        data-testid="communication-content-type-chooser"
      >
        <header className="general-comm__header">
          <div>
            <p className="tiny general-comm__eyebrow">
              {t('channels.schoolCommunicationTitle')}
            </p>
            <h1>{t('communication.general.newCommunication')}</h1>
            <p className="muted">{t('communication.general.subtitle')}</p>
          </div>
          <Link href="/admin/announcements" className="btn btn--ghost btn--sm">
            {t('common.back')}
          </Link>
        </header>

        <section className="general-comm__card">
          <h2>{t('communication.general.chooseMode')}</h2>
          <div className="general-comm__intent-grid">
            <Link
              href="/admin/communication/compose?content_type=announcement"
              className="general-comm__intent-card"
            >
              <span className="general-comm__intent-icon" aria-hidden="true">
                📣
              </span>
              <strong>{t('communication.contentType.announcement')}</strong>
            </Link>
            <Link
              href="/admin/communication/compose?content_type=message"
              className="general-comm__intent-card"
            >
              <span className="general-comm__intent-icon" aria-hidden="true">
                ✉️
              </span>
              <strong>{t('communication.contentType.message')}</strong>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const labelKey =
    contentType === 'announcement'
      ? 'communication.contentType.announcement'
      : 'communication.contentType.message';

  return (
    <div className={`general-comm-intent general-comm-intent--${contentType}`}>
      <div className="admin-workspace general-comm__intent-context">
        <div className="wrap-gap">
          <span aria-hidden="true">{contentType === 'announcement' ? '📣' : '✉️'}</span>
          <strong>{t(labelKey)}</strong>
        </div>
        <Link href="/admin/communication/compose" className="btn btn--ghost btn--sm">
          {t('common.edit')}
        </Link>
      </div>
      <GeneralCommunicationComposeWorkspace key={contentType} contentType={contentType} />
    </div>
  );
}

export default function AdminCommunicationComposePage() {
  return (
    <Suspense fallback={null}>
      <AdminCommunicationComposeContent />
    </Suspense>
  );
}
