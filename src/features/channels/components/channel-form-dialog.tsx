'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  createAdminChannel,
  updateAdminChannel,
} from '@/features/channels/api/admin-channels-api';
import {
  channelLifecycleErrorKey,
} from '@/features/channels/utils/channel-lifecycle-errors';
import {
  channelNeedsClassId,
  isSystemChannelType,
  resolveChannelType,
} from '@/features/channels/utils/admin-channel-actions';
import {
  ADMIN_MANUAL_CHANNEL_TYPES,
  ADMIN_SYSTEM_CHANNEL_TYPES,
  type AdminChannel,
  type AdminCreatableChannelType,
  type CreateAdminChannelInput,
  type UpdateAdminChannelInput,
} from '@/types/admin-channel';
import type { Ref } from '@/types/api';

type Mode = 'create' | 'edit';

type ClassOption = Ref & { code?: string | null };

export function ChannelFormDialog({
  open,
  mode,
  channel,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: Mode;
  channel?: AdminChannel | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const formId = useId();
  const submitGuardRef = useRef(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<AdminCreatableChannelType>('teachers');
  const [classId, setClassId] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [allowAttachments, setAllowAttachments] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const needsClass = mode === 'create' && channelNeedsClassId(channelType);
  const systemProvisioning = mode === 'create' && isSystemChannelType(channelType);

  useEffect(() => {
    if (!open) {
      submitGuardRef.current = false;
      setSubmitting(false);
      setError(null);
      return;
    }
    if (mode === 'edit' && channel) {
      setName(channel.name ?? '');
      setDescription(channel.description ?? '');
      setReadOnly(Boolean(channel.read_only));
      setAllowAttachments(channel.allow_attachments !== false);
      setNotifyEmail(Boolean(channel.notify_email));
      setChannelType(
        (resolveChannelType(channel) as AdminCreatableChannelType) || 'teachers',
      );
      setClassId(channel.class?.id != null ? String(channel.class.id) : '');
    } else {
      setName('');
      setDescription('');
      setChannelType('teachers');
      setClassId('');
      setReadOnly(false);
      setAllowAttachments(true);
      setNotifyEmail(false);
    }
    setError(null);
    submitGuardRef.current = false;
  }, [open, mode, channel]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  useEffect(() => {
    if (!open || mode !== 'create' || !needsClass) return;
    let active = true;
    // Drop class from a prior school before options for the active school load.
    setClassId('');
    setClasses([]);
    setError(null);
    setClassesLoading(true);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId, page_size: 200 } : { page_size: 200 };
    api.get<ClassOption[]>(endpoints.admin.classes, query).then((res) => {
      if (!active) return;
      setClassesLoading(false);
      if (res.success && Array.isArray(res.data)) {
        setClasses(res.data.map((row) => ({ id: row.id, name: row.name })));
      } else {
        setClasses([]);
        setError(t('channels.lifecycle.errors.classesLoadFailed'));
      }
    });
    return () => {
      active = false;
    };
  }, [open, mode, needsClass, activeSchoolId]);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function confirm() {
    if (submitting || submitGuardRef.current) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('channels.lifecycle.errors.nameRequired'));
      return;
    }
    const selectedClassId = needsClass ? Number(classId) : NaN;
    const classValidForSchool =
      !needsClass ||
      (Boolean(classId) &&
        Number.isFinite(selectedClassId) &&
        classes.some((cls) => Number(cls.id) === selectedClassId));
    if (needsClass && !classValidForSchool) {
      setError(t('channels.lifecycle.errors.classRequired'));
      return;
    }

    submitGuardRef.current = true;
    setSubmitting(true);
    setError(null);

    const schoolQuery =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

    let res;
    if (mode === 'create') {
      const input: CreateAdminChannelInput = {
        name: trimmedName,
        description: description.trim() || null,
        channel_type: channelType,
        read_only: readOnly,
        allow_attachments: allowAttachments,
        notify_email: notifyEmail,
      };
      if (needsClass) input.class_id = selectedClassId;
      res = await createAdminChannel(input, schoolQuery);
    } else if (channel) {
      const input: UpdateAdminChannelInput = {
        name: trimmedName,
        description: description.trim(),
        read_only: readOnly,
        allow_attachments: allowAttachments,
        notify_email: notifyEmail,
      };
      res = await updateAdminChannel(channel.id, input, schoolQuery);
    } else {
      setSubmitting(false);
      submitGuardRef.current = false;
      return;
    }

    if (!res.success) {
      setError(t(channelLifecycleErrorKey(res.error.code)));
      setSubmitting(false);
      submitGuardRef.current = false;
      return;
    }

    setSubmitting(false);
    submitGuardRef.current = false;
    onSuccess();
    onClose();
  }

  const creatableTypes: AdminCreatableChannelType[] = [
    ...ADMIN_MANUAL_CHANNEL_TYPES,
    ...ADMIN_SYSTEM_CHANNEL_TYPES,
  ];

  return (
    <ConfirmationDialog
      open={open}
      size="form"
      closeOnBackdrop={!submitting}
      loading={submitting}
      title={
        mode === 'create'
          ? t('channels.lifecycle.createTitle')
          : t('channels.lifecycle.editTitle')
      }
      confirmLabel={
        mode === 'create'
          ? t('channels.lifecycle.createSubmit')
          : t('channels.lifecycle.saveChanges')
      }
      cancelLabel={t('common.cancel')}
      onConfirm={() => void confirm()}
      onClose={handleClose}
      body={
        <div className="form-stack" data-testid="channel-form-dialog">
          {error ? (
            <p className="form-error" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}

          {mode === 'edit' && channel ? (
            <div className="channels-lifecycle-readonly" role="group" aria-label={t('channels.lifecycle.systemIdentity')}>
              <p className="tiny muted">
                <span>{t('channels.lifecycle.channelType')}: </span>
                <strong dir="auto">{t(`channels.type.${resolveChannelType(channel)}`)}</strong>
              </p>
              {channel.is_system_managed ? (
                <p className="tiny muted">{t('channels.lifecycle.systemManagedHint')}</p>
              ) : null}
              {channel.class?.name ? (
                <p className="tiny muted" dir="auto">
                  {t('channels.lifecycle.classLabel')}: {channel.class.name}
                </p>
              ) : null}
              {channel.academic_year?.name ? (
                <p className="tiny muted" dir="auto">
                  {t('channels.lifecycle.yearLabel')}: {channel.academic_year.name}
                </p>
              ) : null}
            </div>
          ) : null}

          <label htmlFor={`${formId}-name`}>
            {t('channels.lifecycle.name')}
            <input
              id={`${formId}-name`}
              className="input"
              dir="auto"
              required
              value={name}
              disabled={submitting}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${formId}-error` : undefined}
            />
          </label>

          <label htmlFor={`${formId}-description`}>
            {t('channels.lifecycle.description')}
            <textarea
              id={`${formId}-description`}
              className="input"
              dir="auto"
              rows={3}
              value={description}
              disabled={submitting}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {mode === 'create' ? (
            <label htmlFor={`${formId}-type`}>
              {t('channels.lifecycle.channelType')}
              <select
                id={`${formId}-type`}
                className="input"
                value={channelType}
                disabled={submitting}
                onChange={(e) => setChannelType(e.target.value as AdminCreatableChannelType)}
              >
                {creatableTypes.map((value) => (
                  <option key={value} value={value}>
                    {t(`channels.type.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {needsClass ? (
            <label htmlFor={`${formId}-class`}>
              {t('channels.lifecycle.classLabel')}
              <select
                id={`${formId}-class`}
                className="input"
                value={classId}
                disabled={submitting || classesLoading}
                required
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">{t('channels.lifecycle.classPlaceholder')}</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {systemProvisioning ? (
            <p className="tiny muted" role="note">
              {t('channels.lifecycle.systemProvisionHint')}
            </p>
          ) : null}

          <label className="channels-lifecycle-check" htmlFor={`${formId}-read-only`}>
            <input
              id={`${formId}-read-only`}
              type="checkbox"
              checked={readOnly}
              disabled={submitting || (mode === 'edit' && Boolean(channel?.is_archived))}
              onChange={(e) => setReadOnly(e.target.checked)}
            />
            <span>{t('channels.lifecycle.readOnly')}</span>
          </label>

          <label className="channels-lifecycle-check" htmlFor={`${formId}-attachments`}>
            <input
              id={`${formId}-attachments`}
              type="checkbox"
              checked={allowAttachments}
              disabled={submitting}
              onChange={(e) => setAllowAttachments(e.target.checked)}
            />
            <span>{t('channels.lifecycle.allowAttachments')}</span>
          </label>

          <label className="channels-lifecycle-check" htmlFor={`${formId}-notify`}>
            <input
              id={`${formId}-notify`}
              type="checkbox"
              checked={notifyEmail}
              disabled={submitting}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            <span>{t('channels.lifecycle.notifyEmail')}</span>
          </label>
        </div>
      }
    />
  );
}
