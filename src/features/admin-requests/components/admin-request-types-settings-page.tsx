'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';
import { createAdminRequestType, updateAdminRequestType } from '../api';
import { adminRequestControlsMessage } from '../controls-i18n';
import { adminRequestMessage } from '../i18n';
import { adminRequestErrorLabel, adminRequestPriorityLabel, staffOptionRows } from '../presenters';
import type { AdminRequestServiceKind, AdminRequestType } from '../types';

type EditorState = {
  id?: number;
  name: string;
  active: boolean;
  sequence: number;
  confidential: boolean;
  allow_parent: boolean;
  allow_student: boolean;
  requires_student: boolean;
  default_priority: 'normal' | 'important' | 'urgent';
  default_assignee_user_id: string;
  service_kind: AdminRequestServiceKind;
};

const EMPTY_EDITOR: EditorState = {
  name: '',
  active: true,
  sequence: 10,
  confidential: false,
  allow_parent: true,
  allow_student: false,
  requires_student: true,
  default_priority: 'normal',
  default_assignee_user_id: '',
  service_kind: 'general',
};

function editorFromType(type: AdminRequestType): EditorState {
  return {
    id: type.id,
    name: type.name,
    active: type.active !== false,
    sequence: type.sequence ?? 10,
    confidential: type.confidential === true,
    allow_parent: type.allow_parent !== false,
    allow_student: type.allow_student === true,
    requires_student: type.requires_student !== false,
    default_priority: type.default_priority ?? 'normal',
    default_assignee_user_id: type.default_assignee?.id ? String(type.default_assignee.id) : '',
    service_kind: type.service_kind ?? 'general',
  };
}

