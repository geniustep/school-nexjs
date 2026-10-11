'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {RequireAdminPermission} from '@/components/admin/require-admin-permission';
import {useGlobalAcademicYearResource} from '@/features/academic-context/hooks/use-global-academic-year-resource';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import type {SchoolClass,Level} from '@/types/class';
import {useAdminResource} from '@/lib/hooks/use-admin-resource';
import {buildStudioCatalog,studioLevelsForCycle,studioClassesForLevel} from './academic-filters';
import styles from './studio.module.css';
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
 const classes=useGlobalAcademicYearResource<SchoolClass[]>(endpoints.admin.classes,{page_size:500});
 const levels=useAdminResource<Level[]>(endpoints.admin.levels,{page_size:500});
 const [cycle,setCycle]=useState('');
 const [levelId,setLevelId]=useState(0);
 const allClasses=useMemo(()=>classes.data??[],[classes.data]);
 const catalog=useMemo(()=>buildStudioCatalog(allClasses,levels.data??[]),[allClasses,levels.data]);
 const filteredLevels=useMemo(()=>studioLevelsForCycle(catalog,cycle),[catalog,cycle]);
 const filteredClasses=useMemo(()=>studioClassesForLevel(allClasses,levelId),[allClasses,levelId]);
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
 return <main className={styles.studio} dir="rtl">
  <header className={styles.hero}>
   <div><span className={styles.eyebrow}>RAQEEM · TIMETABLE STUDIO</span><h1>استوديو استعمال الزمان</h1><p>أنشئ استعمال الزمان بصريًا انطلاقًا من الفترات والإسنادات المعتمدة، دون إدخال الساعات مرة أخرى.</p></div>
   <div className={styles.heroActions}><Link href="/admin/timetable/bulk">المحرر السابق</Link><Link href="/admin/timetable/setup">إعداد الأيام والفترات</Link></div>
  </header>
  <section className={styles.filters} aria-label="اختيار السلك والمستوى والقسم">
   <div className={styles.filterHeader}><div><h2>اختر القسم الدراسي</h2><p>حدد السلك، ثم المستوى، ثم القسم لعرض شبكته الأسبوعية.</p></div><span className={styles.count}>{classes.loading?'جارٍ تحميل الأقسام':allClasses.length+' قسمًا محمّلًا'}</span></div>
   <div className={styles.filterGrid}>
    <label><span>01 · السلك</span><select value={cycle} disabled={classes.loading||levels.loading||catalog.cycles.length===0} onChange={e=>{setCycle(e.target.value);setLevelId(0);setClassId(0)}}><option value="">اختر السلك</option>{catalog.cycles.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label><span>02 · المستوى</span><select value={levelId} disabled={!cycle||filteredLevels.length===0} onChange={e=>{setLevelId(Number(e.target.value));setClassId(0)}}><option value={0}>اختر المستوى</option>{filteredLevels.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
    <label><span>03 · القسم</span><select value={classId} disabled={!levelId||filteredClasses.length===0} onChange={e=>setClassId(Number(e.target.value))}><option value={0}>اختر القسم</option>{filteredClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   </div>
   {(cycle||levelId>0||classId>0)&&<div className={styles.path} aria-live="polite"><span>{cycle||'السلك'}</span><span aria-hidden="true">←</span><span>{filteredLevels.find(l=>l.id===levelId)?.name||'المستوى'}</span><span aria-hidden="true">←</span><strong>{filteredClasses.find(c=>c.id===classId)?.name||'القسم'}</strong></div>}
   {classes.loading||levels.loading?<p className={styles.info} role="status">جارٍ تحميل بيانات السنة الدراسية والأقسام...</p>:null}
   {classes.error||levels.error?<div role="alert" className={styles.warning}>تعذر تحميل بيانات الأقسام أو المستويات. تحقق من المدرسة والسنة الدراسية، ثم أعد المحاولة. <button type="button" onClick={()=>{classes.reload();levels.reload()}}>إعادة المحاولة</button></div>:null}
   {!classes.loading&&!classes.error&&allClasses.length===0?<div role="status" className={styles.warning}>لم تُرجع خدمة الأقسام أي قسم للسنة الدراسية المختارة. تحقق من السنة والمدرسة في الشريط العلوي، ثم جرّب إعادة التحميل. <button type="button" onClick={()=>classes.reload()}>تحديث الأقسام</button></div>:null}
   {!classes.loading&&!levels.loading&&allClasses.length>0&&catalog.cycles.length===0?<p role="status" className={styles.warning}>الأقسام موجودة لكن لم يمكن تحديد أسلاكها من بيانات المستويات. راجع الربط الأكاديمي.</p>:null}
   {classes.meta?.pagination?.total!=null&&classes.meta.pagination.total>allClasses.length?<p role="status" className={styles.warning}>يحتوي المصدر على {classes.meta.pagination.total} قسمًا بينما وصل {allClasses.length} فقط. لا يمكن ضمان ظهور جميع الأقسام قبل استكمال تحميل القائمة.</p>:null}
  </section>
  {!classId&&!busy&&<section className={styles.empty}><span aria-hidden="true" className={styles.emptyIcon}>▦</span><h2>شبكتك الأسبوعية تبدأ من هنا</h2><p>اختر السلك ثم المستوى ثم القسم؛ سيظهر استعمال الزمان المعتمد والإسنادات المتاحة.</p></section>}
  {busy&&<section className={styles.empty} role="status"><div className={styles.skeleton}/><div className={styles.skeleton}/><p>جارٍ تحميل جدول القسم والفترات...</p></section>}
  {error&&<div role="alert" className={styles.warning}>{error} <button type="button" onClick={()=>setClassId(id=>{const current=id;setClassId(0);return current})}>إعادة المحاولة</button></div>}
  {ready&&context&&<div style={{display:'grid',gap:16}}>
    {!context.setup_complete&&<div role="alert" className={styles.warning}><strong>إعداد استعمال الزمان غير مكتمل</strong><p>يجب إكمال الأيام الدراسية والفترات قبل توزيع الحصص.</p><Link href="/admin/timetable/setup">فتح إعداد الأيام والفترات ←</Link></div>}
    {context.blockers.save_line.length>0&&<p role="status">الحفظ غير متاح بسبب حواجز Odoo: {context.blockers.save_line.join('، ')}. لن يجري تجاوزها في الواجهة.</p>}
    <div className={styles.assignments}>
     <h2>المواد والأساتذة</h2><p>اختر إسنادًا ثم انقر على خانة في الشبكة لمعاينة توزيعه.</p>
     <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
      {assignments.map(a=><button key={a.assignment_id} type="button" onClick={()=>setChosenAssignment(a.assignment_id)} aria-pressed={chosenAssignment===a.assignment_id} className={chosenAssignment===a.assignment_id?styles.assignmentActive:styles.assignment}>{a.subject_name} — {a.teacher_name}</button>)}
     </div>
    </div>
    <div className={styles.gridPanel}><div className={styles.gridPanelHeader}><h2>الشبكة الأسبوعية</h2><span>الأوقات مستمدة من إعداد المؤسسة</span></div><div style={{overflowX:'auto'}}>
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
