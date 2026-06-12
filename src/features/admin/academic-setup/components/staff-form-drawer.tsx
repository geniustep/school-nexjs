'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { getMessage, MESSAGES } from '@/lib/i18n/messages';
import type { StaffCapabilityOption, StaffMember, StaffOptions } from '@/types/academic-setup';
import {
  createStaffMember,
  deactivateStaffMember,
  updateStaffMember,
  useStaffMember,
} from '../hooks/use-staff';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { SetupDrawer } from './setup-drawer';

function staffCapabilityLabel(
  locale: keyof typeof MESSAGES,
  cap: StaffCapabilityOption,
): string {
  const key = `admin.academicSetup.capabilities.${cap.code}`;
  return getMessage(MESSAGES[locale], key) ?? getMessage(MESSAGES.en, key) ?? cap.label;
}

export function StaffFormDrawer({
  open,
  memberId,
  member: memberFromList,
  options,
  canManage,
  onClose,
  onSaved,
}: {
  open: boolean;
  memberId: number | null;
  /** List row used to prefill edit form (detail GET may omit fields). */
  member?: StaffMember;
  options?: StaffOptions;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const memberState = useStaffMember(memberFromList ? null : memberId);
  const member = memberFromList ?? memberState.data;
  const creating = memberId == null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [adminKind, setAdminKind] = useState('');
  const [capabilityIds, setCapabilityIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (creating) {
      setName('');
      setEmail('');
      setPhone('');
      setJobTitle('');
      setAdminKind(options?.admin_kinds[0]?.value ?? 'admin_staff');
      setCapabilityIds([]);
      return;
    }
    if (!member) return;
    setName(member.name);
    setEmail(member.email ?? '');
    setPhone(member.phone ?? '');
    setJobTitle(member.job_title ?? '');
    setAdminKind(member.admin_kind);
    const capabilityCodes = member.capabilities?.length
      ? member.capabilities
      : (member.permissions ?? []);
    setCapabilityIds(
      capabilityCodes
        .map((code) => options?.capabilities.find((c) => c.code === code)?.id)
        .filter((id): id is number => id != null),
    );
  }, [member, creating, options, memberId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
      admin_kind: adminKind,
      capability_ids: capabilityIds,
    };
    setSaving(true);
    const res = creating
      ? await createStaffMember(payload)
      : await updateStaffMember(memberId!, payload);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'staff'));
      return;
    }
    toast.success(t('admin.saveSuccess'));
    onSaved();
  }

  async function deactivate() {
    if (!memberId || !window.confirm(t('admin.academicSetup.confirmDeactivateStaff'))) return;
    setSaving(true);
    const res = await deactivateStaffMember(memberId);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'staff'));
      return;
    }
    toast.success(t('admin.actionSuccess'));
    onSaved();
  }

  const capabilitiesByCategory = (options?.capabilities ?? []).reduce<Record<string, StaffCapabilityOption[]>>(
    (acc, cap) => {
      const cat = cap.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat]!.push(cap);
      return acc;
    },
    {},
  );

  return (
    <SetupDrawer
      open={open}
      title={creating ? t('admin.academicSetup.addStaff') : t('admin.academicSetup.editStaff')}
      onClose={onClose}
    >
      {memberState.loading && !creating && !member ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <form className="col" style={{ gap: 12 }} onSubmit={submit}>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.fullName')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <label className="col" style={{ gap: 4, flex: 1 }}>
              <span className="tiny muted">{t('admin.email')}</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="col" style={{ gap: 4, flex: 1 }}>
              <span className="tiny muted">{t('admin.phone')}</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.jobTitle')}</span>
            <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.adminKindLabel')}</span>
            <select className="input" value={adminKind} onChange={(e) => setAdminKind(e.target.value)}>
              {(options?.admin_kinds ?? []).map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </label>
          {Object.entries(capabilitiesByCategory).map(([cat, caps]) => (
            <fieldset key={cat} className="col" style={{ gap: 6 }}>
              <legend className="tiny muted">{t(`admin.academicSetup.capCategory.${cat}`)}</legend>
              {(caps ?? []).filter((c) => c.grantable).map((cap) => (
                <label key={cap.id} className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={capabilityIds.includes(cap.id)}
                    onChange={() =>
                      setCapabilityIds((prev) =>
                        prev.includes(cap.id) ? prev.filter((x) => x !== cap.id) : [...prev, cap.id],
                      )
                    }
                  />
                  <span>{staffCapabilityLabel(locale, cap)}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <div className="row" style={{ gap: 8 }}>
            {canManage && (
              <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            )}
            {!creating && canManage && (
              <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={deactivate}>
                {t('admin.academicSetup.deactivateStaff')}
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </SetupDrawer>
  );
}
