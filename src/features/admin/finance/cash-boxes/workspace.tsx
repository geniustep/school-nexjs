'use client';
import Link from 'next/link';
import {useEffect,useState,useRef} from 'react';
import type {StaffMember} from '@/types/academic-setup';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import {useSession} from '@/features/auth/session-context';
import {useAdminSession} from '@/features/auth/admin-session-context';
import {useLocale} from '@/features/i18n/locale-context';
import {PageHeader} from '@/components/ui/primitives';
import {useCashJournals} from '@/features/admin/finance/cash-desk/use-cash-journals';
import {capabilities,can,allowed,readRecords,readTotal,positive,selectCashStaff,type CashRecord,type Kind} from './model';
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
 const [rows,setRows]=useState<CashRecord[]>([]),[detail,setDetail]=useState<CashRecord|null>(null),[page,setPage]=useState(1),[total,setTotal]=useState(0),[pending,setPending]=useState(false);
 const [form,setForm]=useState<'create'|'participant'|'handover'|'accept'|null>(null),[fields,setFields]=useState<Fields>(initial);
 const [loading,setLoading]=useState(false),[working,setWorking]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[outcomeUnknown,setOutcomeUnknown]=useState(false);
 const [boxes,setBoxes]=useState<CashRecord[]>([]);
 const [staff,setStaff]=useState<StaffMember[]>([]),[staffLoading,setStaffLoading]=useState(false),[staffError,setStaffError]=useState('');
 const perm=can(user,capabilities[kind].view),lastRequest=useRef(0),dialogRef=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(!activeSchoolId||!form||!['participant','handover'].includes(form)){setStaff([]);return;}
  let canceled=false;setStaffLoading(true);setStaffError('');
  void api.get<StaffMember[]>(endpoints.admin.staff,{active_school_id:activeSchoolId,status:'active',limit:200}).then(result=>{
   if(canceled)return;
   if(!result.success){setStaffError(result.error.message||t.failed);return;}
   setStaff(selectCashStaff(result.data,Number(activeSchoolId)));
  }).catch(()=>{if(!canceled)setStaffError(t.failed);}).finally(()=>{if(!canceled)setStaffLoading(false);});
  return()=>{canceled=true;};
 },[activeSchoolId,form,t.failed]);
 useEffect(()=>{
  if(!form)return;
  const previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
  dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),button:not([disabled])')?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&!working){event.preventDefault();setForm(null);}
   if(event.key!=='Tab')return;
   const items=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled])')??[]);
   if(!items.length)return;
   if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items[items.length-1].focus();}
   else if(!event.shiftKey&&document.activeElement===items[items.length-1]){event.preventDefault();items[0].focus();}
  };
  document.addEventListener('keydown',onKeyDown);
  return()=>{document.removeEventListener('keydown',onKeyDown);previouslyFocused?.focus();};
 },[form,working]);
 useEffect(()=>{if(!activeSchoolId||!can(user,capabilities.boxes.view)){setBoxes([]);return;}let cancelled=false;void api.get<unknown>(apis.boxes,{active_school_id:activeSchoolId,limit:100}).then(r=>{if(!cancelled)setBoxes(r.success?readRecords(r.data):[]);});return()=>{cancelled=true;};},[activeSchoolId,user,revision]);
 useEffect(()=>{setRows([]);setDetail(null);setForm(null);setPage(1);setError('');setOutcomeUnknown(false);lastRequest.current++;},[activeSchoolId,kind]);
 useEffect(()=>{
  if(!activeSchoolId||!perm){setLoading(false);return;}
  const controller=new AbortController(),req=++lastRequest.current;setLoading(true);setError('');
  void api.get<unknown>(apis[kind],{active_school_id:activeSchoolId,page,limit:20,...(kind!=='boxes'&&pending?{pending:1}:{})},{signal:controller.signal}).then(res=>{
   if(controller.signal.aborted||req!==lastRequest.current)return;
   if(!res.success){setError(res.error.message||t.failed);setRows([]);setTotal(0);return;}
   const data=readRecords(res.data);setRows(data);setTotal(readTotal(res.meta,data.length));
  }).catch(()=>{if(!controller.signal.aborted)setError(t.failed);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[activeSchoolId,kind,page,pending,revision,perm,t.failed]);
 async function inspect(r:CashRecord){
  if(!activeSchoolId)return;
  const school=activeSchoolId,req=++lastRequest.current;setError('');
  const path=kind==='boxes'?endpoints.admin.financeCashBox(r.id):kind==='transfers'?endpoints.admin.financeCashTransfer(r.id):endpoints.admin.financeCashHandover(r.id);
  let res;try{res=await api.get<CashRecord>(path,{active_school_id:school});}catch{if(req===lastRequest.current)setError(t.failed);return;}
  if(req!==lastRequest.current)return;
  if(res.success)setDetail(res.data);else setError(res.error.message||t.failed);
 }
 async function submit(path:string,payload:Record<string,unknown>){
  if(working||outcomeUnknown||!activeSchoolId||!window.confirm(t.confirm))return;
  setWorking(true);setError('');
  try{
   const result=await api.post<unknown>(path,{...payload,active_school_id:activeSchoolId});
   if(!result.success){setError(result.error.message||t.failed);return;}
   setDetail(null);setForm(null);setFields(initial);setRevision(n=>n+1);
  }catch{setError(t.uncertain);setOutcomeUnknown(true);}finally{setWorking(false);}
 }
 function startForm(type:'create'|'handover'|'participant'|'accept'){setForm(type);setFields(initial);setError('');}
 function create(){
  const participant=staff.find(person=>String(person.user_id??person.id)===fields.user_id);
  const custodian=staff.find(person=>String(person.user_id??person.id)===fields.to_custodian_id);
  if(form==='accept'&&detail&&kind==='handovers'&&allowed(detail,'accept'))void submit(endpoints.admin.financeCashHandoverAccept(detail.id),{...(fields.counted_amount!==''?{counted_amount:Number(fields.counted_amount)}:{}),difference_reason:fields.difference_reason.trim()||undefined});
  if(form==='participant'&&detail&&participant&&safeId(fields.user_id)&&can(user,capabilities.boxes.create)&&allowed(detail,'manage_participants'))void submit(endpoints.admin.financeCashBoxParticipants(detail.id),{user_id:Number(fields.user_id)});
  if(form==='handover'&&detail&&custodian&&safeId(fields.to_custodian_id)&&can(user,capabilities.handovers.create)&&allowed(detail,'initiate_handover'))void submit(endpoints.admin.financeCashBoxHandovers(detail.id),{to_custodian_id:Number(fields.to_custodian_id),...(fields.counted_amount?{counted_amount:Number(fields.counted_amount)}:{}),idempotency_key:crypto.randomUUID()});
  if(form==='create'&&can(user,capabilities[kind].create)){
   if(kind==='boxes'&&fields.name.trim()&&safeId(fields.journal_id)&&journals.some(j=>String(j.id)===fields.journal_id))void submit(apis.boxes,{school_id:activeSchoolId,name:fields.name.trim(),journal_id:Number(fields.journal_id),box_type:fields.box_type});
   if(kind==='transfers'&&safeId(fields.source_box_id)&&safeId(fields.dest_box_id)&&fields.source_box_id!==fields.dest_box_id&&positive(fields.amount)&&fields.reason.trim()&&boxes.some(b=>String(b.id)===fields.source_box_id)&&boxes.some(b=>String(b.id)===fields.dest_box_id))void submit(apis.transfers,{source_box_id:Number(fields.source_box_id),dest_box_id:Number(fields.dest_box_id),amount:Number(fields.amount),reason:fields.reason.trim(),reference:fields.reference||undefined,idempotency_key:crypto.randomUUID()});
  }
 }
 function transition(act:'approve'|'dispatch'|'accept'){
  if(!detail||!allowed(detail,act))return;
  const url=kind==='handovers'?endpoints.admin.financeCashHandoverAccept(detail.id):act==='approve'?endpoints.admin.financeCashTransferApprove(detail.id):act==='dispatch'?endpoints.admin.financeCashTransferDispatch(detail.id):endpoints.admin.financeCashTransferAccept(detail.id);
  void submit(url,{});
 }

 const fieldLabels:Record<string,string>=locale==='fr'?{journal_name:'Journal',box_type:'Type de caisse',operations_frozen:'Opérations',available_cash:'Solde disponible',cash_in_transit_in:'Transit entrant',cash_in_transit_out:'Transit sortant',current_custodian_name:'Responsable',state:'État',amount:'Montant',source_box_id:'Caisse source',dest_box_id:'Caisse destinataire',from_custodian_name:'Responsable sortant',to_custodian_name:'Responsable entrant',expected_amount:'Montant attendu',counted_amount:'Montant compté',difference_amount:'Écart',difference_reason:'Motif de l’écart'}:locale==='en'?{journal_name:'Journal',box_type:'Box type',operations_frozen:'Operations',available_cash:'Available cash',cash_in_transit_in:'Inbound transit',cash_in_transit_out:'Outbound transit',current_custodian_name:'Custodian',state:'Status',amount:'Amount',source_box_id:'Source box',dest_box_id:'Destination box',from_custodian_name:'Outgoing custodian',to_custodian_name:'Incoming custodian',expected_amount:'Expected amount',counted_amount:'Counted amount',difference_amount:'Difference',difference_reason:'Difference reason'}:{journal_name:'الدفتر النقدي',box_type:'نوع الصندوق',operations_frozen:'العمليات',available_cash:'الرصيد المتاح',cash_in_transit_in:'الوارد قيد النقل',cash_in_transit_out:'الصادر قيد النقل',current_custodian_name:'أمين العهدة',state:'الحالة',amount:'المبلغ',source_box_id:'الصندوق المصدر',dest_box_id:'الصندوق الوجهة',from_custodian_name:'المسؤول السابق',to_custodian_name:'المسؤول الجديد',expected_amount:'المبلغ المتوقع',counted_amount:'المبلغ المعدود',difference_amount:'الفرق',difference_reason:'سبب الفرق'};
 const boxTypes:Record<string,string>=locale==='fr'?{collection:'Encaissement',vault:'Coffre central',expense:'Dépenses'}:locale==='en'?{collection:'Collection',vault:'Central vault',expense:'Expenses'}:{collection:'التحصيل',vault:'الخزينة المركزية',expense:'المصاريف'};
 const statuses:Record<string,string>=locale==='fr'?{draft:'Brouillon',pending:'En attente',approved:'Approuvé',dispatched:'Envoyé',in_transit:'En transit',accepted:'Accepté',cancelled:'Annulé',closed:'Clôturé',active:'Actif',open:'Ouvert'}:locale==='en'?{draft:'Draft',pending:'Pending',approved:'Approved',dispatched:'Dispatched',in_transit:'In transit',accepted:'Accepted',cancelled:'Cancelled',closed:'Closed',active:'Active',open:'Open'}:{draft:'مسودة',pending:'قيد الانتظار',approved:'معتمد',dispatched:'مُرسَل',in_transit:'قيد النقل',accepted:'مستلم',cancelled:'ملغى',closed:'مغلق',active:'نشط',open:'مفتوح'};
 const display=(key:string,v:unknown)=>v==null||v===''?'—':key==='box_type'?boxTypes[String(v)]??String(v):key==='state'?statuses[String(v)]??String(v):key==='operations_frozen'?(v===true?(locale==='fr'?'Gelées':locale==='en'?'Frozen':'مجمدة'):(locale==='fr'?'Autorisées':locale==='en'?'Enabled':'مسموح بها')):typeof v==='number'?new Intl.NumberFormat(locale==='fr'?'fr-MA':locale==='en'?'en-US':'ar-MA',{maximumFractionDigits:2}).format(v):String(v);
 const inputs: Array<[keyof Fields,string]>=form==='accept'?[['counted_amount',t.counted],['difference_reason',t.reason]]:form==='participant'?[['user_id',t.participant]]:form==='handover'?[['to_custodian_id',t.recipient],['counted_amount',t.counted]]:kind==='boxes'?[['name',t.name],['journal_id',t.journal],['box_type',t.type]]:[['source_box_id',t.source],['dest_box_id',t.dest],['amount',t.amount],['reason',t.reason],['reference',t.reference]];
 const selectedStaff=(value:string)=>staff.some(person=>String(person.user_id??person.id)===value);
 const validAmount=(value:string)=>value===''||(Number.isFinite(Number(value))&&Number(value)>=0);
 const canSubmitForm=form==='participant'?selectedStaff(fields.user_id)&&safeId(fields.user_id)&&can(user,capabilities.boxes.create):form==='handover'?selectedStaff(fields.to_custodian_id)&&safeId(fields.to_custodian_id)&&validAmount(fields.counted_amount):form==='accept'?validAmount(fields.counted_amount):form==='create'&&kind==='boxes'?Boolean(fields.name.trim()&&safeId(fields.journal_id)&&journals.some(j=>String(j.id)===fields.journal_id)):form==='create'&&kind==='transfers'?Boolean(safeId(fields.source_box_id)&&safeId(fields.dest_box_id)&&fields.source_box_id!==fields.dest_box_id&&positive(fields.amount)&&fields.reason.trim()):false;
 if(!perm)return <p role="alert">{t.noAccess}</p>;
 return <main dir={dir} className="cb-workspace cb-workspace--v2">
  <PageHeader title={t[kind]} subtitle={t.subtitle} actions={<button type="button" className="btn btn--ghost" onClick={()=>setRevision(n=>n+1)}>{t.refresh}</button>}/>
  <nav className="cb-tabs" aria-label={t.details}>{(['boxes','transfers','handovers'] as const).map(k=><Link key={k} href={routes[k]} aria-current={kind===k?'page':undefined}>{t[k]}</Link>)}<Link href="/admin/finance/cash-desk">{t.cashDesk}</Link></nav>
  <div className="cb-toolbar"><div className="cb-actions">{kind!=='boxes'&&<button className="btn btn--ghost" type="button" aria-pressed={pending} onClick={()=>{setPending(!pending);setPage(1);}}>{pending?t.pending:t.all}</button>}{kind!=='handovers'&&can(user,capabilities[kind].create)&&<button type="button" className="btn btn--primary" onClick={()=>startForm('create')}>{t.create}</button>}<span className="cb-count">{total}</span></div></div>
  {error&&<div className="cb-error" role="alert">{error} <button onClick={()=>setRevision(n=>n+1)}>{t.retry}</button></div>}
  <div className="cb-two"><section className="card cb-list" aria-busy={loading}>{loading?<p>{t.loading}</p>:rows.length===0?<div className="cb-list-empty" role="status"><strong>{t.empty}</strong><p>{t.emptyHint}</p></div>:rows.map(r=><button key={r.id} type="button" className="cb-entry" aria-pressed={detail?.id===r.id} onClick={()=>void inspect(r)}><strong>{r.name}</strong><span >{kind==='boxes'?display('box_type',r.box_type):display('state',r.state)}</span></button>)}
  {total>20&&<div className="cb-actions"><button className="btn btn--ghost" disabled={page===1} onClick={()=>setPage(n=>n-1)}>{t.prev}</button><span>{page}</span><button className="btn btn--ghost" disabled={page*20>=total} onClick={()=>setPage(n=>n+1)}>{t.next}</button></div>}</section>
  <aside className="card cb-detail"><p className="cb-section-label">{t.details}</p>{detail?<><h2>{detail.name}</h2>{kind==='boxes'&&<div className="cb-balance"><span>{fieldLabels.available_cash}</span><strong>{display('available_cash',detail.available_cash)} <small>MAD</small></strong></div>}{Object.entries(detail).filter(([k])=>kind==='boxes'?['box_type','journal_name','current_custodian_name','operations_frozen','cash_in_transit_out','cash_in_transit_in'].includes(k):['state','amount','source_box_id','dest_box_id','from_custodian_name','to_custodian_name','expected_amount','counted_amount','difference_amount','difference_reason'].includes(k)).map(([k,v])=><div className="cb-pair" key={k}><span>{fieldLabels[k]??k}</span><strong>{display(k,v)}</strong></div>)}{kind==='boxes'&&Array.isArray(detail.participants)&&<div><h3>{t.participant}</h3>{detail.participants.map((part,i)=><p key={i}>{String((part as Record<string,unknown>).user_name??(part as Record<string,unknown>).user_id??'—')}</p>)}</div>}<div className="cb-actions">{kind==='transfers'&&(['approve','dispatch','accept'] as const).map(a=>allowed(detail,a)&&can(user,a==='approve'?capabilities.transfers.approve:a==='dispatch'?capabilities.transfers.dispatch:capabilities.transfers.accept)?<button key={a} type="button" className="btn btn--primary" disabled={working||outcomeUnknown} onClick={()=>transition(a)}>{t[a]}</button>:null)}{kind==='handovers'&&allowed(detail,'accept')&&can(user,capabilities.handovers.accept)&&<button className="btn btn--primary" disabled={working||outcomeUnknown} onClick={()=>startForm('accept')}>{t.accept}</button>}{kind==='boxes'&&can(user,capabilities.boxes.create)&&allowed(detail,'manage_participants')&&<button className="btn btn--ghost" onClick={()=>startForm('participant')}>{t.addParticipant}</button>}{kind==='boxes'&&allowed(detail,'initiate_handover')&&can(user,capabilities.handovers.create)&&<button className="btn btn--primary" onClick={()=>startForm('handover')}>{t.handover}</button>}</div></>:<div className="cb-detail-empty"><h2>{t.selectRecord}</h2><p>{t.selectRecordHint}</p></div>}</aside></div>
  {form&&<div className="cb-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)setForm(null);}}><section ref={dialogRef} className="card cb-modal" role="dialog" aria-modal="true" aria-label={form==='participant'?t.addParticipant:form==='handover'?t.handover:form==='accept'?t.accept:t.create}><header className="cb-modal-header"><h2>{form==='participant'?t.addParticipant:form==='handover'?t.handover:form==='accept'?t.accept:t.create}</h2><button type="button" className="btn btn--ghost" disabled={working} onClick={()=>setForm(null)} aria-label={t.cancel}>×</button></header><p className="cb-modal-intro">{t.subtitle}</p>{error&&<p role="alert" className="cb-error">{error}</p>}{staffError&&<p role="alert" className="cb-error">{t.staffAccessHint}</p>}{(form==='participant'||form==='handover')&&!staffLoading&&!staffError&&staff.length===0&&<p role="status">{t.noEligibleStaff}</p>}{inputs.map(([key,label])=><label className="cb-field" key={key}>{label}{key==='box_type'?<select value={fields[key]} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}><option value="collection">{display('box_type','collection')}</option><option value="expense">{display('box_type','expense')}</option><option value="vault">{display('box_type','vault')}</option></select>:key==='journal_id'?<select value={fields[key]} onChange={e=>setFields(f=>({...f,journal_id:e.target.value}))}><option value="">—</option>{journals.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select>:key==='source_box_id'||key==='dest_box_id'?<select value={fields[key]} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}><option value="">—</option>{boxes.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>:key==='user_id'||key==='to_custodian_id'?<select value={fields[key]} disabled={staffLoading||!!staffError} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}><option value="">{staffLoading?t.loading:'—'}</option>{staff.map(person=><option key={person.id} value={person.user_id??person.id}>{person.display_name||person.name}{person.job_title?' — '+person.job_title:''}</option>)}</select>:<input inputMode={key==='amount'||key==='counted_amount'?'decimal':undefined} value={fields[key]} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))} />}</label>)}<div className="cb-actions"><button type="button" className="btn btn--primary" disabled={working||outcomeUnknown||!canSubmitForm} onClick={create} >{t.save}</button><button type="button" className="btn btn--ghost" onClick={()=>setForm(null)}>{t.cancel}</button></div></section></div>}
 </main>;
}

