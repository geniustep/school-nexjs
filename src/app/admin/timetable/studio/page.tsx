'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {RequireAdminPermission} from '@/components/admin/require-admin-permission';
import {useGlobalAcademicYearResource} from '@/features/academic-context/hooks/use-global-academic-year-resource';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import type {SchoolClass} from '@/types/class';
import {allowedTimetableDays,type TimetableSetupContext} from '@/features/admin/timetable/utils/setup-context';
import {buildStudioGrid,selectStudioPeriod,type StudioPeriod,type StudioLine} from './studio-utils';

type Assignment={assignment_id:number;subject_name:string;teacher_name:string};
type Draft={draft_id:number;state:string;lines:StudioLine[];conflict_count:number};
type Context=Omit<TimetableSetupContext,'periods'>&{periods:StudioPeriod[];breaks:{id:number;name:string;start_time:number;end_time:number}[]};
const DAYS=[['monday','الاثنين'],['tuesday','الثلاثاء'],['wednesday','الأربعاء'],['thursday','الخميس'],['friday','الجمعة'],['saturday','السبت'],['sunday','الأحد']] as const;
const clock=(value:number)=>{const n=Math.round(value*60);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
export default function TimetableStudioPage(){
 return <RequireAdminPermission permission="view_timetable"><Studio/></RequireAdminPermission>;
}
function Studio(){
 const classes=useGlobalAcademicYearResource<SchoolClass[]>(endpoints.admin.classes);
 const [classId,setClassId]=useState(0);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [context,setContext]=useState<Context|null>(null);
 const [draft,setDraft]=useState<Draft|null>(null);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [pending,setPending]=useState<Record<string,number|null>>({});
 const [selection,setSelection]=useState('');
 const [chosenAssignment,setChosenAssignment]=useState(0);
 const availableDays=useMemo(()=>allowedTimetableDays(context),[context]);
 const periods=useMemo(()=>context?.periods??[],[context]);
 const grid=useMemo(()=>buildStudioGrid(periods,availableDays,draft?.lines??[],pending),[periods,availableDays,draft,pending]);
 useEffect(()=>{
  let active=true;
  setContext(null);setDraft(null);setAssignments([]);setPending({});setError('');setReady(false);setSelection('');setChosenAssignment(0);
  if(!classId)return;
  setBusy(true);
  void Promise.all([
   api.get<{assignments:Assignment[]}>(endpoints.admin.classTimetableAssignments(classId)),
   api.get<{draft:Draft|null}>(endpoints.admin.classTimetableDraft(classId))
  ]).then(async([a,d])=>{
   if(!active)return;
   if(!a.success||!d.success){setError('تعذر تحميل الإسنادات أو المسودة. حاول إعادة اختيار القسم.');return;}
   const ctx=await api.get<Context>(endpoints.admin.timetableSetupContext,{class_id:classId,...d.data.draft?{draft_id:d.data.draft.draft_id}:{}});
   if(!active)return;
   if(!ctx.success){setError('تعذر تحميل الفترات المعتمدة.');return;}
   setAssignments(a.data.assignments??[]);setDraft(d.data.draft);setContext(ctx.data);setReady(true);
  }).catch(()=>{if(active)setError('تعذر الاتصال بخدمة استعمال الزمان.')}).finally(()=>{if(active)setBusy(false)});
  return ()=>{active=false};
 },[classId]);
 const selected=selection?grid.find(cell=>cell.key===selection):undefined;
 const placementEnabled=!!context?.setup_complete && !!draft && !(context?.blockers?.save_line?.length) && periods.length>0;
 const place=()=>{
   if(!selected||!chosenAssignment||!placementEnabled)return;
   const slot=selectStudioPeriod(periods,selected.periodId,selected.day,availableDays);
   if(!slot)return;
   if(selected.savedLine){setError('الخانة تحتوي على حصة محفوظة. التعديل عليها سيكون متاحًا بعد تفعيل عقد الشبكة.');return;}
   setPending(old=>({...old,[selected.key]:chosenAssignment}));
   setSelection('');setError('');
 };
 const clear=()=>{
   if(!selected)return;
   setPending(old=>{const next={...old};delete next[selected.key];return next});
   setSelection('');
 };
 return <main className="admin-workspace" dir="rtl" style={{display:'grid',gap:18}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
   <div><h1 style={{fontSize:26,fontWeight:750}}>استوديو استعمال الزمان</h1><p>وزّع الإسنادات على الحصص المعتمدة بصريًا، دون كتابة الأوقات من جديد.</p></div>
   <Link href="/admin/timetable/bulk">المحرر السابق ←</Link>
  </header>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
   <label style={{display:'grid',gap:6,minWidth:240}}>القسم
    <select value={classId} onChange={e=>setClassId(Number(e.target.value))}>
     <option value={0}>اختر القسم</option>
     {(classes.data??[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
   </label>
   <Link href="/admin/timetable/setup">إعداد الأيام والفترات</Link>
  </div>
  {classes.error&&<p role="alert">تعذر تحميل الأقسام.</p>}
  {busy&&<p role="status">جارٍ تحميل جدول القسم...</p>}
  {error&&<p role="alert">{error}</p>}
  {ready&&context&&<div style={{display:'grid',gap:16}}>
    {!context.setup_complete&&<p role="alert">الإعداد الدراسي غير مكتمل. يجب ضبط الأيام والفترات أولًا.</p>}
    {context.blockers.save_line.length>0&&<p role="status">الحفظ غير متاح بسبب حواجز Odoo: {context.blockers.save_line.join('، ')}. لن يجري تجاوزها في الواجهة.</p>}
    <div style={{padding:12,border:'1px solid var(--border)',borderRadius:12}}>
     <strong>الإسنادات المتاحة للقسم</strong>
     <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
      {assignments.map(a=><button key={a.assignment_id} type="button" onClick={()=>setChosenAssignment(a.assignment_id)} aria-pressed={chosenAssignment===a.assignment_id} style={{padding:'9px 12px',border:'1px solid var(--border)',borderRadius:10,background:chosenAssignment===a.assignment_id?'var(--muted)':'transparent'}}>{a.subject_name} — {a.teacher_name}</button>)}
     </div>
    </div>
    <div style={{overflowX:'auto'}}>
     <div style={{minWidth:750,display:'grid',gridTemplateColumns:'110px repeat(7,minmax(95px,1fr))',gap:5}}>
      <div style={{fontWeight:700,padding:10}}>الفترة</div>
      {DAYS.map(([key,label])=><div key={key} style={{padding:10,fontWeight:700,textAlign:'center'}}>{label}</div>)}
      {periods.map(p=><div key={p.id} style={{display:'contents'}}>
       <div style={{padding:10,background:'var(--card)',border:'1px solid var(--border)',borderRadius:9}}><strong>{p.name}</strong><div style={{fontSize:12}} dir="ltr">{clock(p.start_time)}–{clock(p.end_time)}</div></div>
       {DAYS.map(([day])=>{
        const cell=grid.find(c=>c.day===day&&c.periodId===p.id);
        const ass=cell?.assignmentId?assignments.find(a=>a.assignment_id===cell.assignmentId):null;
        const unavailable=!availableDays.includes(day)||!selectStudioPeriod(periods,p.id,day,availableDays,context.allowed_weekdays);
        return <button key={day} type="button" disabled={unavailable||!placementEnabled&& !cell?.savedLine} onClick={()=>setSelection(cell?.key??'')} style={{minHeight:74,padding:7,border:'1px solid var(--border)',borderRadius:9,background:cell?.key===selection?'var(--muted)':'var(--card)',opacity:unavailable?.45:1,textAlign:'center'}}>
          {unavailable?'—':ass?<><strong>{ass.subject_name}</strong><div style={{fontSize:11}}>{ass.teacher_name}</div></>:cell?.savedLine?<><strong>حصة محفوظة</strong><div style={{fontSize:11}}>إسناد غير متاح حاليًا</div></>:'+'}
         </button>
       })}
      </div>)}
     </div>
    </div>
    {selected&&<section style={{padding:16,border:'1px solid var(--border)',borderRadius:12,display:'flex',alignItems:'end',gap:12,flexWrap:'wrap'}}>
     <strong>الخانة المختارة: {DAYS.find(d=>d[0]===selected.day)?.[1]} — {periods.find(p=>p.id===selected.periodId)?.name}</strong>
     <button type="button" onClick={place} disabled={!chosenAssignment||!placementEnabled||!!selected.savedLine}>وضع الإسناد</button>
     {Object.prototype.hasOwnProperty.call(pending,selected.key)&&<button type="button" onClick={clear}>إزالة التوزيع المؤقت</button>}
    </section>}
    <p role="status" style={{padding:13,borderRadius:12,border:'1px solid var(--border)'}}>
     هذه معاينة توزيع محلية دون حفظ. {Object.keys(pending).length} خانة قيد التجربة. سيُفعّل الحفظ بعد نشر عقد Odoo الخاص بـ period_id والتحقق من ربط المسودة وإجراءات الصلاحيات؛ لا توجد كتابة خفية على Nibras.
    </p>
   </div>}
 </main>;
}
