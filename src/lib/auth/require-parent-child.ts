/**
 * Server-side Parent child route gate.
 * Odoo Parent API is the sole authorization source — failures that deny access
 * map to notFound() so existence is not leaked.
 */

import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { requireRole } from '@/lib/auth/guards';
import {
  decideParentChildAccess,
  parseParentChildId,
} from '@/lib/auth/parent-child-access';
import type { ChildSummary } from '@/types/student';

/**
 * Ensure the active parent may access the given student id.
 * Returns the child payload on success; otherwise notFound() / redirect.
 */
export async function requireAuthorizedParentChild(
  rawId: string | number,
): Promise<ChildSummary> {
  await requireRole('parent');

  const studentId = parseParentChildId(rawId);
  if (studentId == null) notFound();

  const response = await serverGet<ChildSummary>(endpoints.parent.child(studentId));
  const decision = decideParentChildAccess(response);

  if (decision.ok) {
    if (!response.success) {
      redirect('/parent/children');
    }
    return response.data;
  }

  if (decision.reason === 'denied') {
    notFound();
  }

  // Transient / unexpected API failure — do not render a student shell.
  redirect('/parent/children');
}
