import { redirect } from 'next/navigation';
import { requireAuthorizedParentChild } from '@/lib/auth/require-parent-child';

/**
 * Legacy / mistaken URL shape. Authorize first, then send to the canonical path.
 * Unauthorized ids become not-found (no student disclosure).
 */
export default async function ParentStudentsAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthorizedParentChild(id);
  redirect(`/parent/children/${id}`);
}
