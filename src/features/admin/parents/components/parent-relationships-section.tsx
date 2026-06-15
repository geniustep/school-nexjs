'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { GuardianEditDialog } from '@/features/admin/students/components/guardian-edit-dialog';
import { GuardianRemoveDialog } from '@/features/admin/students/components/guardian-remove-dialog';
import { GuardianRelationshipBadges } from '@/features/admin/students/components/guardian-relationship-badges';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { relationshipTypeLabel, isRelationshipActive } from '@/features/admin/students/utils/relationship-types';
import { parentChildToGuardianRelationship } from '../utils/parent-child-guardian-relationship';
import type { Parent, ParentChild } from '@/types/parent';
import type { GuardianRelationship } from '@/types/student-360';

function childClassLabel(child: ParentChild, dash: string): string {
  const classRef = child.class as { display_name?: string; name?: string } | null;
  const levelRef = child.level as { display_name?: string; name?: string; display_alias?: string } | null;
  const className = classRef?.display_name ?? classRef?.name;
  const levelName = levelRef?.display_name ?? levelRef?.name ?? levelRef?.display_alias;
  if (className && levelName) return `${className} · ${levelName}`;
  return className ?? levelName ?? dash;
}

function RelationshipRowMenu({
  canRemove,
  onRemove,
}: {
  canRemove: boolean;
  onRemove: () => void;
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

  if (!canRemove) return null;

  return (
    <div className="parent-relationships__menu" ref={ref}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('admin.student360.quickActions.more')}
      </button>
      {open ? (
        <div className="parent-relationships__menu-panel">
          <button
            type="button"
            className="parent-relationships__menu-item parent-relationships__menu-item--danger"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            {t('admin.student360.removeGuardianFromStudent')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ParentRelationshipsSection({
  parent,
  onRelationshipChanged,
}: {
  parent: Parent;
  onRelationshipChanged: () => void;
}) {
  const t = useT();
  const children = parent.relationships ?? parent.children ?? [];
  const [editContext, setEditContext] = useState<{
    studentId: number;
    relationship: GuardianRelationship;
  } | null>(null);
  const [removeContext, setRemoveContext] = useState<{
    studentId: number;
    relationship: GuardianRelationship;
  } | null>(null);

  return (
    <section className="parent-relationships">
      <div className="parent-relationships__head">
        <h3 className="parent-relationships__title">{t('admin.parentProfile.childrenAndRelationships')}</h3>
      </div>

      {children.length ? (
        <ul className="parent-relationships__list">
          {children.map((child) => {
            const rel = child.relationship;
            const guardianRel = parentChildToGuardianRelationship(parent, child);
            const relType = rel?.relationship_type;
            const relLabel = relType ? relationshipTypeLabel(t, relType) : null;
            const studentName = getStudentDisplayName(child);
            const active = rel ? isRelationshipActive(rel.state ?? 'active', rel.active) : true;
            const canEdit = rel?.allowed_actions?.edit_relationship !== false && active && !!guardianRel;
            const canRemove =
              rel?.relationship_id != null &&
              rel?.allowed_actions?.remove_relationship !== false &&
              rel?.state !== 'ended';

            return (
              <li key={`${child.id}-${rel?.relationship_id ?? 'legacy'}`} className="parent-relationships__row">
                <div className="parent-relationships__main">
                  <div className="parent-relationships__student">
                    <Link href={`/admin/students/${child.id}`} className="parent-relationships__student-name" dir="auto">
                      {studentName}
                    </Link>
                    {child.code || child.school_number ? (
                      <span className="tiny mono muted" dir="ltr">
                        {child.code ?? child.school_number}
                      </span>
                    ) : null}
                  </div>
                  <p className="tiny muted">{childClassLabel(child, t('common.dash'))}</p>
                  {relLabel ? (
                    <p className="tiny muted">
                      {t('admin.student360.relationshipTypeLabel')}: {relLabel}
                    </p>
                  ) : null}
                  {rel?.state ? (
                    <Badge tone={active ? 'green' : 'slate'}>{statusLabel(t, rel.state ?? 'active')}</Badge>
                  ) : null}
                  {guardianRel ? <GuardianRelationshipBadges rel={guardianRel} /> : null}
                </div>

                <div className="parent-relationships__actions">
                  <Link href={`/admin/students/${child.id}?tab=guardians`} className="btn btn--ghost btn--sm">
                    {t('admin.student360.guardiansOpenStudentProfile')}
                  </Link>
                  {canEdit ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        guardianRel &&
                        setEditContext({ studentId: child.id, relationship: guardianRel })
                      }
                    >
                      {t('admin.parentProfile.editRelationship')}
                    </button>
                  ) : null}
                  <RelationshipRowMenu
                    canRemove={!!canRemove}
                    onRemove={() =>
                      guardianRel && setRemoveContext({ studentId: child.id, relationship: guardianRel })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t('admin.noLinkedChildren')}</p>
      )}

      {editContext ? (
        <GuardianEditDialog
          open
          studentId={editContext.studentId}
          relationship={editContext.relationship}
          onClose={() => setEditContext(null)}
          onUpdated={onRelationshipChanged}
          successMessageKey="admin.parentProfile.relationshipUpdated"
        />
      ) : null}

      {removeContext ? (
        <GuardianRemoveDialog
          open
          studentId={removeContext.studentId}
          relationship={removeContext.relationship}
          onClose={() => setRemoveContext(null)}
          onRemoved={() => {
            setRemoveContext(null);
            onRelationshipChanged();
          }}
        />
      ) : null}
    </section>
  );
}
