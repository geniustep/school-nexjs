'use client';

import { useEffect, useMemo, useState } from 'react';
import { AccountFieldsSection } from '@/features/admin/account/account-fields-section';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { getMessage, MESSAGES } from '@/lib/i18n/messages';
import {
  applyAccountMutationToasts,
  resolveAccountMutationFeedback,
} from '@/lib/account/account-mutation-feedback';
import { mapAccountApiError } from '@/lib/account/account-errors';
import {
  buildAccountIdentityPayload,
  validateCreateAccountInput,
} from '@/lib/account/account-utils';
import type { StaffCapabilityOption, StaffMember, StaffOptions } from '@/types/academic-setup';
import {
  createStaffMember,
  deactivateStaffMember,
  updateStaffMember,
  useStaffMember,
} from '../hooks/use-staff';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import {
  staffMutationSuccessKey,
} from '../utils/staff-utils';
import {
  staffShowsDeactivate,
  staffShowsReactivate,
} from './staff-reactivate-dialog';
import { SetupDrawer } from './setup-drawer';

function staffCapabilityLabel(
  locale: keyof typeof MESSAGES,
  cap: StaffCapabilityOption,
): string {
  const key = `admin.academicSetup.capabilities.${cap.code}`;
  return getMessage(MESSAGES[locale], key) ?? getMessage(MESSAGES.en, key) ?? cap.label;
}

function resolveStaffLogin(member: StaffMember): string {
  return member.login?.trim() || member.account?.login?.trim() || member.email?.trim() || '';
}

export function StaffFormDrawer({
  open,
  memberId,
  member: memberFromList,
  options,
  canManage,
  onClose,
  onSaved,
  onReactivate,
}: {
  open: boolean;
  memberId: number | null;
  member?: StaffMember;
  options?: StaffOptions;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
  onReactivate?: (member: StaffMember) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const memberState = useStaffMember(memberFromList ? null : memberId);
  const member = memberFromList ?? memberState.data;
  const creating = memberId == null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [useDifferentLogin, setUseDifferentLogin] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalLogin, setOriginalLogin] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [adminKind, setAdminKind] = useState('');
  const [capabilityIds, setCapabilityIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (creating) {
      setName('');
      setEmail('');
      setLogin('');
      setUseDifferentLogin(false);
      setOriginalEmail('');
      setOriginalLogin('');
      setPhone('');
      setJobTitle('');
      setAdminKind(options?.admin_kinds[0]?.value ?? 'admin_staff');
      setCapabilityIds([]);
      return;
    }
    if (!member) return;
    const memberEmail = member.email ?? '';
    const memberLogin = resolveStaffLogin(member);
    setName(member.name);
    setEmail(memberEmail);
    setLogin(memberLogin);
    setOriginalEmail(memberEmail);
    setOriginalLogin(memberLogin);
    setUseDifferentLogin(Boolean(memberLogin && memberEmail && memberLogin !== memberEmail));
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

  const accountEntity = useMemo(() => member ?? undefined, [member]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;

    if (creating && !validateCreateAccountInput(email, login, useDifferentLogin)) {
      toast.error(t('admin.account.errors.loginRequired'));
      return;
    }

    const identity = buildAccountIdentityPayload({
      email,
      login,
      originalEmail,
      originalLogin,
      useDifferentLogin,
      isCreate: creating,
    });

    const payload = {
      name: name.trim(),
      ...identity,
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
      const staffMsg = mapAcademicSetupApiError(res.error, t, 'staff');
      const accountMsg = mapAccountApiError(res.error, t);
      toast.error(staffMsg !== t('errors.serverError') ? staffMsg : accountMsg);
      return;
    }

    const feedback = resolveAccountMutationFeedback(res, t, {
      createdKey: 'admin.account.accountCreated',
      updatedKey: 'admin.saveSuccess',
      alreadyExistsKey: 'admin.account.accountAlreadyExists',
    });
    if (feedback) applyAccountMutationToasts(feedback, toast);
    else toast.success(t('admin.saveSuccess'));

    onSaved();
  }

  async function deactivate() {
    if (!memberId || !member) return;
    const message = `${t('admin.academicSetup.confirmDeactivateStaff')}\n\n${t('admin.academicSetup.deactivationPreservesAccount')}`;
    if (!window.confirm(message)) return;
    setSaving(true);
    const res = await deactivateStaffMember(memberId);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'staff'));
      return;
    }
    const key = staffMutationSuccessKey(res.data?.action);
    toast.success(key ? t(key) : t('admin.actionSuccess'));
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
          {!creating && accountEntity ? (
            <AccountStatusBadge entity={accountEntity} showLogin />
          ) : null}
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.fullName')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <AccountFieldsSection
            mode={creating ? 'create' : 'edit'}
            email={email}
            login={login}
            useDifferentLogin={useDifferentLogin}
            onEmailChange={setEmail}
            onLoginChange={setLogin}
            onUseDifferentLoginChange={setUseDifferentLogin}
            disabled={!canManage || saving}
          />
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.phone')}</span>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
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
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {canManage && (
              <button type="submit" className="btn btn--primary btn--sm" disabled={saving} style={{ minHeight: 44 }}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            )}
            {!creating && canManage && member && staffShowsDeactivate(member, canManage) && (
              <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={deactivate}>
                {t('admin.academicSetup.deactivateStaff')}
              </button>
            )}
            {!creating && canManage && member && staffShowsReactivate(member, canManage) && onReactivate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={saving}
                style={{ minHeight: 44 }}
                onClick={() => onReactivate(member)}
              >
                {t('admin.academicSetup.reactivateStaff')}
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
