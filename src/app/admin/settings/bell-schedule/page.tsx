import { BellScheduleSettingsPage } from '@/features/admin/edge/components/bell-schedule-settings-page';
import { RequireEdgeSettingsAccess } from '@/features/admin/edge/components/require-edge-settings-access';

export default function AdminBellScheduleSettingsRoute() {
  return (
    <RequireEdgeSettingsAccess>
      <BellScheduleSettingsPage />
    </RequireEdgeSettingsAccess>
  );
}
