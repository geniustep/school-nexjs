'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md */
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { LibraryWorkspace } from '@/features/admin/library/library-workspace';

export default function LibraryPage() {
  return <RequireAdminPermission permission="library.view"><div style={{display:'flex',flexDirection:'column',gap:12}}><div style={{display:'flex',justifyContent:'flex-end'}}><Link className="btn btn--primary" href="/admin/library/operations">مكتب المكتبة والتقارير</Link></div><LibraryWorkspace /></div></RequireAdminPermission>;
}
