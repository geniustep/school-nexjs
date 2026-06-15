'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import { formatRoleLabels, personProfileHref } from '../utils/person-role-presentation';
import { isPersonArchived } from '../utils/guardian-profile-contract';
import type { PersonSearchResult } from '@/types/student-360';

function ResultRowMenu({
  canDelete,
  onDelete,
}: {
  canDelete: boolean;
  onDelete: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!canDelete) return null;

  return (
    <div className="guardian-search-card__menu" ref={ref}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((v) => !v)}>
        {t('admin.student360.quickActions.more')}
      </button>
      {open ? (
        <div className="guardian-search-card__menu-panel">
          <button
            type="button"
            className="guardian-search-card__menu-item guardian-search-card__menu-item--danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            {t('admin.guardianProfile.deleteGuardianProfileAction')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function GuardianSearchResultCard({
  person,
  alreadyLinked,
  canLink,
  canRestore,
  canDelete,
  blockerHint,
  onLink,
  onRestore,
  onDelete,
}: {
  person: PersonSearchResult;
  alreadyLinked: boolean;
  canLink: boolean;
  canRestore: boolean;
  canDelete: boolean;
  blockerHint?: string | null;
  onLink: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const archived = isPersonArchived(person);
  const roleLine = formatRoleLabels(person.role_labels);

  return (
    <article
      className={`guardian-search-card${archived ? ' guardian-search-card--archived' : ''}`}
    >
      <div className="guardian-search-card__main">
        <div className="guardian-search-card__head">
          <strong dir="auto">{person.name}</strong>
          <div className="guardian-search-card__badges">
            <Badge tone={archived ? 'slate' : 'green'}>
              {archived ? t('admin.guardianProfile.archivedBadge') : t('admin.guardianProfile.activeBadge')}
            </Badge>
            {roleLine ? <span className="tiny muted">{roleLine}</span> : null}
          </div>
        </div>

        {person.phone ? (
          <span className="tiny mono" dir="ltr">
            {formatMoroccanPhoneDisplay(person.phone)}
          </span>
        ) : null}
        {person.email ? (
          <span className="tiny" dir="ltr">
            {person.email}
          </span>
        ) : null}

        <Badge tone={person.has_user_account ? 'green' : 'slate'}>
          {person.has_user_account ? t('admin.student360.hasLoginAccount') : t('admin.student360.noLoginAccount')}
        </Badge>

        {alreadyLinked ? (
          <span className="guardian-search-panel__badge">{t('admin.student360.alreadyLinkedGuardian')}</span>
        ) : null}

        {archived ? (
          <p className="tiny guardian-search-card__archived-note">{t('admin.guardianProfile.archivedCannotLinkHint')}</p>
        ) : null}

        {blockerHint && archived ? <p className="tiny muted">{blockerHint}</p> : null}
      </div>

      <div className="guardian-search-card__actions">
        {canLink ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onLink}>
            {t('admin.student360.linkPersonAsGuardian')}
          </button>
        ) : null}
        {canRestore ? (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onRestore}>
            {t('admin.guardianProfile.restoreAction')}
          </button>
        ) : null}
        <Link href={personProfileHref(person)} className="btn btn--ghost btn--sm">
          {t('admin.student360.guardiansOpenProfile')}
        </Link>
        <ResultRowMenu canDelete={canDelete} onDelete={onDelete} />
      </div>
    </article>
  );
}
