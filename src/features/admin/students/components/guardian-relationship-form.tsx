'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { GuardianRelationshipCreatePayload, RelationshipType } from '@/types/student-360';
import { RELATIONSHIP_TYPE_CODES, relationshipTypeLabel } from '../utils/relationship-types';

export interface RelationshipFormValues {
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
  is_legal_guardian: boolean;
  is_financial_responsible: boolean;
  receives_notifications: boolean;
  is_emergency_contact: boolean;
  is_authorized_pickup: boolean;
  contact_priority: string;
  date_start: string;
  notes: string;
}

export const DEFAULT_RELATIONSHIP_FORM: RelationshipFormValues = {
  relationship_type: 'father',
  is_primary_contact: false,
  is_legal_guardian: false,
  is_financial_responsible: false,
  receives_notifications: true,
  is_emergency_contact: false,
  is_authorized_pickup: false,
  contact_priority: '',
  date_start: '',
  notes: '',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
  );
}

export function GuardianRelationshipForm({
  values,
  onChange,
  fieldError,
}: {
  values: RelationshipFormValues;
  onChange: (next: RelationshipFormValues) => void;
  fieldError?: string | null;
}) {
  const t = useT();

  function patch(partial: Partial<RelationshipFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="col" style={{ gap: 12 }}>
      <Field label={t('admin.student360.relationshipTypeLabel')}>
        <select
          className="input"
          required
          value={values.relationship_type}
          onChange={(e) => patch({ relationship_type: e.target.value })}
        >
          {RELATIONSHIP_TYPE_CODES.map((code) => (
            <option key={code} value={code}>
              {relationshipTypeLabel(t, code)}
            </option>
          ))}
        </select>
      </Field>

      <div className="col" style={{ gap: 8 }}>
        {(
          [
            ['is_primary_contact', 'admin.student360.primaryContact'],
            ['is_legal_guardian', 'admin.student360.legalGuardian'],
            ['is_financial_responsible', 'admin.student360.financialResponsible'],
            ['receives_notifications', 'admin.student360.receivesNotifications'],
            ['is_emergency_contact', 'admin.student360.emergencyContact'],
            ['is_authorized_pickup', 'admin.student360.authorizedPickup'],
          ] as const
        ).map(([key, labelKey]) => (
          <label key={key} className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={values[key]}
              onChange={(e) => patch({ [key]: e.target.checked })}
            />
            <span className="tiny">{t(labelKey)}</span>
          </label>
        ))}
      </div>

      <div className="student-360-form__grid">
        <Field label={t('admin.student360.contactPriority')}>
          <input
            className="input"
            type="number"
            min={1}
            value={values.contact_priority}
            onChange={(e) => patch({ contact_priority: e.target.value })}
          />
        </Field>
        <Field label={t('admin.student360.dateStart')}>
          <input
            className="input"
            type="date"
            value={values.date_start}
            onChange={(e) => patch({ date_start: e.target.value })}
          />
        </Field>
      </div>

      <Field label={t('admin.student360.notes')}>
        <textarea
          className="textarea"
          rows={3}
          value={values.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </Field>

      {fieldError && <p className="tiny" style={{ color: 'var(--danger, #c00)' }}>{fieldError}</p>}
    </div>
  );
}

export function relationshipFormToCreatePayload(
  guardianId: number,
  values: RelationshipFormValues,
): GuardianRelationshipCreatePayload {
  const payload: GuardianRelationshipCreatePayload = {
    guardian_id: guardianId,
    relationship_type: values.relationship_type,
    is_primary_contact: values.is_primary_contact,
    is_legal_guardian: values.is_legal_guardian,
    is_financial_responsible: values.is_financial_responsible,
    receives_notifications: values.receives_notifications,
    is_emergency_contact: values.is_emergency_contact,
    is_authorized_pickup: values.is_authorized_pickup,
  };
  const priority = Number(values.contact_priority);
  if (Number.isInteger(priority) && priority > 0) payload.contact_priority = priority;
  if (values.date_start.trim()) payload.date_start = values.date_start.trim();
  if (values.notes.trim()) payload.notes = values.notes.trim();
  return payload;
}

export function relationshipFormToUpdatePayload(
  values: RelationshipFormValues,
): import('@/types/student-360').GuardianRelationshipUpdatePayload {
  const payload: import('@/types/student-360').GuardianRelationshipUpdatePayload = {
    relationship_type: values.relationship_type,
    is_primary_contact: values.is_primary_contact,
    is_legal_guardian: values.is_legal_guardian,
    is_financial_responsible: values.is_financial_responsible,
    receives_notifications: values.receives_notifications,
    is_emergency_contact: values.is_emergency_contact,
    is_authorized_pickup: values.is_authorized_pickup,
  };
  const priority = Number(values.contact_priority);
  if (Number.isInteger(priority) && priority > 0) payload.contact_priority = priority;
  if (values.date_start.trim()) payload.date_start = values.date_start.trim();
  if (values.notes.trim()) payload.notes = values.notes.trim();
  return payload;
}

export function relationshipToFormValues(rel: import('@/types/student-360').GuardianRelationship): RelationshipFormValues {
  return {
    relationship_type: rel.relationship_type,
    is_primary_contact: rel.is_primary_contact,
    is_legal_guardian: rel.is_legal_guardian,
    is_financial_responsible: rel.is_financial_responsible,
    receives_notifications: rel.receives_notifications,
    is_emergency_contact: rel.is_emergency_contact,
    is_authorized_pickup: rel.is_authorized_pickup,
    contact_priority: rel.contact_priority != null ? String(rel.contact_priority) : '',
    date_start: rel.date_start ?? '',
    notes: rel.notes ?? '',
  };
}
