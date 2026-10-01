'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EdgeAttendanceDevicePerson, EdgeAttendanceMappingData, EdgeAttendanceSourceDevice, EdgeStaffCandidate, EdgeStaffPickerData } from '@/features/admin/edge/types';

export const fetchAttendanceSourceDevices=()=>api.get<EdgeAttendanceSourceDevice[]>(endpoints.admin.edgeAttendanceSourceDevices);
export const fetchAttendanceDevicePersons=(sourceId:number)=>api.get<EdgeAttendanceDevicePerson[]>(endpoints.admin.edgeAttendanceSourcePersons(sourceId));
export async function fetchStaffCandidates(search:string){
 const response=await api.get<EdgeStaffPickerData>(endpoints.admin.staffOptions);
 if(!response.success)return response;
 const q=search.trim().toLocaleLowerCase();
 const staff=(response.data.staff??[]).filter((item:EdgeStaffCandidate)=>!q||item.name.toLocaleLowerCase().includes(q));
 return {...response,data:staff};
}
export const saveAttendancePersonMapping=(sourceId:number,externalPersonId:string,staffRelationshipId:number,devicePersonLabel?:string)=>
 api.put<EdgeAttendanceMappingData>(endpoints.admin.edgeAttendancePersonMapping(sourceId,externalPersonId),{staff_relationship_id:staffRelationshipId,...(devicePersonLabel?{device_person_label:devicePersonLabel}:{})});
