'use client';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {RequireAdminPermission} from '@/components/admin/require-admin-permission';
import {useAdminSession} from '@/features/auth/admin-session-context';
import {useSession} from '@/features/auth/session-context';
import {hasPermission} from '@/lib/permissions/permissions';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import {useGlobalAcademicYearResource} from '@/features/academic-context/hooks/use-global-academic-year-resource';
import type {SchoolClass} from '@/types/class';
import styles from './timetable-setup.module.css';

const WEEKDAYS=[['monday','الاثنين'],['tuesday','الثلاثاء'],['wednesday','الأربعاء'],['thursday','الخميس'],['friday','الجمعة'],['saturday','السبت'],['sunday','الأحد']] as const;
type Mode='full'|'morning_only'|'afternoon_only'|'closed';
type Day={id?:number|null;day_of_week:string;day_mode:Mode|null;sequence:number};
type Period={id?:number|null;name:string;start_time:string|number;end_time:string|number;session_half:'morning'|'afternoon';sequence:number};
type Break={id?:number|null;name:string;start_time:string|number;end_time:string|number;sequence:number};
type Setup={
  school_id:number;academic_year_id:number;timezone:string;config_id:number|null;config_version:string|null;
  name:string|null;slot_duration_minutes:number|null;configuration_scope:{scope_mode:'whole_school'|'classes'|null;scope_class_ids:number[];supports_level_specific_schedule:boolean;supports_cycle_specific_schedule:boolean};
  study_days:Day[];periods:Period[];breaks:Break[];is_first_time:boolean;setup_complete:boolean;
  allowed_actions:string[];
};
type Result={valid:boolean;saved:boolean;field_errors?:Record<string,string>;config_id?:number;config_version?:string};
const normalizeTime=(time:string|number):string=>{
  if(typeof time==='string')return time.length===5?time:time.slice(0,5);
  if(!Number.isFinite(time))return '';
  const minutes=Math.round(time*60);
  return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
};
import {DEFAULT_DAY_MODES,inferredBreaks,toMinutes} from './timetable-setup-utils';
const freshDays=():Day[]=>WEEKDAYS.map(([day_of_week],i)=>({day_of_week,day_mode:DEFAULT_DAY_MODES[i],sequence:(i+1)*10}));
function Editor(){
  const router=useRouter();
  const user=useSession();
  const canManage=hasPermission(user,'manage_timetable');
  const {activeAcademicYearId}=useAdminSession();
  const classes=useGlobalAcademicYearResource<SchoolClass[]>(endpoints.admin.classes);
  const [setup,setSetup]=useState<Setup|null>(null);
  const [days,setDays]=useState<Day[]>(freshDays);
  const [periods,setPeriods]=useState<Period[]>([]);
  const [breaks,setBreaks]=useState<Break[]>([]);
  const [name,setName]=useState('');
  const [duration,setDuration]=useState('');
  const [scope,setScope]=useState<'whole_school'|'classes'>('whole_school');
  const [classIds,setClassIds]=useState<number[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [ready,setReady]=useState(false);
  const [validated,setValidated]=useState(false);
  const year=activeAcademicYearId;
  const load=useCallback(async()=>{
    if(!year)return;
    setBusy(true);setNotice('');setReady(false);setValidated(false);setErrors({});
    const response=await api.get<Setup>(endpoints.admin.timetableSetup,{academic_year_id:year});
    if(!response.success){setNotice('تعذر تحميل إعداد استعمال الزمان. قد لا تكون خدمة الإعداد منشورة بعد، أو لا تملك صلاحية الاطلاع.');setBusy(false);return}
    const data=response.data;
    setSetup(data);setName(data.name??('استعمال الزمان — '+year));setDuration(data.slot_duration_minutes?String(data.slot_duration_minutes):'');
    setScope(data.configuration_scope.scope_mode==='classes'?'classes':'whole_school');
    setClassIds(data.configuration_scope.scope_class_ids??[]);
    setDays(WEEKDAYS.map(([day_of_week],i)=>{const current=data.study_days.find(d=>d.day_of_week===day_of_week);return {...current,day_of_week,day_mode:current?.day_mode??(data.is_first_time?DEFAULT_DAY_MODES[i]:null),sequence:current?.sequence??(i+1)*10};}));
    setPeriods(data.periods.map(p=>({...p,start_time:normalizeTime(p.start_time),end_time:normalizeTime(p.end_time)})));
    setBreaks(data.breaks.map(b=>({...b,start_time:normalizeTime(b.start_time),end_time:normalizeTime(b.end_time)})));
    setReady(true);setBusy(false);
  },[year]);
  useEffect(()=>{void load()},[load]);
  const mark=()=>{setValidated(false);setErrors({});setNotice('')};
  const setDay=(i:number,mode:Mode|null)=>{mark();setDays(v=>v.map((d,k)=>k===i?{...d,day_mode:mode}:d))};
  const setPeriod=(i:number,patch:Partial<Period>)=>{mark();setPeriods(v=>v.map((p,k)=>k===i?{...p,...patch}:p))};
  const setBreak=(i:number,patch:Partial<Break>)=>{mark();setBreaks(v=>v.map((p,k)=>k===i?{...p,...patch}:p))};
  const autoBreaks=inferredBreaks(periods,breaks);
  const effectiveBreaks=[...breaks,...autoBreaks];
  const durationFromFirst=periods.length?toMinutes(periods[0].end_time)-toMinutes(periods[0].start_time):NaN;
  const effectiveDuration=Number(duration)>0?Number(duration):durationFromFirst;
  const body=()=>({
    academic_year_id:year,
    ...(setup?.config_id?{config_id:setup.config_id,config_version:setup.config_version}:{}),
    name:name.trim()||('استعمال الزمان — '+year),slot_duration_minutes:effectiveDuration,
    scope_mode:scope,scope_class_ids:scope==='classes'?classIds:[],
    study_days:days.map(({id,day_of_week,day_mode,sequence})=>({...id?{id}:{},day_of_week,day_mode,sequence})),
    periods:periods.map((p,i)=>({...p.id?{id:p.id}:{},name:p.name.trim()||('الحصة '+(i+1)),start_time:p.start_time,end_time:p.end_time,session_half:p.session_half,sequence:(i+1)*10})),
    breaks:effectiveBreaks.map((b,i)=>({...b.id?{id:b.id}:{},name:b.name.trim()||('استراحة '+(i+1)),start_time:b.start_time,end_time:b.end_time,sequence:(i+1)*10}))
  });
  const submit=async(save:boolean)=>{
    if(!canManage||busy||!ready||!setup||!year)return;
    setValidated(false);setNotice('');setErrors({});
    if(days.some(d=>!d.day_mode)||periods.length===0||!Number.isInteger(effectiveDuration)||effectiveDuration<=0||(scope==='classes'&&classIds.length===0)){
      setNotice('أكمل أيام الدراسة وأدخل حصة واحدة على الأقل بوقت بداية ونهاية صحيحين، وحدد الأقسام عند اختيار نطاق محدود.');return;
    }
    if(periods.some(p=>!p.start_time||!p.end_time)||effectiveBreaks.some(b=>!b.start_time||!b.end_time)){
      setNotice('أدخل بداية ونهاية كل حصة واستراحة؛ تُولّد الأسماء تلقائيًا.');return;
    }
    setBusy(true);
    const check=await api.post<Result>(endpoints.admin.timetableSetupValidate,body());
    if(!check.success){setErrors((check.error.details as {field_errors?:Record<string,string>}|undefined)?.field_errors??{});setNotice(check.error.message);setBusy(false);return}
    if(!check.data.valid){setErrors(check.data.field_errors??{});setNotice('يرجى مراجعة الأخطاء في الجدول.');setBusy(false);return}
    if(!save){setValidated(true);setNotice('الإعداد صحيح وجاهز للحفظ.');setBusy(false);return}
    if(!window.confirm('حفظ أيام الدراسة والحصص والاستراحات المعروضة؟ لن تُعدَّل المسودات أو تُنشر الحصص.')){setBusy(false);return}
    const response=await api.put<Result>(endpoints.admin.timetableSetup,body());
    if(!response.success){
      const details=response.error.details as {field_errors?:Record<string,string>}|undefined;
      setErrors(details?.field_errors??{});
      setNotice(response.error.code==='timetable_config_stale'?'تغيّر الإعداد بواسطة مستخدم آخر. أعد تحميل الصفحة قبل الحفظ.':response.error.message);
      setBusy(false);return;
    }
    setErrors(response.data.field_errors??{});
    if(!response.data.valid){setNotice('توجد أخطاء في الفترات أو الأيام، راجع الحقول.');setBusy(false);return}
    if(save){setNotice('تم حفظ إعداد استعمال الزمان. جارٍ تحديث الحالة...');await load();router.push('/admin/timetable/bulk');return}
    setValidated(true);setNotice('تم التحقق بنجاح.');
    setBusy(false);
  };
  const canWrite=canManage&&setup?.allowed_actions.includes('save');
  return <section className={styles.page} dir="rtl">
    <header className={styles.header}><div><h1>إعداد استعمال الزمان</h1><p>حدّد الأيام والفترات الفعلية قبل تحرير حصص الأقسام. لا توجد ساعات مفترضة.</p></div><Link href="/admin/timetable/bulk">العودة إلى المحرر ←</Link></header>
    {!year&&<p role="alert">اختر السنة الدراسية أولًا.</p>}
    {busy&&<p role="status">جارٍ المعالجة...</p>}
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {ready&&setup&&<div className={styles.form}>
      <p className={styles.note}>النطاق المدعوم: المدرسة والسنة الدراسية، مع اختيار أقسام محددة عند الحاجة. لا تتوفر إعدادات مستقلة لكل سلك أو مستوى في هذه النسخة. المنطقة الزمنية: {setup.timezone}.</p>
      <div className={styles.fields}>
        <p className={styles.note}>اسم الإعداد ومدة الحصة يُحددان تلقائيًا من السنة الدراسية والحصة الأولى. يمكنك تعديلهما في الإعدادات المتقدمة لاحقًا.</p>
        <label>نطاق الإعداد<select disabled={!canWrite||busy} value={scope} onChange={e=>{mark();setScope(e.target.value as typeof scope)}}><option value="whole_school">جميع أقسام المدرسة</option><option value="classes">أقسام محددة</option></select></label>
      </div>
      {scope==='classes'&&<fieldset className={styles.panel}><legend>الأقسام المشمولة</legend>{classes.loading?'جارٍ تحميل الأقسام...':(classes.data??[]).map(c=><label key={c.id} className={styles.check}><input type="checkbox" disabled={!canWrite||busy} checked={classIds.includes(c.id)} onChange={e=>{mark();setClassIds(v=>e.target.checked?[...v,c.id]:v.filter(x=>x!==c.id))}}/>{c.name}</label>)}</fieldset>}
      <fieldset className={styles.panel}><legend>الأيام الدراسية</legend><div className={styles.dayGrid}>{days.map((d,i)=><label key={d.day_of_week}>{WEEKDAYS[i][1]}<select disabled={!canWrite||busy} value={d.day_mode??''} onChange={e=>setDay(i,e.target.value as Mode||null)}><option value="">اختر وضع اليوم</option><option value="full">يوم كامل</option><option value="morning_only">صباح فقط</option><option value="afternoon_only">بعد الزوال فقط</option><option value="closed">مغلق</option></select></label>)}</div></fieldset>
      <fieldset className={styles.panel}><legend>فترات الحصص</legend>{periods.map((p,i)=><div key={i} className={styles.interval}><strong>الحصة {i+1}</strong><label>البداية<input disabled={!canWrite||busy} type="time" value={String(p.start_time)} onChange={e=>setPeriod(i,{start_time:e.target.value})}/></label><label>النهاية<input disabled={!canWrite||busy} type="time" value={String(p.end_time)} onChange={e=>setPeriod(i,{end_time:e.target.value})}/></label><label>الحصة<select disabled={!canWrite||busy} value={p.session_half} onChange={e=>setPeriod(i,{session_half:e.target.value as Period['session_half']})}><option value="morning">صباحية</option><option value="afternoon">مسائية</option></select></label><button type="button" disabled={!canWrite||busy} onClick={()=>{mark();setPeriods(v=>v.filter((_,k)=>k!==i))}}>حذف</button></div>)}<button type="button" disabled={!canWrite||busy} onClick={()=>{mark();setPeriods(v=>[...v,{name:'',start_time:v.length?String(v[v.length-1].end_time):'',end_time:'',session_half:v.length?v[v.length-1].session_half:'morning',sequence:(v.length+1)*10}])}}>+ إضافة فترة</button></fieldset>
      {autoBreaks.length>0&&<section className={styles.note} aria-live="polite"><strong>الفواصل المكتشفة تلقائيًا</strong>{autoBreaks.map((b,i)=><p key={i}>{b.name}: {b.start_time} — {b.end_time}</p>)}</section>}
      <fieldset className={styles.panel}><legend>استراحات إضافية (اختيارية)</legend>{breaks.map((b,i)=><div key={i} className={styles.interval}><strong>{b.name||('استراحة '+(i+1))}</strong><label>البداية<input disabled={!canWrite||busy} type="time" value={String(b.start_time)} onChange={e=>setBreak(i,{start_time:e.target.value})}/></label><label>النهاية<input disabled={!canWrite||busy} type="time" value={String(b.end_time)} onChange={e=>setBreak(i,{end_time:e.target.value})}/></label><button type="button" disabled={!canWrite||busy} onClick={()=>{mark();setBreaks(v=>v.filter((_,k)=>k!==i))}}>حذف</button></div>)}<button type="button" disabled={!canWrite||busy} onClick={()=>{mark();setBreaks(v=>[...v,{name:'',start_time:'',end_time:'',sequence:(v.length+1)*10}])}}>+ إضافة استراحة</button></fieldset>
      {Object.keys(errors).length>0&&<div role="alert" className={styles.errors}>{Object.entries(errors).map(([key,value])=><p key={key}>{key}: {value}</p>)}</div>}
      <p className={styles.note}>حفظ هذا الإعداد لا يُنشئ مسودة ولا ينشر حصصًا ولا يربط المسودات الموجودة تلقائيًا.</p>
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={!canWrite||busy} onClick={()=>void submit(true)}>حفظ الإعداد</button><button type="button" disabled={busy} onClick={()=>void load()}>إعادة تحميل</button></div>
      {!canManage&&<p role="status">ليست لديك صلاحية إدارة استعمال الزمان.</p>}
    </div>}
  </section>;
}
export default function TimetableSetupPage(){return <RequireAdminPermission permission="view_timetable"><Editor/></RequireAdminPermission>}
