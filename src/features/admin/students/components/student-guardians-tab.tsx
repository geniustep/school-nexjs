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

  return (
    <div className="student-360-tab-panel">
      <div className="student-360-section-header">
        <div>
          <h2 className="student-360-section-header__title">{t('admin.student360.guardiansTitle')}</h2>
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
            {active.map((rel) => (
              <GuardianRelationshipCard
                key={rel.relationship_id}
                rel={rel}
                canManage={canManageGuardians}
                onEdit={() => setEditRel(rel)}
                onEnd={() => setEndRel(rel)}
                onCopyPhone={copyPhone}
                onAccountCreated={onChanged}
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
