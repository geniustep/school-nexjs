'use client';

import { useEffect, useMemo, useState } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { useSession } from '@/features/auth/session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { hasPermission } from '@/lib/permissions/permissions';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';
import type { WorkingWeek, WorkingWeekDay, WorkingWeekDayMode } from '@/types/working-week';
import styles from './working-week.module.css';

const ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
const COPY = {
 ar: {
  eyebrow:'التنظيم الدراسي', title:'أيام الدراسة الأسبوعية',
  intro:'حدد أيام وفترات الدراسة لهذه السنة. يعتمد عليها استعمال الزمن والتقويم الدراسي في احتساب أيام الدراسة.',
  year:'السنة الدراسية', choose:'اختر السنة الدراسية', loading:'جارٍ التحميل…',
  unconfigured:'لم يتم إعداد أسبوع الدراسة لهذه السنة بعد.', configured:'إعداد الأسبوع محفوظ لهذه السنة.',
  reliable:'جاهز للاحتساب', notReliable:'غير جاهز للاحتساب',
  save:'حفظ أسبوع الدراسة', saving:'جارٍ الحفظ…', saved:'تم حفظ أسبوع الدراسة.',
  loadError:'تعذر تحميل إعداد أسبوع الدراسة.', saveError:'تعذر حفظ أسبوع الدراسة.',
  readOnly:'يمكنك الاطلاع على الإعداد، لكن صلاحية إدارة استعمال الزمن مطلوبة للتعديل.',
  noYear:'لا توجد سنة دراسية متاحة.', unsaved:'لديك تعديلات غير محفوظة.',
  full:'يوم دراسي كامل', morning_only:'الفترة الصباحية', afternoon_only:'الفترة المسائية', closed:'لا دراسة',
  monday:'الاثنين',tuesday:'الثلاثاء',wednesday:'الأربعاء',thursday:'الخميس',friday:'الجمعة',saturday:'السبت',sunday:'الأحد',
 },
 fr: {
  eyebrow:'Organisation académique', title:'Semaine scolaire',
  intro:"Définissez les jours et périodes d'étude pour cette année. Ce réglage alimente l'emploi du temps et le calendrier académique.",
  year:'Année scolaire', choose:"Choisir l’année scolaire", loading:'Chargement…',
  unconfigured:"La semaine scolaire n’est pas encore configurée pour cette année.", configured:'La semaine scolaire est enregistrée pour cette année.',
  reliable:'Prêt pour le calcul', notReliable:'Non prêt pour le calcul',
  save:'Enregistrer la semaine', saving:'Enregistrement…', saved:'Semaine scolaire enregistrée.',
  loadError:'Impossible de charger la semaine scolaire.', saveError:"Impossible d’enregistrer la semaine scolaire.",
  readOnly:"Vous pouvez consulter ce réglage, mais la permission de gérer l’emploi du temps est requise pour le modifier.",
  noYear:'Aucune année scolaire disponible.', unsaved:'Modifications non enregistrées.',
  full:'Journée complète', morning_only:'Matin uniquement', afternoon_only:'Après-midi uniquement', closed:'Pas de cours',
  monday:'Lundi',tuesday:'Mardi',wednesday:'Mercredi',thursday:'Jeudi',friday:'Vendredi',saturday:'Samedi',sunday:'Dimanche',
 }
} as const;

function blankDays(): WorkingWeekDay[] {
 return ORDER.map((day_of_week, sequence) => ({
   day_of_week, day_mode:'closed', is_study_day:false, sequence:sequence + 1,
   record_id:null, configured:false,
 }));
}
function modeStudy(mode: WorkingWeekDayMode){ return mode !== 'closed'; }

