'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EdgeAttendanceDevicePerson, EdgeAttendanceForceSyncStatus, EdgeAttendanceMappingData, EdgeAttendanceSourceDevice, EdgeStaffCandidate, EdgeStaffPickerData } from '@/features/admin/edge/types';

export const fetchAttendanceSourceDevices=()=>api.get<EdgeAttendanceSourceDevice[]>(endpoints.admin.edgeAttendanceSourceDevices);
export const fetchAttendanceDevicePersons=(sourceId:number)=>api.get<EdgeAttendanceDevicePerson[]>(endpoints.admin.edgeAttendanceSourcePersons(sourceId));
export async function fetchStaffCandidates(search:string){
 const response=await api.get<EdgeStaffPickerData>(endpoints.admin.staffOptions);
 if(!response.success)return response;
 const q=search.trim().toLocaleLowerCase();
 const staff=(response.data.staff??[]).filter((item:EdgeStaffCandidate)=>{
  // Attendance identity is a school.staff.relationship. Generic staff/options can
  // also contain school users (for example student accounts) with no staff relation.
  if(item.staff_relationship_id==null)return false;
  if(!q)return true;
  return [item.name,item.name_ar,item.name_fr].some(value=>
   typeof value==='string'&&value.trim().toLocaleLowerCase().includes(q)
  );
 });
 return {...response,data:staff};
}
export const saveAttendancePersonMapping=(sourceId:number,externalPersonId:string,staffRelationshipId:number,devicePersonLabel?:string)=>
 api.put<EdgeAttendanceMappingData>(endpoints.¶»§q«^