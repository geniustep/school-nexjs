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
