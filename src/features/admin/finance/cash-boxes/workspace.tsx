'use client';
import Link from 'next/link';
import {useEffect,useState,useRef} from 'react';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import {useSession} from '@/features/auth/session-context';
import {useAdminSession} from '@/features/auth/admin-session-context';
import {useLocale} from '@/features/i18n/locale-context';
import {PageHeader} from '@/components/ui/primitives';
import {useCashJournals} from '@/features/admin/finance/cash-desk/use-cash-journals';
import {capabilities,can,allowed,readRecords,readTotal,positive,type CashRecord,type Kind} from './model';
import {copy} from './copy';
import './workspace.css';
const routes={boxes:'/admin/finance/cash-boxes',transfers:'/admin/finance/cash-transfers',handovers:'/admin/finance/cash-handovers'};
const apis={boxes:endpoints.admin.financeCashBoxes,transfers:endpoints.admin.financeCashTransfers,handovers:endpoints.admin.financeCashHandovers};
const initial={name:'',journal_id:'',box_type:'collection',source_box_id:'',dest_box_id:'',amount:'',reason:'',reference:'',to_custodian_id:'',counted_amount:'',difference_reason:'',user_id:''};
type Fields=typeof initial;
const safeId=(v:string)=>positive(v)&&Number.isSafeInteger(Number(v));
export function CashWorkspace({kind}:{kind:Kind}){
 const user=useSession(),{activeSchoolId}=useAdminSession(),{locale,dir}=useLocale(),t=copy[locale==='fr'||locale==='en'?locale:'ar'];
 const {journals}=useCashJournals();
 const [rows,setRows]=useState<C¶»§q«^