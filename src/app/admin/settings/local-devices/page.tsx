import { RequireEdgeSettingsAccess } from '@/features/admin/edge/components/require-edge-settings-access';
import { LocalDeviceStaffMappingPage } from '@/features/admin/edge/components/local-device-staff-mapping-page';
export default function LocalDevicesRoute(){return <RequireEdgeSettingsAccess><LocalDeviceStaffMappingPage /></RequireEdgeSettingsAccess>;}
