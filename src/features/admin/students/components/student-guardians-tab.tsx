'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { GuardianRelationshipCard } from './guardian-relationship-card';
import { GuardianAddDialog } from './guardian-add-dialog';
import { GuardianEditDialog } from './guardian-edit-dialog';
import { GuardianEndDialog } from './guardian-end-dialog';
import { Student360CompactEmpty } from './student-360-compact-empty';
import { isRelationshipActive } from '../utils/relationship-types';
import {
  findDuplicateStrongRelationshipTypes,
  duplicateRelationshipMessage,
} from '../utils/guardian-duplicate-relationship-alert';
import {
  isDefaultBillingGuardian,
  resolveDefaultBillingGuardian,
} from '../utils/resolve-default-billing-guardian';
import type { GuardianRelationship, StudentDetailsData } from '@/types/student-360';

export function StudentGuardiansTab({
  details,
  canManageGuardians,
  onChanged,
}: {
  details: StudentDetailsData;
  canManageGuardians: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const studentId = details.student.id;
  const [addOpen, setAddOpen] = useState(false);
  const [editRel, setEditRel] = useState<GuardianRelationship | null>(null);
  const [endRel, setEndRel] = useState<GuardianRelationship | null>(null);

  const active = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const ended = details.guardian_relationships.filter(
    (r) => !isRelationshipActive(r.state, r.active),
  );

  function copyPhone(phone: string) {
    void navigator.clipboard.writeText(phone).then(() => {
      toast.success(t('admin.student360.guardiansCopiedPhone'));
    });
  }

  const duplicateAlerts = findDuplicateStrongRelationshipTypes(details.guardian_relationships);
  const duplicateMessage = duplicateRelationshipMessage(t, duplicateAlerts);
  const billingResolution = resolveDefaultBillingGuardian(details.guardian_relationships);

  const sortedActive = [...active].sort((a, b) => {
    if (a.is_primary_contact !== b.is_primary_contact) return a.is_primary_contact ? -1 : 1;
    const aBilling = isDefaultBillingGuardian(a.guardian.id, billingResolution);
    const bBilling = isDefaultBillingGuardian(b.guardian.id, billingResolution);
    if (aBilling !== bBilling) return aBilling ? -1 : 1;
    return a.guardian.name.localeCompare(b.guardian.name, undefined, { sensitivity: 'base' });
  });

  return (
    <div className="student-360-tab-panel">
      <div className="student-360-section-header student-360-section-header--guardians">
        <div className="student-360-section-header__main">
          <div className="student-360-section-header__title-row">
            <h2 className="student-360-section-header__title">{t('admin.student360.guardiansTitle')}</h2>
            {active.length > 0 ? (
              <span className="student-360-section-header__count">{t('admin.student360.guardiansActiveCount', { count: active.length })}</span>
            ) : null}
          </div>
          <p className="student-360-section-header__desc">{t('admin.student360.pages.guardians.description')}</p>
        </div>
        {canManageGuardians ? (
          <div className="student-360-section-header__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
              {t('admin.student360.addGuardian')}
            </button>
          </div>
        ) : null}
      </div>

      {duplicateMessage ? (
        <div className="student-360-guardians-alert" role="status">
          <p>{duplicateMessage}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => sortedActive[1] && setEditRel(sortedActive[1])}>
            {t('admin.student360.guardiansReviewRelationships')}
          </button>
        </div>
      ) : null}

      {active.length === 0 && ended.length === 0 ? (
        <Student360CompactEmpty
          title={t('admin.student360.noGuardiansTitle')}
          description={t('admin.student360.guardiansEmptyDesc')}
          action={
            canManageGuardians ? (
              <>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
                  {t('admin.student360.addGuardian')}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddOpen(true)}>
                  {t('admin.student360.searchExisting')}
                </button>
              </>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="student-360-guardians-grid">
            {sortedActive.map((rel) => (
              <GuardianRelationshipCard
                key={rel.relationship_id}
                rel={rel}
                canManage={canManageGuardians}
                isDefaultBilling={isDefaultBillingGuardian(rel.guardian.id, billingResolution)}
                onEdit={() => setEditRel(rel)}
                onEnd={() => setEndRel(rel)}
                onCopyPhone={copyPhone}
                onAccountChanged={onChanged}
              />
            ))}
          </div>
          {ended.length > 0 ? (
            <section className="student-360-section">
              <SectionHead title={t('admin.student360.endedRelationships')} />
              <div className="student-360-guardians-grid">
                {ended.map((rel) => (
                  <GuardianRelationshipCard
                    key={rel.relationship_id}
                    rel={rel}
                    canManage={false}
                    onEdit={() => {}}
                    onEnd={() => {}}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <GuardianAddDialog
        open={addOpen}
        studentId={studentId}
        relationships={details.guardian_relationships}
        onClose={() => setAddOpen(false)}
        onLinked={onChanged}
      />
      <GuardianEditDialog
        open={!!editRel}
        studentId={studentId}
        relationship={editRel}
        onClose={() => setEditRel(null)}
        onUpdated={onChanged}
      />
      <GuardianEndDialog
        open={!!endRel}
        studentId={studentId}
        relationship={endRel}
        onClose={() => setEndRel(null)}
        onEnded={onChanged}
      />
    </div>
  );
}