function WorkingWeekEditor(){
 const { locale } = useLocale();
 const copy = locale === 'fr' ? COPY.fr : COPY.ar;
 const user = useSession();
 const canManage = hasPermission(user,'manage_timetable');
 const [years,setYears]=useState<AcademicContextOptionsResponse['academic_years']>([]);
 const [yearId,setYearId]=useState('');
 const [week,setWeek]=useState<WorkingWeek|null>(null);
 const [draft,setDraft]=useState<WorkingWeekDay[]>(blankDays);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 useEffect(()=>{ let active=true; setLoading(true);
  void api.get<AcademicContextOptionsResponse>(endpoints.admin.academicContextOptions,{scope:'timetable'})
   .then((res)=>{ if(!active)return; if(!res.success){setError(copy.loadError);return;}
    const next=res.data.academic_years ?? []; setYears(next);
    const selected=res.data.selected_context?.academic_year_id;
    const initial=selected && next.some(y=>y.id===selected) ? String(selected) : '';
    setYearId(initial);
   }).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[copy.loadError]);

 useEffect(()=>{ if(!yearId){setWeek(null);setDraft(blankDays());return}
  let active=true; setLoading(true);setError('');setNotice('');
  void api.get<WorkingWeek>(endpoints.admin.timetableWorkingWeek,{academic_year_id:Number(yearId)})
   .then((res)=>{if(!active)return;if(!res.success){setError(copy.loadError);return}
    setWeek(res.data); setDraft(ORDER.map((key,i)=>res.data.days.find(d=>d.day_of_week===key) ?? blankDays()[i]));
   }).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[yearId,copy.loadError]);

 const dirty=useMemo(()=>week ? JSON.stringify(draft.map(d=>[d.day_of_week,d.day_mode])) !== JSON.stringify(week.days.map(d=>[d.day_of_week,d.day_mode])) : false,[draft,week]);
 function setMode(day:string,mode:WorkingWeekDayMode){setNotice('');setDraft(cur=>cur.map(d=>d.day_of_week===day?{...d,day_mode:mode,is_study_day:modeStudy(mode)}:d))}
 async function save(){
  if(!canManage||!yearId||!dirty||saving)return; setSaving(true);setError('');setNotice('');
  const payload={academic_year_id:Number(yearId),days:draft.map((d,i)=>({day_of_week:d.day_of_week,day_mode:d.day_mode,is_study_day:modeStudy(d.day_mode),sequence:i+1}))};
  const res=await api.put<WorkingWeek>(endpoints.admin.timetableWorkingWeek,payload);
  if(res.success){setWeek(res.data);setDraft(res.data.days);setNotice(copy.saved)}else setError(copy.saveError);
  setSaving(false);
 }
 return <div className={styles.page}>
  <header className={styles.hero}><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>
  <section className={styles.context}>
   <label htmlFor="working-week-year">{copy.year}</label>
   <select id="working-week-year" value={yearId} onChange={e=>setYearId(e.target.value)} disabled={loading}>
    <option value="">{copy.choose}</option>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}
   </select>
   {!loading && years.length===0?<p>{copy.noYear}</p>:null}
  </section>
  {loading?<div className={styles.state}>{copy.loading}</div>:null}
  {error?<div className={styles.error} role="alert">{error}</div>:null}
  {!loading&&week?<>
   <div className={styles.status}>
    <strong>{week.configured?copy.configured:copy.unconfigured}</strong>
    <span>{week.reliable?copy.reliable:copy.notReliable}</span>
   </div>
   {!canManage?<div className={styles.readonly}>{copy.readOnly}</div>:null}
   <div className={styles.days}>
    {draft.map(day=><article className={styles.day} key={day.day_of_week}>
     <div><strong>{copy[day.day_of_week as keyof typeof copy]}</strong><small>{day.day_mode==='closed'?'—':copy[day.day_mode]}</small></div>
     <select aria-label={String(copy[day.day_of_week as keyof typeof copy])} value={day.day_mode} disabled={!canManage||saving} onChange={e=>setMode(day.day_of_week,e.target.value as WorkingWeekDayMode)}>
      {(['full','morning_only','afternoon_only','closed'] as WorkingWeekDayMode[]).map(mode=><option key={mode} value={mode}>{copy[mode]}</option>)}
     </select>
    </article>)}
   </div>
   <footer className={styles.footer}><div>{dirty?<span className={styles.dirty}>{copy.unsaved}</span>:null}{notice?<span className={styles.success}>{notice}</span>:null}</div>
    {canManage?<button className="btn btn--primary" type="button" disabled={!dirty||saving} onClick={()=>void save()}>{saving?copy.saving:copy.save}</button>:null}
   </footer>
  </>:null}
 </div>
}

export default function WorkingWeekPage(){
 return <RequireAdminPermission permission="view_timetable"><WorkingWeekEditor/></RequireAdminPermission>
}
