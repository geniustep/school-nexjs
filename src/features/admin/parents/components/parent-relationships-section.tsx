'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { GuardianEditDialog } from '@/features/admin/students/components/guardian-edit-dialog';
import { GuardianRemoveDialog } from '@/features/admin/students/components/guardian-remove-dialog';
import { GuardianRelationshipBadges } from '@/features/admin/students/components/guardian-relationship-badges';
import { useT } from '@/features/i18n/locale-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { relationshipTypeLabel, isRelationshipActive } from '@/features/admin/students/utils/relationship-types';
import { canDetachGuardianRelationship } from '@/features/admin/students/utils/guardian-removal-shared';
import { parentChildToGuardianRelationship } from '../utils/parent-child-guardian-relationship';
import { ParentLinkStudentDialog } from './parent-link-student-dialog';
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
            {t('admin.parentProfile.detachRelationship')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ParentRelationshipsSection({
  parent,
  onRelationshipChanged,
  loading = false,
  error = null,
  onRetry,
}: {
  parent: Parent;
  onRelationshipChanged: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const t = useT();
  const user = useSession();
  const activeChildren = parent.relationships ?? parent.children ?? [];
  const [linkOpen, setLinkOpen] = useState(false);
  const [editContext, setEditContext] = useState<{
    studentId: number;
    studentName: string;
    studentClassName: string;
    relationship: GuardianRelationship;
  } | null>(null);
  const [removeContext, setRemoveContext] = useState<{
    studentId: number;
    relationship: GuardianRelationship;
  } | null>(null);

  const linkedStudentIds = useMemo(
    () => new Set(activeChildren.map((child) => child.id)),
    [activeChildren],
  );

  const canLink =
    hasPermission(user, 'manage_parents') &&
    parent.allowed_actions?.edit_relationship !== false &&
    parent.status !== 'archived';
  const canManageRelationships = hasPermission(user, 'manage_parents');

  return (
    <section className="parent-relationships">
      <div className="parent-relationships__head">
        <div className="parent-relationships__head-main">
          <h3 className="parent-relationships__title">{t('admin.parentProfile.childrenAndRelationships')}</h3>
          {!loading && !error ? (
            <span className="tiny muted">
              {t('admin.parentProfile.activeRelationshipsCount', { count: activeChildren.length })}
            </span>
          ) : null}
        </div>
        {canLink ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setLinkOpen(true)}>
            {t('admin.parentProfile.linkStudentToParent')}
          </button>
        ) : null}
      </div>

      {!canLink && parent.allowed_actions?.edit_relationship === false ? (
        <p className="tiny muted">{t('admin.parentProfile.linkStudentForbidden')}</p>
      ) : null}

      {loading ? (
        <div className="parent-relationships__empty parent-relationships__empty--loading" aria-busy="true">
          <div className="parent-relationships__skeleton" />
          <div className="parent-relationships__skeleton parent-relationships__skeleton--short" />
        </div>
      ) : error ? (
        <div className="parent-relationships__empty">
          <p className="muted">{t('admin.parentProfile.relationshipsLoadError')}</p>
          {onRetry ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
              {t('admin.parentProfile.relationshipsRetry')}
            </button>
          ) : null}
        </div>
      ) : activeChildren.length ? (
        <ul className="parent-relationships__list">
          {activeChildren.map((child) => {
            const rel = child.relationship;
            const guardianRel = parentChildToGuardianRelationship(parent, child);
            const relType = rel?.relationship_type;
            const relLabel = relType ? relationshipTypeLabel(t, relType) : null;
            const studentName = getStudentDisplayName(child);
            const active = rel ? isRelationshipActive(rel.state ?? 'active', rel.active) : true;
            const canEdit = rel?.allowed_actions?.edit_relationship !== false && active && !!guardianRel;
            const canRemove =
              guardianRel != null &&
              canManageRelationships &&
              canDetachGuardianRelationship(rel?.allowed_actions, true) &&
              rel?.state !== 'ended';

            return (
              <li key={`${child.id}-${rel?.relationship_id ?? 'legacy'}`} className="parent-relationships__row">
                <div className="parent-relationships__main">
                  <div className="parent-relationships__student">
                    <span className="parent-relationships__student-name" dir="auto">
                      {studentName}
                    </span>
                    {child.code || child.school_number ? (
                      <span className="tiny mono muted" dir="ltr">
                        {child.code ?? child.school_number}
                      </span>
                    ) : null}
                  </div>
                  <p className="tiny muted">{childClassLabel(child, t('common.dash'))}</p>
                  {relLabel ? <p className="parent-relationships__relation-type">{relLabel}</p> : null}
                  {rel?.state ? (
                    <Badge tone={active ? 'green' : 'slate'}>{statusLabel(t, rel.state ?? 'active')}</Badge>
                  ) : null}
                  {guardianRel ? <GuardianRelationshipBadges rel={guardianRel} compactSummary /> : null}
                </div>

                <div className="parent-relationships__actions">
                  <Link href={`/admin/students/${child.id}`} className="btn btn--secondary btn--sm">
                    {t('admin.parentProfile.openStudentProfile')}
                  </Link>
                  {canEdit ? (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() =>
                        guardianRel &&
                        setEditContext({
                          studentId: child.id,
                          studentName,
                          studentClassName: childClassLabel(child, t('common.dash')),
                          relationship: guardianRel,
                        })
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
        <div className="parent-relationships__empty">
          <p className="parent-relationships__empty-title">{t('admin.parentProfile.noActiveRelationships')}</p>
          <p className="tiny muted">{t('admin.parentProfile.noActiveRelationshipsHint')}</p>
          {canLink ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setLinkOpen(true)}>
              {t('admin.parentProfile.linkStudentToParent')}
            </button>
          ) : null}
        </div>
      )}

      <ParentLinkStudentDialog
        open={linkOpen}
        parent={parent}
        linkedStudentIds={linkedStudentIds}
        onClose={() => setLinkOpen(false)}
        onLinked={onRelationshipChanged}
      />

      {editContext ? (
        <GuardianEditDialog
          open
          studentId={editContext.studentId}
          relationship={editContext.relationship}
          studentName={editContext.studentName}
          studentClassName={editContext.studentClassName}
          personContact={{
            phone: parent.phone,
            mobile: parent.mobile,
            email: parent.email,
          }}
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
