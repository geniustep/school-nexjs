'use client';

import type { GuardianRelationshipCreatePayload, RelationshipType } from '@/types/student-360';
import {
  relationshipFormToCreatePayload as relationshipFormToCreatePayloadImpl,
  relationshipFormToLinkPersonPayload,
} from '../utils/guardian-relationship-payload';
import { GuardianRelationshipFields } from './guardian-relationship-fields';

export { relationshipFormToLinkPersonPayload };

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

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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
  date_start: todayIsoDate(),
  notes: '',
};

export function GuardianRelationshipForm({
  values,
  onChange,
  fieldError,
}: {
  values: RelationshipFormValues;
  onChange: (next: RelationshipFormValues) => void;
  fieldError?: string | null;
}) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <GuardianRelationshipFields values={values} onChange={onChange} />
      {fieldError ? (
        <p className="tiny guardian-create-field__error">{fieldError}</p>
      ) : null}
    </div>
  );
}

export function relationshipFormToCreatePayload(
  guardianId: number,
  values: RelationshipFormValues,
): GuardianRelationshipCreatePayload {
  return relationshipFormToCreatePayloadImpl(guardianId, values);
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
    date_start: rel.date_start ?? todayIsoDate(),
    notes: rel.notes ?? '',
  };
}
