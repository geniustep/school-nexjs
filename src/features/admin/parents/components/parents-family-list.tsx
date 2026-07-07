'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { relationshipTypeLabel } from '@/features/admin/students/utils/relationship-types';
import type { ParentFamilyGroup } from '@/features/admin/parents/utils/group-parents-by-family';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { ParentAccountIdentityInline } from './parent-account-identity-inline';

export function ParentsFamilyList({ families }: { families: ParentFamilyGroup[] }) {
  const t = useT();

  return (
    <div className="parents-family-list">
      {families.map((family, familyIndex) => {
        const childrenLabel = family.children.length
          ? family.children.map((child) => getStudentDisplayName(child)).join('، ')
          : t('admin.noLinkedChildren');

        return (
          <article
            key={`${family.id}-${familyIndex}`}
            className={`parents-family-card${family.children.length === 0 ? ' parents-family-card--solo' : ''}`}
          >
            <div className="parents-family-card__accent" aria-hidden="true" />

            <div className="parents-family-card__body">
              <div className="parents-family-card__field">
                <span className="parents-family-card__field-label">{t('admin.linkedChildren')}:</span>
                <div className="parents-family-card__field-value">
                  {family.children.length > 0 ? (
                    <span className="parents-family-card__children-names" dir="auto">
                      {family.children.map((child, childIndex) => (
                        <span key={`${child.id ?? 'child'}-${childIndex}`}>
                          {childIndex > 0 ? '، ' : null}
                          {typeof child.id === 'number' ? (
                            <Link href={`/admin/students/${child.id}`} className="parents-family-card__child-name">
                              {getStudentDisplayName(child)}
                            </Link>
                          ) : (
                            getStudentDisplayName(child)
                          )}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="muted">{childrenLabel}</span>
                  )}
                </div>
              </div>

              <div className="parents-family-card__field parents-family-card__field--guardians">
                <span className="parents-family-card__field-label">
                  {t('admin.parentsList.guardiansTitle')}:
                </span>
                <ul className="parents-family-card__guardian-lines">
                  {family.guardians.map(({ parent, relationshipType }, guardianIndex) => (
                    <li key={`${parent.id}-${guardianIndex}`} className="parents-family-card__guardian-line">
                      <span className="parents-family-card__guardian-role">
                        {relationshipTypeLabel(t, relationshipType)}:
                      </span>
                      <div className="parents-family-card__guardian-content">
                        <Link
                          href={`/admin/parents/${parent.id}`}
                          className="parents-family-card__guardian-name"
                          dir="auto"
                        >
                          {parent.name}
                        </Link>
                        <span className="parents-family-card__guardian-meta">
                          {parent.phone ?? parent.mobile ? (
                            <span className="mono">{parent.phone ?? parent.mobile}</span>
                          ) : null}
                          {parent.email ? <span dir="ltr">{parent.email}</span> : null}
                          <ParentAccountIdentityInline parent={parent} />
                        </span>
                      </div>
                      <div className="parents-family-card__guardian-actions">
                        <Badge tone={parent.status === 'active' ? 'green' : 'slate'}>
                          {statusLabel(t, parent.status)}
                        </Badge>
                        <Link
                          href={`/admin/parents/${parent.id}`}
                          className="parents-family-card__view-link"
                          aria-label={t('common.view')}
                          title={t('common.view')}
                        >
                          <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
