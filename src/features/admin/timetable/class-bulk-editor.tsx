'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {api} from '@/lib/api/client';
import {endpoints} from '@/lib/api/endpoints';
import {useGlobalAcademicYearResource} from '@/features/academic-context/hooks/use-global-academic-year-resource';
import {useSession} from '@/features/auth/session-context';
import {hasPermission} from '@/lib/permissions/permissions';
import type {SchoolClass} from '@/types/class';
import './class-bulk-editor.css';
type Assignment={assignment_id:number;subject_name:string;teacher_name:string};
type Line={line_id?:number;assignment_id:number;weekday:string;start_time:number;end_time:number;room_id?:number|false;conflict_messages?:string[]};
type Draft={draft_id:number;state:string;write_date:string;conflict_count:number;can_publish:boolean;lines:Line[]};
type Editable=Line&{key:string;dirty:boolean;error?:string};
type BulkError={index?:number;line_id?:number;message:string};
const DAYS=[['monday','الاثنين'],['tuesday','الثلاثاء'],['wednesday','الأربعاء'],['thursday','الخميس'],['friday','الجمعة'],['saturday','السبت']] as const;
const clock=(n:number)=>{const m=Math.round(n*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const decimal=(v:string)=>{const [h,m]=v.split(':').map(Number);return h+m/60};
const toEdit=(l:Line):Editable=>({...l,key:l.line_id?'id-'+l.line_id:'local-'+Math.random(),dirty:false});
const error=(e:unknown)=>e instanceof Error?e.message:'تعذر إتمام العملية';
export function ClassBulkTimetableEditor(){
const user=useSession(),canManage=hasPermission(user,'manage_timetable'),canPublish=hasPermission(user,'publish_timetable');
const classes=useGlobalAcademicYearResource<SchoolClass[]>(endpoints.admin.classes);
const [cycle,setCycle]=useState(''),[level,setLevel]=useState(''),[track,setTrack]=useState(''),[classId,setClassId]=useState(0);
const [assignments,setAssignments]=useState<Assignment[]>([]),[draft,setDraft]=useState<Draft|null>(null),[lines,setLines]=useState<Editable[]>([]),[deleted,setDeleted]=useState<number[]>([]);
const [selected,setSelected]=useState(0),[day,setDay]=useState('monday'),[start,setStart]=useState('08:00'),[end,setEnd]=useState('09:00');
const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
const version=useRef(0),busyRef=useRef(false);
const all=useMemo(()=>classes.data??[],[classes.data]);
const cycles=useMemo(()=>Array.from(new Set(all.map(c=>c.level?.cycle?.name).filter((v):v is string=>!!v))),[all]);
const levels=useMemo(()=>all.filter(c=>!cycle||c.level?.cycle?.name===cycle).map(c=>({id:c.level?.id,name:c.level?.name})).filter(x=>x.id&&x.name).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i),[all,cycle]);
const tracks=useMemo(()=>all.filter(c=>c.level?.id===Number(level)).map(c=>({id:c.track?.id??0,name:c.track?.name??'بدون مسلك'})).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i),[all,level]);
const options=useMemo(()=>all.filter(c=>(!cycle||c.level?.cycle?.name===cycle)&&(!level||c.level?.id===Number(level))&&(!track||(c.track?.id??0)===Number(track))),[all,cycle,level,track]);
const dirty=lines.some(l=>l.dirty)||deleted.length>0;
async function load(id:number){
const token=++version.current;setDraft(null);setLines([]);setDeleted([]);setAssignments([]);setNotice('');
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
}catch(e){if(token===version.current)setNotice(error(e))}
finally{if(token===version.current)setBusy(false)}
}
useEffect(()=>{void load(classId);return()=>{version.current++}},[classId]);
const choose=(id:number)=>{if(busy||busyRef.current)return false;if(dirty&&!window.confirm('تجاهل التعديلات غير المحفوظة؟'))return false;setClassId(id);return true};
const act=async(kind:'open'|'validate'|'publish')=>{
if(!classId||busy||busyRef.current)return;
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
if(!draft||!canManage||busy||busyRef.current)return;
const changed=lines.filter(l=>l.dirty);
if(changed.some(l=>!l.assignment_id||!Number.isFinite(l.start_time)||!Number.isFinite(l.end_time)||l.end_time<=l.start_time)){setNotice('تحقق من الإسناد وتوقيت كل حصة');return}
busyRef.current=true;setBusy(true);
try{
const r=await api.post<{draft:Draft;bulk_result:{errors:BulkError[]}}>(endpoints.admin.classTimetableDraftBulk(classId),{
draft_id:draft.draft_id,lines:changed.map(l=>({...l.line_id?{line_id:l.line_id}:{},assignment_id:l.assignment_id,weekday:l.weekday,start_time:l.start_time,end_time:l.end_time,...l.room_id?{room_id:l.room_id}:{}})),delete_line_ids:deleted
});
if(!r.success)throw new Error(r.error.message);
const problems=r.data.bulk_result?.errors??[];
const bad=new Set(problems.filter(e=>e.index!==undefined).map(e=>e.index));
const failed=changed.filter((_,i)=>bad.has(i)).map(l=>({...l,error:problems.find(p=>p.line_id===l.line_id)?.message??'رفض الخادم هذه الحصة'}));
const ids=new Set(failed.map(l=>l.line_id).filter(Boolean));
setDraft(r.data.draft);setLines([...r.data.draft.lines.filter(l=>!ids.has(l.line_id)).map(toEdit),...failed]);
setDeleted(problems.filter(e=>e.line_id!==undefined).map(e=>e.line_id!));
setNotice(problems.length?'حفظ جزئي: راجع الحصص المرفوضة':'تم حفظ المسودة');
}catch(e){setNotice(error(e))}finally{busyRef.current=false;setBusy(false)}
};
const add=()=>{
if(!draft||!selected||!canManage||busy)return;
const s=decimal(start),e=decimal(end);
if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s){setNotice('وقت النهاية يجب أن يكون بعد البداية');return}
setLines(v=>[...v,{key:'new-'+Date.now()+'-'+v.length,assignment_id:selected,weekday:day,start_time:s,end_time:e,dirty:true}]);setNotice('حصة جديدة غير محفوظة');
};
const update=(key:string,patch:Partial<Editable>)=>setLines(v=>v.map(l=>l.key===key?{...l,...patch,dirty:true,error:undefined}:l));
const remove=(key:string)=>{
const found=lines.find(l=>l.key===key);
if(found?.line_id)setDeleted(ids=>[...ids,found.line_id!]);
setLines(v=>v.filter(l=>l.key!==key));
};
return <section className="class-bulk">
<h2>محرّر استعمال الزمان حسب القسم</h2>
<p>اختر القسم ثم المادة والأستاذ من الإسنادات الموجودة؛ الحفظ في مسودة مستقلة لكل قسم.</p>
<div className="class-bulk__filters">
<label>السلك<select value={cycle} onChange={e=>{if(!choose(0))return;setCycle(e.target.value);setLevel('');setTrack('')}}><option value="">جميع الأسلاك</option>{cycles.map(v=><option key={v}>{v}</option>)}</select></label>
<label>المستوى<select value={level} onChange={e=>{if(!choose(0))return;setLevel(e.target.value);setTrack('')}}><option value="">جميع المستويات</option>{levels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
<label>المسلك<select value={track} onChange={e=>{if(!choose(0))return;setTrack(e.target.value)}}><option value="">جميع المسالك</option>{tracks.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
<label>القسم<select value={classId} onChange={e=>{choose(Number(e.target.value))}}><option value={0}>اختر القسم</option>{options.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
</div>
{notice&&<p role="status" className="class-bulk__notice">{notice}</p>}
{busy&&<p>جارٍ تنفيذ العملية...</p>}
{classId&&!draft&&!busy&&<button disabled={!canManage} onClick={()=>void act('open')}>فتح مسودة القسم</button>}
{draft&&<><p>الحالة: {draft.state} · تعارضات: {draft.conflict_count}{dirty?' · تعديلات غير محفوظة':''}</p>
<div className="class-bulk__form">
<label>المادة والأستاذ<select value={selected} onChange={e=>setSelected(Number(e.target.value))}><option value={0}>اختر الإسناد</option>{assignments.map(a=><option key={a.assignment_id} value={a.assignment_id}>{a.subject_name} — {a.teacher_name}</option>)}</select></label>
<label>اليوم<select value={day} onChange={e=>setDay(e.target.value)}>{DAYS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
<label>البداية<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label>
<label>النهاية<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label>
<button disabled={busy||!canManage||!selected} onClick={add}>إضافة حصة</button>
</div>
<div className="class-bulk__days">
{DAYS.map(([v,name])=><div key={v} className="class-bulk__day"><h3>{name}</h3>
{lines.filter(l=>l.weekday===v).sort((a,b)=>a.start_time-b.start_time).map(l=><div key={l.key} className="class-bulk__line">
<select disabled={busy||!canManage} value={l.assignment_id} onChange={e=>update(l.key,{assignment_id:Number(e.target.value)})}>{assignments.map(a=><option key={a.assignment_id} value={a.assignment_id}>{a.subject_name} — {a.teacher_name}</option>)}</select>
<input aria-label="بداية الحصة" type="time" value={clock(l.start_time)} disabled={busy||!canManage} onChange={e=>update(l.key,{start_time:decimal(e.target.value)})}/>
<input aria-label="نهاية الحصة" type="time" value={clock(l.end_time)} disabled={busy||!canManage} onChange={e=>update(l.key,{end_time:decimal(e.target.value)})}/>
<button disabled={busy||!canManage} onClick={()=>remove(l.key)}>حذف</button>
{l.dirty&&<small>غير محفوظ</small>}{l.error&&<small role="alert">{l.error}</small>}
{l.conflict_messages?.map((m,i)=><small role="alert" key={i}>{m}</small>)}
</div>)}</div>)}
</div>
<div className="class-bulk__actions"><button disabled={busy||!canManage||!dirty} onClick={()=>void save()}>حفظ المسودة</button><button disabled={busy||!canManage||dirty} onClick={()=>void act('validate')}>التحقق</button><button disabled={busy||dirty||!canPublish||!draft.can_publish} onClick={()=>void act('publish')}>نشر هذا القسم</button></div>
</>}
</section>;
}