export function AdminRequestTypesSettingsPage() {
  const { locale } = useLocale();
  const types = useResource<AdminRequestType[]>('/admin/admin-requests/types', undefined, {
    keepPreviousData: false,
  });
  const staff = useResource<unknown>('/admin/staff/options', undefined, { keepPreviousData: false });
  const staffOptions = useMemo(() => staffOptionRows(staff.data), [staff.data]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !editor.name.trim()) return;
    setBusy(true);
    setError(null);
    const payload = {
      name: editor.name.trim(),
      active: editor.active,
      sequence: editor.sequence,
      confidential: editor.confidential,
      allow_parent: editor.allow_parent,
      allow_student: editor.allow_student,
      requires_student: editor.requires_student,
      default_priority: editor.default_priority,
      default_assignee_user_id: editor.default_assignee_user_id
        ? Number(editor.default_assignee_user_id)
        : null,
      service_kind: editor.service_kind,
    };
    const response = editor.id
      ? await updateAdminRequestType(editor.id, payload)
      : await createAdminRequestType(payload);
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      return;
    }
    setEditor(null);
    types.reload();
  }

  return (
    <div className="admin-workspace">
      <PageHeader
        title={adminRequestMessage(locale, 'settings.title')}
        subtitle={adminRequestMessage(locale, 'settings.subtitle')}
        actions={(
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { setError(null); setEditor({ ...EMPTY_EDITOR }); }}
          >
            {adminRequestMessage(locale, 'settings.newType')}
          </button>
        )}
      />

      {editor && (
        <Card>
          <form className="col" style={{ gap: 16 }} onSubmit={save}>
            <div className="between" style={{ gap: 12, flexWrap: 'wrap' }}>
              <strong>
                {adminRequestMessage(locale, editor.id ? 'settings.editType' : 'settings.addType')}
              </strong>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => { setEditor(null); setError(null); }}
                disabled={busy}
              >
                {adminRequestMessage(locale, 'common.cancel')}
              </button>
            </div>

            <div className="field">
              <label htmlFor="request-type-name">{adminRequestMessage(locale, 'settings.name')}</label>
              <input
                id="request-type-name"
                className="input"
                dir="auto"
                value={editor.name}
                onChange={(event) => update('name', event.target.value)}
                maxLength={160}
                required
                disabled={busy}
                placeholder={adminRequestMessage(locale, 'settings.namePlaceholder')}
              />
            </div>

            <div className="field">
              <label htmlFor="request-type-service-kind">
                {adminRequestControlsMessage(locale, 'settings.serviceKind')}
              </label>
              <select
                id="request-type-service-kind"
                className="input"
                value={editor.service_kind}
                onChange={(event) => update('service_kind', event.target.value as AdminRequestServiceKind)}
                disabled={busy}
              >
                <option value="general">
                  {adminRequestControlsMessage(locale, 'settings.serviceKindGeneral')}
                </option>
                <option value="appointment">
                  {adminRequestControlsMessage(locale, 'settings.serviceKindAppointment')}
                </option>
              </select>
              <span className="tiny muted">
                {adminRequestControlsMessage(locale, 'settings.serviceKindHint')}
              </span>
            </div>

            <div className="grid grid--cards">
              <div className="field">
                <label htmlFor="request-type-priority">{adminRequestMessage(locale, 'settings.defaultPriority')}</label>
                <select
                  id="request-type-priority"
                  className="input"
                  value={editor.default_priority}
                  onChange={(event) => update('default_priority', event.target.value as EditorState['default_priority'])}
                  disabled={busy}
                >
                  <option value="normal">{adminRequestPriorityLabel('normal', locale)}</option>
                  <option value="important">{adminRequestPriorityLabel('important', locale)}</option>
                  <option value="urgent">{adminRequestPriorityLabel('urgent', locale)}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="request-type-sequence">{adminRequestMessage(locale, 'settings.order')}</label>
                <input
                  id="request-type-sequence"
                  className="input"
                  type="number"
                  min={0}
                  max={9999}
                  value={editor.sequence}
                  onChange={(event) => update('sequence', Number(event.target.value || 0))}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="request-type-assignee">{adminRequestMessage(locale, 'settings.defaultAssignee')}</label>
              <select
                id="request-type-assignee"
                className="input"
                value={editor.default_assignee_user_id}
                onChange={(event) => update('default_assignee_user_id', event.target.value)}
                disabled={busy || staff.loading}
              >
                <option value="">{adminRequestMessage(locale, 'settings.noDefaultAssignee')}</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.detail ? `${option.name} — ${option.detail}` : option.name}
                  </option>
                ))}
              </select>
              {staff.error && (
                <span className="tiny muted">{adminRequestMessage(locale, 'settings.staffLoadHint')}</span>
              )}
            </div>

            <div className="grid grid--cards">
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.active} onChange={(event) => update('active', event.target.checked)} disabled={busy} />
                <span>{adminRequestMessage(locale, 'settings.active')}</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.allow_parent} onChange={(event) => update('allow_parent', event.target.checked)} disabled={busy} />
                <span>{adminRequestMessage(locale, 'settings.allowParent')}</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.allow_student} onChange={(event) => update('allow_student', event.target.checked)} disabled={busy} />
                <span>{adminRequestMessage(locale, 'settings.allowStudent')}</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.requires_student} onChange={(event) => update('requires_student', event.target.checked)} disabled={busy} />
                <span>{adminRequestMessage(locale, 'settings.requiresStudent')}</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.confidential} onChange={(event) => update('confidential', event.target.checked)} disabled={busy} />
                <span>{adminRequestMessage(locale, 'settings.confidential')}</span>
              </label>
            </div>

            <p className="tiny muted">{adminRequestMessage(locale, 'settings.policyHint')}</p>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="btn btn--primary" disabled={busy || !editor.name.trim()}>
              {adminRequestMessage(locale, busy ? 'settings.saving' : 'settings.save')}
            </button>
          </form>
        </Card>
      )}

      <ResourceView
        state={types}
        isEmpty={(data) => data.length === 0}
        empty={<Card>{adminRequestMessage(locale, 'settings.empty')}</Card>}
      >
        {(data) => (
          <div className="grid grid--cards">
            {data.map((type) => (
              <Card key={type.id}>
                <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div className="col" style={{ gap: 8 }}>
                    <strong dir="auto">{type.name}</strong>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone={type.active === false ? 'slate' : 'blue'}>
                        {adminRequestMessage(locale, type.active === false ? 'settings.disabled' : 'settings.active')}
                      </Badge>
                      <Badge tone={type.service_kind === 'appointment' ? 'blue' : 'slate'}>
                        {adminRequestControlsMessage(
                          locale,
                          type.service_kind === 'appointment'
                            ? 'settings.serviceKindBadgeAppointment'
                            : 'settings.serviceKindBadgeGeneral',
                        )}
                      </Badge>
                      {type.confidential && <Badge tone="blue">{adminRequestMessage(locale, 'settings.confidentialBadge')}</Badge>}
                      {type.allow_parent !== false && <span className="tiny muted">{adminRequestMessage(locale, 'settings.parentBadge')}</span>}
                      {type.allow_student && <span className="tiny muted">{adminRequestMessage(locale, 'settings.studentBadge')}</span>}
                      {type.requires_student && <span className="tiny muted">{adminRequestMessage(locale, 'settings.requiresStudentBadge')}</span>}
                    </div>
                    <span className="tiny muted">
                      {adminRequestMessage(locale, 'settings.priority', {
                        value: adminRequestPriorityLabel(type.default_priority, locale),
                      })}
                    </span>
                    <span className="tiny muted" dir="auto">
                      {adminRequestMessage(locale, 'settings.defaultAssigneeValue', {
                        name: type.default_assignee?.name ?? adminRequestMessage(locale, 'common.notSet'),
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setError(null); setEditor(editorFromType(type)); }}
                  >
                    {adminRequestMessage(locale, 'settings.edit')}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </div>
  );
}
