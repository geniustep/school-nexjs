import { requireAuthorizedParentChild } from '@/lib/auth/require-parent-child';

/**
 * SSR gate for every Parent child surface under /parent/children/[id]/*.
 * Unauthorized ids (including 403 from Odoo) resolve to not-found — no student shell.
 */
export default async function ParentChildIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthorizedParentChild(id);
  return children;
}
