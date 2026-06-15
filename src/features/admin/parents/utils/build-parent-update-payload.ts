/** Explicit person-only payload for POST /admin/parents/{id}/update — no relationship fields. */

export interface ParentPersonFormValues {
  name: string;
  phone: string;
  mobile: string;
  email: string;
  street: string;
  city: string;
  preferred_language: string;
  notification_opt_in: boolean;
}

export interface ParentUpdatePayload {
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  street?: string;
  city?: string;
  preferred_language?: string;
  notification_opt_in?: boolean;
}

function trimOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function buildParentUpdatePayload(values: ParentPersonFormValues): ParentUpdatePayload {
  const payload: ParentUpdatePayload = {
    name: values.name.trim(),
    preferred_language: values.preferred_language || undefined,
    notification_opt_in: values.notification_opt_in,
  };

  const phone = trimOptional(values.phone);
  const mobile = trimOptional(values.mobile);
  const email = trimOptional(values.email);
  const street = trimOptional(values.street);
  const city = trimOptional(values.city);

  if (phone) payload.phone = phone;
  if (mobile) payload.mobile = mobile;
  if (email) payload.email = email;
  if (street) payload.street = street;
  if (city) payload.city = city;

  return payload;
}

export function parentToFormValues(parent: {
  name: string;
  phone: string | null;
  mobile?: string | null;
  email: string | null;
  street?: string | null;
  city?: string | null;
  address?: string | null;
  preferred_language?: string | null;
  notification_opt_in?: boolean;
}): ParentPersonFormValues {
  return {
    name: parent.name ?? '',
    phone: parent.phone ?? '',
    mobile: parent.mobile ?? '',
    email: parent.email ?? '',
    street: parent.street ?? (parent.city ? '' : parent.address ?? ''),
    city: parent.city ?? '',
    preferred_language: parent.preferred_language ?? 'ar',
    notification_opt_in: parent.notification_opt_in ?? true,
  };
}

export function formValuesEqual(a: ParentPersonFormValues, b: ParentPersonFormValues): boolean {
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.mobile === b.mobile &&
    a.email === b.email &&
    a.street === b.street &&
    a.city === b.city &&
    a.preferred_language === b.preferred_language &&
    a.notification_opt_in === b.notification_opt_in
  );
}
