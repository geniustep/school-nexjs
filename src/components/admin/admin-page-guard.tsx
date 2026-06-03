'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { permissionForAdminPath } from '@/lib/permissions/admin-pages';

/** Enforces view_* permission for the current /admin route (direct URL access). */
export function AdminPageGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const permission = permissionForAdminPath(pathname);
  if (!permission) return <>{children}</>;
  return <RequireAdminPermission permission={permission}>{children}</RequireAdminPermission>;
}
