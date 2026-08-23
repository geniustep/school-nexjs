'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';
import { createAdminRequestType, updateAdminRequestType } from '../api';
import { staffOptionRows } from '../presenters';
import type { AdminRequestType } from '../types';

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
  };
}

function priorityLabel(value?: string) {
  if (value === 'urgent') return 'عاجلة';
  if (value === 'important') return 'مهمة';
  return 'عادية';
}

export function AdminRequestTypesSettingsPage() {
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
    };
    const response = editor.id
      ? await updateAdminRequestType(editor.id, payload)
      : await createAdminRequestType(payload);
    setBusy(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setEditor(null);
    types.reload();
  }

  return (
    <div className="admin-workspace">
      <PageHeader
        title="أنواع الطلبات الإدارية"
        subtitle="حدد ما يمكن للأسرة إرساله، ومن يستقبله، والخصائص الافتراضية لكل نوع."
        actions={(
          <button type="button" className="btn btn--primary" onClick={() => { setError(null); setEditor({ ...EMPTY_EDITOR }); }}>
            نوع جديد
          </button>
        )}
      />

      {editor && (
        <Card>
          <form className="col" style={{ gap: 16 }} onSubmit={save}>
            <div className="between" style={{ gap: 12, flexWrap: 'wrap' }}>
              <strong>{editor.id ? 'تعديل نوع الطلب' : 'إضافة نوع طلب'}</strong>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditor(null); setError(null); }} disabled={busy}>
                إلغاء
              </button>
            </div>

            <div className="field">
              <label htmlFor="request-type-name">اسم النوع</label>
              <input
                id="request-type-name"
                className="input"
                value={editor.name}
                onChange={(event) => update('name', event.target.value)}
                maxLength={160}
                required
                disabled={busy}
                placeholder="مثال: طلب موعد مع الإدارة"
              />
            </div>

            <div className="grid grid--cards">
              <div className="field">
                <label htmlFor="request-type-priority">الأولوية الافتراضية</label>
                <select
                  id="request-type-priority"
                  className="input"
                  value={editor.default_priority}
                  onChange={(event) => update('default_priority', event.target.value as EditorState['default_priority'])}
                  disabled={busy}
                >
                  <option value="normal">عادية</option>
                  <option value="important">مهمة</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="request-type-sequence">ترتيب الظهور</label>
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
              <label htmlFor="request-type-assignee">الموظف المسؤول افتراضيًا</label>
              <select
                id="request-type-assignee"
                className="input"
                value={editor.default_assignee_user_id}
                onChange={(event) => update('default_assignee_user_id', event.target.value)}
                disabled={busy || staff.loading}
              >
                <option value="">بدون موظف افتراضي</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.detail ? `${option.name} — ${option.detail}` : option.name}
                  </option>
                ))}
              </select>
              {staff.error && <span className="tiny muted">تعذر تحميل قائمة الموظفين الآن؛ يمكنك حفظ النوع دون مسؤول افتراضي.</span>}
            </div>

            <div className="grid grid--cards">
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.active} onChange={(event) => update('active', event.target.checked)} disabled={busy} />
                <span>نشط</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.allow_parent} onChange={(event) => update('allow_parent', event.target.checked)} disabled={busy} />
                <span>متاح لولي الأمر</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.allow_student} onChange={(event) => update('allow_student', event.target.checked)} disabled={busy} />
                <span>متاح للتلميذ</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.requires_student} onChange={(event) => update('requires_student', event.target.checked)} disabled={busy} />
                <span>يتطلب تحديد تلميذ</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={editor.confidential} onChange={(event) => update('confidential', event.target.checked)} disabled={busy} />
                <span>طلب سري</span>
              </label>
            </div>

            <p className="tiny muted">
              تعطيل النوع يخفيه عن الطلبات الجديدة دون حذف الطلبات السابقة. الأنواع السرية تخضع لصلاحيات الشكايات في الإدارة.
            </p>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="btn btn--primary" disabled={busy || !editor.name.trim()}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ النوع'}
            </button>
          </form>
        </Card>
      )}

      <ResourceView
        state={types}
        isEmpty={(data) => data.length === 0}
        empty={<Card>لا توجد أنواع طلبات إدارية بعد.</Card>}
      >
        {(data) => (
          <div className="grid grid--cards">
            {data.map((type) => (
              <Card key={type.id}>
                <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div className="col" style={{ gap: 8 }}>
                    <strong>{type.name}</strong>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone={type.active === false ? 'gray' : 'blue'}>{type.active === false ? 'معطل' : 'نشط'}</Badge>
                      {type.confidential && <Badge tone="blue">سري</Badge>}
                      {type.allow_parent !== false && <span className="tiny muted">ولي الأمر</span>}
                      {type.allow_student && <span className="tiny muted">التلميذ</span>}
                      {type.requires_student && <span className="tiny muted">يتطلب تلميذًا</span>}
                    </div>
                    <span className="tiny muted">الأولوية: {priorityLabel(type.default_priority)}</span>
                    <span className="tiny muted">المسؤول الافتراضي: {type.default_assignee?.name ?? 'غير محدد'}</span>
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setError(null); setEditor(editorFromType(type)); }}>
                    تعديل
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
