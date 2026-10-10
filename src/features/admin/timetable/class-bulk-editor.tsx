'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import {useGlobalAcademicYearResource} from '@/features/academic-context/hooks/use-global-academic-year-resource';
import {useAdminResource} from '@/lib/hooks/use-admin-resource';
import type {Level} from '@/types/class';
import {useSession} from '@/features/auth/session-context';
import {hasPermission} from '@/lib/permissions/permissions';
import type {SchoolClass} from '@/types/class';
import './class-bulk-editor.css';
import {allowedTimetableDays,timetableSetupMessage,timetableSetupReady,type TimetableSetupContext} from './utils/setup-context';
import {errorForTimetableLine,failedTimetableDeletionIds,rejectedTimetableIndexes,timetableBulkSaveNotice,validTimetableLineIds,type BulkSaveError} from './utils/bulk-save-result';
type Assignment={assignment_id:number;subject_name:string;teacher_name:string};
type Line={line_id?:number;assignment_id:number;weekday:string;start_time:number;end_time:number;room_id?:number|false;conflict_messages?:string[]};
type Draft={draft_id:number;state:string;write_date:string;conflict_count:number;can_publish:boolean;lines:Line[]};
type Editable=Line&{key:string;dirty:boolean;error?:string};
type BulkError=BulkSaveError;
const DAYS=[['monday','الاثنين'],['tuesday','الثلاثاء'],['wednesday','الأربعاء'],['thursday','الخميس'],['friday','الجمعة'],['saturday','السبت']] as const;
const clock=(n:number)=>{const m=Math.round(n*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const decimal=(v:string)=>{const [h,m]=v.split(':').map(Number);return h+m/60};
const toEdit=(l:Line):Editable=>({...l,key:l.line_id?'id-'+l.line_id:'local-'+Math.random(),dirty:false});
const error=(e:unknown)=>e instanceof Error?e.message:'تعذر إتمام العملية';
export function ClassBulkTimetableEditor(){
const user=useSession(),canManage=hasPermission(user,'manage_timetable'),canPublish=hasPermission(user,'publish_timetable');
const classes=useGlobalAcademicYearResource<SchoolClass[]>(endpoints.admin.classes);
const levelResource=useAdminResource<Level[]>(endpoints.admin.levels, {page_size:500});
const [cycle,setCycle]=useState(''),[level,setLevel]=useState(''),[track,setTrack]=useState(''),[classId,setClassId]=useState(0);
const [assignments,setAssignments]=useState<Assignment[]>([]),[draft,setDraft]=useState<Draft|null>(null),[lines,setLines]=useState<Editable[]>([]),[deleted,setDeleted]=useState<number[]>([]);
const [selected,setSelected]=useState(0),[day,setDay]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState('');
const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
const [setup,setSetup]=useState<TimetableSetupContext|null>(null),[setupUnavailable,setSetupUnavailable]=useState(false);
const version=useRef(0),busyRef=useRef(false);
const all=useMemo(()=>classes.data??[],[classes.data]);
const allLevels=useMemo(()=>levelResource.data??[],[levelResource.data]);
const linkedLevels=useMemo(()=>new Set(all.map(c=>c.level?.id).filter((id):id is number=>typeof id==='number')),[all]);
const knownLevels=useMemo(()=>allLevels.filter(l=>linkedLevels.has(l.id)),[allLevels,linkedLevels]);
const cycles=useMemo(()=>Array.from(new Set(knownLevels.map(l=>l.cycle?.name).filter((v):v is string=>!!v))),[knownLevels]);
const levels=useMemo(()=>knownLevels.filter(l=>!cycle||l.cycle?.name===cycle).map(l=>({id:l.id,name:l.name})),[knownLevels,cycle]);
const tracks=useMemo(()=>all.filter(c=>!!level&&c.level?.id===Number(level)&&!!c.track?.id).map(c=>({id:c.track!.id,name:c.track!.name})).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i),[all,level]);
const showTrack=tracks.length>1;
const options=useMemo(()=>all.filter(c=>(!level||c.level?.id===Number(level))&&(!track||(c.track?.id??0)===Number(track))),[all,level,track]);
const dirty=lines.some(l=>l.dirty)||deleted.length>0;
const currentClass=all.find(c=>c.id===classId);
const setupReady=timetableSetupReady(setup)&&!setupUnavailable;
const openDays=allowedTimetableDays(setup);
async function load(id:number){
const token=++version.current;setDraft(null);setLines([]);setDeleted([]);setAssignments([]);setNotice('');setSetup(null);setSetupUnavailable(false);
if(!id)return;
setBusy(true);
try{
const [a,d]=await Promise.all([
api.get<{assignments:Assignment[]}>(endpoints.admin.classTimetableAssignments(id)),
api.get<{draft:Draft|null}>(endpoints.admin.classTimetableDraft(id))]);
if(token!==version.current)return;
if(!a.success)throw new Error(a.error.message);
if(!d.success)throw new Error(d.error.message);
setAssignments(a.data.assignments??[]);setDraft(d.data.draft);setLines((d.data.draft?.lines??[]).map(toEdit));
const ctx=await api.get<TimetableSetupContext>(endpoints.admin.timetableSetupContext,{class_id:id,...d.data.draft?.draft_id?{draft_id:d.data.draft.draft_id}:{}});
if(token!==version.current)return;
if(ctx.success&&ctx.data){setSetup(ctx.data);setSetupUnavailable(false)}else{setSetup(null);setSetupUnavailable(true)}
}catch(e){if(token===version.current)setNotice(error(e))}
finally{if(token===version.current)setBusy(false)}
}
useEffect(()=>{void load(classId);return()=>{version.current++}},[classId]);
const choose=(id:number)=>{if(busy||busyRef.current)return false;if(dirty&&!window.confirm('تجاهل التعديلات غير المحفوظة؟'))return false;setClassId(id);return true};
const act=async(kind:'open'|'validate'|'publish')=>{
if(!classId||!setupReady||busy||busyRef.current)return;
if(kind!=='open'&&(!draft||dirty)){setNotice('احفظ التعديلات أولًا');return}
if(kind==='publish'&&(!canPublish||!draft?.can_publish||!window.confirm('نشر استعمال الزمان لهذا القسم فقط؟')))return;
busyRef.current=true;setBusy(true);
try{
const path=kind==='open'?endpoints.admin.classTimetableDraftOpen(classId):kind==='validate'?endpoints.admin.classTimetableDraftValidate(classId):endpoints.admin.classTimetableDraftPublish(classId);
const payload=kind==='open'?{}:kind==='validate'?{draft_id:draft!.draft_id}:{draft_id:draft!.draft_id,expected_write_date:draft!.write_date};
const res=await api.post<{draft:Draft;state?:string}>(path,payload);
if(!res.success)throw new Error(res.error.code==='timetable_draft_stale'?'المسودة تغيرت في جلسة أخرى؛ أعد التحميل':res.error.message);
if(kind==='publish'){busyRef.current=false;await load(classId);setNotice('تم النشر للقسم فقط')}
else{setDraft(res.data.draft);setLines(res.data.draft.lines.map(toEdit));setNotice(kind==='open'?'تم فتح المسودة':'اكتمل التحقق')}
}catch(e){setNotice(error(e))}finally{busyRef.current=false;setBusy(false)}
};

const save=async()=>{
if(!draft||!setupReady||!canManage||busy||busyRef.current)return;
const changed=lines.filter(l=>l.dirty);
if(changed.some(l=>!l.assignment_id||!Number.isFinite(l.start_time)||!Number.isFinite(l.end_time)||l.end_time<=l.start_time)){setNotice('تحقق من الإسناد وتوقيت كل حصة');return}
busyRef.current=true;setBusy(true);
try{
const r=await api.post<{draft:Draft;bulk_result:{errors:BulkError[];created?:unknown[];updated?:unknown[];deleted?:unknown[]}}>(endpoints.admin.classTimetableDraftBulk(classId),{
draft_id:draft.draft_id,lines:changed.map(l=>({...l.line_id?{line_id:l.line_id}:{},assignment_id:l.assignment_id,weekday:l.weekday,start_time:l.start_time,end_time:l.end_time,...l.room_id?{room_id:l.room_id}:{}})),delete_line_ids:validTimetableLineIds(deleted)
});
if(!r.success)throw new Error(r.error.message);
const problems=r.data.bulk_result?.errors??[];
const bad=rejectedTimetableIndexes(problems);
const failed=changed.flatMap((l,i)=>bad.has(i)?[{...l,error:errorForTimetableLine(problems,i,l.line_id)?.message??'رفض الخادم هذه الحصة'}]:[]);
const ids=new Set(validTimetableLineIds(failed.map(l=>l.line_id)));
setDraft(r.data.draft);setLines([...r.data.draft.lines.filter(l=>!l.line_id||!ids.has(l.line_id)).map(toEdit),...failed]);
setDeleted(failedTimetableDeletionIds(problems).filter(id=>deleted.includes(id)));
setNotice(timetableBulkSaveNotice(problems,(r.data.bulk_result?.created?.length??0)+(r.data.bulk_result?.updated?.length??0)+(r.data.bulk_result?.deleted?.length??0)));
}catch(e){setNotice(error(e))}finally{busyRef.current=false;setBusy(false)}
};
const add=()=>{
if(!draft||!setupReady||!selected||!canManage||busy)return;
if(!openDays.includes(day)){setNotice('اليوم المحدد غير متاح في إعداد استعمال الزمان.');return}
const s=decimal(start),e=decimal(end);
if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s){setNotice('وقت النهاية يجب أن يكون بعد البداية');return}
setLines(v=>[...v,{key:'new-'+Date.now()+'-'+v.length,assignment_id:selected,weekday:day,start_time:s,end_time:e,dirty:true}]);setNotice('حصة جديدة غير محفوظة');
};
const update=(key:string,patch:Partial<Editable>)=>setLines(v=>v.map(l=>l.key===key?{...l,...patch,dirty:true,error:undefined}:l));
const remove=(key:string)=>{
if(!setupReady)return;
const found=lines.find(l=>l.key===key);
if(found?.line_id)setDeleted(ids=>[...ids,found.line_id!]);
setLines(v=>v.filter(l=>l.key!==key));
};
return <section className="class-bulk">
<h2>محرّر استعمال الزمان حسب القسم</h2>
<p>اختر القسم ثم المادة والأستاذ من الإسنادات الموجودة؛ الحفظ في مسودة مستقلة لكل قسم.</p>
<div className="class-bulk__filters" aria-label="اختيار القسم">
{classes.loading||levelResource.loading?<p role="status">جارٍ تحميل الأسلاك والأقسام...</p>:null}
{classes.error||levelResource.error?<p role="alert">تعذر تحميل بيانات الأسلاك أو الأقسام. حاول تحديث الصفحة.</p>:null}
{!classes.loading&&!levelResource.loading&&cycles.length===0?<p role="alert">لا توجد أسلاك مرتبطة بمستويات الأقسام الحالية. تحقق من إعدادات المستويات والسنة الدراسية.</p>:null}
<label>السلك<select value={cycle} onChange={e=>{if(!choose(0))return;setCycle(e.target.value);setLevel('');setTrack('')}}><option value="">جميع الأسلاك</option>{cycles.map(v=><option key={v}>{v}</option>)}</select></label>
<label>المستوى<select disabled={!cycle||busy} value={level} onChange={e=>{if(!choose(0))return;setLevel(e.target.value);setTrack('')}}><option value="">جميع المستويات</option>{levels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
{showTrack&&<label>المسلك (عند الحاجة)<select disabled={busy||!level} value={track} onChange={e=>{if(!choose(0))return;setTrack(e.target.value)}}><option value="">جميع المسالك</option>{tracks.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}
<label>القسم<select disabled={!level||busy} value={classId} onChange={e=>{choose(Number(e.target.value))}}><option value={0}>اختر القسم</option>{options.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
</div>
{classId>0&&!setupReady&&<section role="status" aria-live="polite" className="class-bulk__setup-card"><strong>إعداد استعمال الزمان غير جاهز</strong><p>{timetableSetupMessage(setup,setupUnavailable)}</p><p>يمكنك متابعة مراجعة القسم، لكن لن تتم إضافة حصص أو حفظها حتى تكتمل الأيام الدراسية والفترات المعتمدة.</p><small>{canManage?"صفحة ضبط الأيام والفترات الدراسية غير متاحة بعد. لا يلزم الانتقال إلى الإعدادات العامة؛ سنوفر إعدادًا مستقلًا قبل السماح بتحرير الحصص.":"يرجى التواصل مع إدارة المؤسسة؛ إعداد الأيام والفترات الدراسية غير متاح بعد."}</small></section>}
{classId>0&&setupReady&&<p role="status" className="class-bulk__notice">{timetableSetupMessage(setup,setupUnavailable)}</p>}
{notice&&<p role="status" className="class-bulk__notice">{notice}</p>}
{busy&&<p>جارٍ تنفيذ العملية...</p>}
{draft&&!setupReady&&!busy&&<p className="class-bulk__draft-summary">المسودة الحالية محفوظة: {draft.state} · التعارضات: {draft.conflict_count}. سيظهر المحرر بمجرد اكتمال إعداد استعمال الزمان.</p>}
{classId&&!draft&&!busy&&<div className="class-bulk__selection" aria-live="polite"><div><span className="class-bulk__selection-label">القسم المختار</span><strong>{currentClass?.name??'القسم'}</strong><span className="class-bulk__selection-hint">{cycle} · {currentClass?.level?.name??''}</span></div><button type="button" className="class-bulk__primary-button" disabled={!canManage||!setupReady} onClick={()=>void act('open')}>بدء إعداد استعمال الزمان <span aria-hidden="true">←</span></button>{!canManage&&<small>ليس لديك صلاحية إدارة استعمال الزمان.</small>}</div>}
{draft&&setupReady&&<><p>الحالة: {draft.state} · تعارضات: {draft.conflict_count}{dirty?' · تعديلات غير محفوظة':''}</p>
<div className="class-bulk__form">
<label>المادة والأستاذ<select value={selected} onChange={e=>setSelected(Number(e.target.value))}><option value={0}>اختر الإسناد</option>{assignments.map(a=><option key={a.assignment_id} value={a.assignment_id}>{a.subject_name} — {a.teacher_name}</option>)}</select></label>
<label>اليوم<select value={openDays.includes(day)?day:''} disabled={!setupReady} onChange={e=>setDay(e.target.value)}><option value="">اختر يومًا</option>{DAYS.filter(([v])=>openDays.includes(v)).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
<label>البداية<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label>
<label>النهاية<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label>
<button disabled={busy||!canManage||!setupReady||!selected} onClick={add}>إضافة حصة</button>
</div>
<div className="class-bulk__days">
{DAYS.map(([v,name])=><div key={v} className="class-bulk__day"><h3>{name}</h3>
{lines.filter(l=>l.weekday===v).sort((a,b)=>a.start_time-b.start_time).map(l=><div key={l.key} className="class-bulk__line">
<select disabled={busy||!canManage||!setupReady} value={l.assignment_id} onChange={e=>update(l.key,{assignment_id:Number(e.target.value)})}>{assignments.map(a=><option key={a.assignment_id} value={a.assignment_id}>{a.subject_name} — {a.teacher_name}</option>)}</select>
<input aria-label="بداية الحصة" type="time" value={clock(l.start_time)} disabled={busy||!canManage||!setupReady} onChange={e=>update(l.key,{start_time:decimal(e.target.value)})}/>
<input aria-label="نهاية الحصة" type="time" value={clock(l.end_time)} disabled={busy||!canManage||!setupReady} onChange={e=>update(l.key,{end_time:decimal(e.target.value)})}/>
<button disabled={busy||!canManage||!setupReady} onClick={()=>remove(l.key)}>حذف</button>
{l.dirty&&<small>غير محفوظ</small>}{l.error&&<small role="alert">{l.error}</small>}
{l.conflict_messages?.map((m,i)=><small role="alert" key={i}>{m}</small>)}
</div>)}</div>)}
</div>
<div className="class-bulk__actions"><button disabled={busy||!canManage||!setupReady||!dirty} onClick={()=>void save()}>حفظ المسودة</button><button disabled={busy||!canManage||!setupReady||dirty} onClick={()=>void act('validate')}>التحقق</button><button disabled={busy||dirty||!setupReady||!canPublish||!draft.can_publish} onClick={()=>void act('publish')}>نشر هذا القسم</button></div>
</>}
</section>;
}
