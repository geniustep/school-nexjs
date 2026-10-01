'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StaffMember } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';
import type { EdgeAttendanceMappingData, EdgeAttendancePersonsData, EdgeAttendanceSourceDevicesData } from '@/features/admin/edge/types';

export const fetchAttendanceSourceDevices=()=>api.get<EdgeAttendanceSourceDevicesData>(endpoints.admin.edgeAttendanceSourceDevices);
export const fetchAttendanceDevicePersons=(sourceId:number)=>api.get<EdgeAttendancePersonsData>(endpoints.admin.edgeAttendanceSourcePersons(sourceId));
export const fetchStaffCandidates=(query:ListParams)=>api.get<StaffMember[]>(endpoints.admin.staff,query);
export const saveAttendancePersonMapping=(sourceId:number,externalPersonId:string,staffRelationshipId:number,devicePersonLabel?:string)=>
 api.put<EdgeAttendanceMappingData>(endpoints.admin.edgeAttendancePersonMapping(sourceId,externalPersonId),{staff_relationship_id:staffRelationshipId,...(devicePersonLabel?{device_person_label:devicePersonLabel}:{})});
