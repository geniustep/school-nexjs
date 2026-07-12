import { PermissionDeniedState } from '@/components/states/states';

/** Server-rendered access denied — used by requireAdminPermission redirects. */
export default function AdminForbiddenPage() {
  return (
    <div className="admin-workspace" style={{ padding: '2rem' }}>
      <PermissionDeniedState />
    </div>
  );
}
