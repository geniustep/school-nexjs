'use client';
import {useEffect,useMemo,useState} from 'react';
import {useSession} from '@/features/auth/session-context';
import {hasPermission} from '@/lib/permissions/permissions';
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
 const user=useSession();
 const canManage=hasPermission(user,'manage_timetable');
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
 const [history,setHistory]=useState<Array<Record<string,number|null>>>([]);
 const [feedback,setFeedback]=useState('');
 const availableDays=useMemo(()=>allowedTimetableDays(context),[context]);
 const periods=useMemo(()=>context?.periods??[],[context]);
 const grid=useMemo(()=>buildStudioGrid(periods,availableDays,draft?.lines??[],pending),[periods,availableDays,draft,pending]);
 useEffect(()=>{
  let active=true;
  setContext(null);setDraft(null);setAssignments([]);setPending({});setError('');setReady(false);setSelection('');setChosenAssignment(0);setHistory([]);setFeedback('');
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
 const placementEnabled=canManage && !!context?.setup_complete && periods.length>0 && assignments.length>0;
 const saveBlocked=!!context?.blockers?.save_line?.length || !draft;
 const previewCount=Object.keys(pending).length;
 const remember=(next:Record<string,number|null>)=>{setHistory(old=>[...old.slice(-29),pending]);setPending(next);};
 const revert=()=>{if(!history.length)return;setPending(history[history.length-1]);setHistory(old=>old.slice(0,-1));setFeedback('تم التراجع عن آخر تغيير في المعاينة.');};
 const place=()=>{
   if(!selected||!chosenAssignment||!placementEnabled)return;
   const slot=selectStudioPeriod(periods,selected.periodId,selected.day,availableDays,context?.allowed_weekdays);
   if(!slot)return;
   remember({...pending,[selected.key]:chosenAssignment});
   setSelection('');setFeedback('أُضيفت الحصة إلى المعاينة. لم يُحفظ التغيير بعد.');setError('');
 };
 const clear=()=>{
   if(!selected||!placementEnabled)return;
   remember({...pending,[selected.key]:null});
   setSelection('');setFeedback('أُزيلت الحصة من المعاينة فقط.');
 };
 const resetPreview=()=>{
   if(previewCount && !window.confirm('إلغاء جميع تعديلات المعاينة غير المحفوظة؟'))return;
   remember({});setSelection('');setFeedback('تمت استعادة المعاينة الأصلية.');
 };
 return <main className={styles.studio} dir="rtl">
  <header className={styles.hero}>
   <div><span className={styles.eyebrow}>رقيم / التنظيم الدراسي</span><h1>استوديو استعمال الزمان</h1><p>وزّع المواد والأساتذة على شبكة الحصص المعتمدة، دون إعادة كتابة الأوقات.</p></div>
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
  {error&&<div role="alert" className={styles.warning}>{error} <button type="button" onClick={()=>{setError('');setClassId(0)}}>إعادة المحاولة</button></div>}
  {ready&&context&&<div className={styles.workspace}>
    {!context.setup_complete&&<div role="alert" className={styles.warning}><strong>إعداد استعمال الزمان غير مكتمل</strong><p>يجب إكمال الأيام الدراسية والفترات قبل توزيع الحصص.</p><Link href="/admin/timetable/setup">فتح إعداد الأيام والفترات ←</Link></div>}
    {saveBlocked&&<div className={styles.statusNote} role="status"><span aria-hidden="true">◈</span><div><strong>التوزيع التجريبي متاح الآن</strong><p>يمكنك إضافة الحصص وتغييرها والتراجع عنها داخل هذه الصفحة. حفظ المسودة في المؤسسة غير متاح مؤقتًا إلى حين اكتمال ربط إعداد التوقيت؛ لن تُرسل تعديلاتك دون إجراء حفظ صريح.</p></div></div>}
    <div className={styles.workspaceStats}><span><strong>{periods.length}</strong> فترات معتمدة</span><span><strong>{assignments.length}</strong> إسنادات متاحة</span><span><strong>{previewCount}</strong> تعديلات قيد التجربة</span><div className={styles.quickActions}><button type="button" disabled={!history.length} onClick={revert}>↶ تراجع</button><button type="button" disabled={!previewCount} onClick={resetPreview}>إلغاء التعديلات</button></div></div>

    <div className={styles.assignments}>
     <h2>المواد والأساتذة</h2><p>اختر إسنادًا ثم انقر على خانة في الشبكة لمعاينة توزيعه.</p>
     <div className={styles.assignmentList}>
      {assignments.map(a=><button key={a.assignment_id} type="button" onClick={()=>setChosenAssignment(a.assignment_id)} aria-pressed={chosenAssignment===a.assignment_id} disabled={!canManage} className={chosenAssignment===a.assignment_id?styles.assignmentActive:styles.assignment}>{a.subject_name} — {a.teacher_name}</button>)}
     </div>
    </div>
    <div className={styles.gridPanel}>
      <div className={styles.gridPanelHeader}><div><h2>الشبكة الأسبوعية</h2><p>انقر على أي خانة متاحة لوضع الإسناد المختار أو تغييره.</p></div><span>الحصص وفق التوقيت المعتمد</span></div>
      <div className={styles.gridScroll}>
      <div className={styles.weekGrid}>
        <div className={styles.dayHead}>الفترة</div>
        {DAYS.map(([key,label])=><div className={styles.dayHead} key={key}>{label}</div>)}
        {periods.map(p=><div key={p.id} className={styles.gridRow}>
          <div className={styles.periodLabel}><strong>{p.name}</strong><time dir="ltr">{clock(p.start_time)} – {clock(p.end_time)}</time></div>
          {DAYS.map(([day])=>{
            const cell=grid.find(c=>c.day===day&&c.periodId===p.id);
            const assignment=cell?.assignmentId?assignments.find(a=>a.assignment_id===cell.assignmentId):null;
            const unavailable=!selectStudioPeriod(periods,p.id,day,availableDays,context.allowed_weekdays);
            const isSelected=selection===cell?.key;
            const modified=cell?.key?Object.prototype.hasOwnProperty.call(pending,cell.key):false;
            return <button key={day} type="button" aria-label={unavailable?'فترة غير متاحة':`${DAYS.find(d=>d[0]===day)?.[1]}، ${p.name}، ${assignment?.subject_name??'خانة شاغرة'}`} aria-pressed={isSelected} disabled={unavailable||!canManage} onClick={()=>{setSelection(cell?.key??'');setFeedback('')}} className={unavailable?styles.cellClosed:isSelected?styles.cellSelected:assignment?styles.cellFilled:styles.cellEmpty}>
              {unavailable?<span aria-hidden="true">—</span>:assignment?<><strong>{assignment.subject_name}</strong><small>{assignment.teacher_name}</small>{modified&&<i>معدل محليًا</i>}</>:cell?.savedLine?<><strong>حصة مسجلة</strong><small>تحقق من إسنادها</small></>:<><span className={styles.addSymbol}>＋</span><small>إضافة حصة</small></>}
            </button>
          })}
        </div>)}
      </div>
      </div>
    </div>
    {selected&&<section className={styles.composer} aria-label="تحرير الخانة">
      <div><span className={styles.eyebrow}>الخانة المختارة</span><h3>{DAYS.find(d=>d[0]===selected.day)?.[1]} · {periods.find(p=>p.id===selected.periodId)?.name}</h3><p>اختر مادة وأستاذًا من الإسنادات أعلاه، ثم اضغط «وضع الحصة».</p></div>
      <div className={styles.composerActions}><button type="button" className={styles.primaryAction} onClick={place} disabled={!chosenAssignment||!placementEnabled}>وضع الحصة</button><button type="button" onClick={clear} disabled={!placementEnabled||(!selected.savedLine&&!Object.prototype.hasOwnProperty.call(pending,selected.key))}>تفريغ الخانة</button><button type="button" onClick={()=>setSelection('')}>إلغاء</button></div>
    </section>}
    {feedback&&<p role="status" className={styles.feedback}>{feedback}</p>}
    <div className={styles.bottomBar}><div><strong>معاينة قابلة للتعديل</strong><p>التعديلات الحالية محفوظة داخل الصفحة مؤقتًا فقط، وستُفقد عند تغيير القسم أو تحديث الصفحة.</p></div><button type="button" disabled title="حفظ الجدول غير متاح حتى اكتمال ربط الإعداد بالمسودة">حفظ استعمال الزمان · قريبًا</button></div>

   </div>}
 </main>;
}
