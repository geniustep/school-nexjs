'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ExecutiveFinanceIntelligenceV4 } from '@/lib/admin/executive-finance-v4-contract';
import {
  canShowObligationTotal, makeObligationsQuery, parseContractualObligations,
  selectionMatches, validPeriodKey, type ObligationScope, type ServiceSelection,
} from '@/lib/admin/contractual-services-analytics-contract';
import styles from './contractual-analytics.module.css';

type Language = 'ar' | 'fr' | 'en' | 'es';
const labels = {
 ar: { title:'الواجبات الشهرية المقررة', detail:'التحليل التفصيلي', description:'التزامات مالية وفق الاتفاقات الحالية، وليست مبالغ محصلة.',
  total:'إجمالي الخدمات المختارة', average:'المتوسط لكل تلميذ نشط', perBeneficiary:'متوسط المستفيد', services:'الخدمات المحتسبة',
  beneficiaries:'مستفيد', current:'الشهر الحالي', month:'شهر محدد', ytd:'السنة حتى اليوم', year:'السنة الدراسية كاملة',
  chooseMonth:'الشهر', all:'اختيار الجميع', none:'إلغاء الجميع', empty:'لم تختر أي خدمة.', missing:'اختر مدرسة وسنة دراسية.',
  loading:'جارٍ تحميل الواجبات…', partial:'لا يمكن اعتماد المجموع لأن بيانات الفوترة غير مكتملة.',
  unavailable:'تفاصيل الواجبات غير متاحة حاليًا.', stale:'تعذر التحقق من سياق البيانات المالية.', retry:'إعادة المحاولة',
  future:'تشمل السنة فترات مستقبلية مجدولة، ولا تمثل تحصيلات متوقعة مؤكدة.',
  schedule:'تستعمل هذه الفترة الجدولة الحالية، وليست سجلًا تاريخيًا معتمدًا.', months:'التوزيع الشهري', fallback:'يعرض المجموع الحالي الموثق فقط؛ تفصيل الخدمات غير متاح.',
  clearHelp:'صفر ناتج عن إلغاء اختيار الخدمات، وليس مجموع واجبات المدرسة.',
 },
 fr: { title:'Frais mensuels prévus',detail:'Analyse détaillée',description:'Montants des accords, et non encaissements.',
  total:'Total des services choisis',average:'Moyenne par élève actif',perBeneficiary:'Moyenne par bénéficiaire',services:'Services inclus',
  beneficiaries:'bénéficiaires',current:'Mois actuel',month:'Mois choisi',ytd:'Année à ce jour',year:'Année scolaire complète',
  chooseMonth:'Mois',all:'Tout sélectionner',none:'Tout retirer',empty:'Aucun service choisi.',missing:'Choisissez école et année.',
  loading:'Chargement…',partial:'Total non vérifié : données de facturation incomplètes.',unavailable:'Détails indisponibles.',
  stale:'Contexte de données invalide.',retry:'Réessayer',future:'Inclut des périodes futures programmées, pas des encaissements garantis.',
  schedule:'Basé sur le calendrier actuel et non sur des archives certifiées.',months:'Répartition mensuelle',
  fallback:'Seul le total vérifié est affiché.',clearHelp:'Zéro provient du filtre vide, pas des frais de l’école.',
 },
 en: { title:'Scheduled monthly fees',detail:'Detailed analysis',description:'Contracted fees, not collections.',
  total:'Selected services total',average:'Average per active pupil',perBeneficiary:'Average per beneficiary',services:'Included services',
  beneficiaries:'beneficiaries',current:'Current month',month:'Selected month',ytd:'Year to date',year:'Full school year',
  chooseMonth:'Month',all:'Select all',none:'Clear all',empty:'No service selected.',missing:'Select a school and academic year.',
  loading:'Loading…',partial:'Total not approved: incomplete billing data.',unavailable:'Details unavailable.',
  stale:'Financial data context invalid.',retry:'Retry',future:'Includes scheduled future periods, not guaranteed collections.',
  schedule:'Based on the current schedule, not an audited historical snapshot.',months:'Monthly breakdown',
  fallback:'Showing only the verified overall total.',clearHelp:'Zero is due to an empty filter, not zero school obligations.',
 },
 es: { title:'Cuotas mensuales previstas',detail:'Análisis detallado',description:'Cuotas pactadas, no recaudaciones.',
  total:'Total seleccionado',average:'Media por alumno activo',perBeneficiary:'Media por beneficiario',services:'Servicios incluidos',
  beneficiaries:'beneficiarios',current:'Mes actual',month:'Mes elegido',ytd:'Año hasta hoy',year:'Curso completo',
  chooseMonth:'Mes',all:'Seleccionar todo',none:'Quitar todo',empty:'Sin servicios seleccionados.',missing:'Elija centro y curso.',
  loading:'Cargando…',partial:'Total no aprobado: datos incompletos.',unavailable:'Detalles no disponibles.',
  stale:'Contexto financiero no válido.',retry:'Reintentar',future:'Incluye períodos futuros, no cobros confirmados.',
  schedule:'Basado en el calendario actual, no historial certificado.',months:'Desglose mensual',
  fallback:'Solo se muestra el total verificado.',clearHelp:'El cero refleja el filtro vacío, no todas las cuotas.',
 },
} satisfies Record<Language, Record<string,string>>;
const periods: ObligationScope[] = ['current_verified_month','selected_month','school_year_to_date','school_year'];
function money(value: string | null, currency: string, language: Language) {
 if (value === null) return '—';
 const locale = ({ar:'ar-MA',fr:'fr-MA',en:'en-US',es:'es-ES'} as const)[language];
 return new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)) + ' ' + currency;
}
function monthName(value: string, language: Language) {
 if (!validPeriodKey(value)) return value;
 return new Intl.DateTimeFormat(({ar:'ar-MA',fr:'fr-MA',en:'en-US',es:'es-ES'} as const)[language],
  {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z'));
}
export function ContractualAnalyticsView({
 mode = 'page', financeV4 = null,
}: {mode?: 'page' | 'dashboard'; financeV4?: ExecutiveFinanceIntelligenceV4 | null}) {
 const localeState = useLocale();
 const language = (localeState.locale in labels ? localeState.locale : 'ar') as Language;
 const t = labels[language];
 const {activeSchoolId,activeAcademicYearId,switching,academicYearLoading}=useAdminSession();
 const [periodScope,setPeriodScope]=useState<ObligationScope>('current_verified_month');
 const [month,setMonth]=useState(()=>{
   const now=new Date();
   return String(now.getFullYear())+'-'+String(now.getMonth()+1).padStart(2,'0');
 });
 const [selected,setSelected]=useState<ServiceSelection>(null);
 const scope:ObligationScope=mode==='dashboard'?'current_verified_month':periodScope;
 const context=[activeSchoolId,activeAcademicYearId,scope].join(':');
 const [selectionContext,setSelectionContext]=useState(context);
 const actualSelection=selectionContext===context?selected:null;
 useEffect(()=>{setSelected(null);setSelectionContext(context);},[context]);
 const query=useMemo(()=>activeAcademicYearId!==null?
  makeObligationsQuery(activeAcademicYearId,scope,month,actualSelection):undefined,
  [activeAcademicYearId,scope,month,actualSelection]);
 const path=activeSchoolId!==null && activeAcademicYearId!==null && !switching && !academicYearLoading &&
   (scope!=='selected_month'||validPeriodKey(month)) ? endpoints.admin.financeContractualServicesAnalytics : null;
 const resource=useAdminResource<unknown>(path,query,{keepPreviousData:false});
 const dataCandidate=useMemo(()=>parseContractualObligations(
  resource.data,activeSchoolId,activeAcademicYearId,scope,scope==='selected_month'?month:undefined),
  [resource.data,activeSchoolId,activeAcademicYearId,scope,month]);
 const data=dataCandidate && selectionMatches(dataCandidate.services,actualSelection)?dataCandidate:null;
 const verified=canShowObligationTotal(data,actualSelection);
 const pending=resource.loading||switching||academicYearLoading;
 const fallbackCode=resource.error?.details?.status;
 const fallback=mode==='dashboard'&&!pending&&(fallbackCode===404||fallbackCode===503)&&
  actualSelection===null && financeV4?.available===true && financeV4.data_quality==='complete' &&
  financeV4.school_id===activeSchoolId&&financeV4.academic_year_id===activeAcademicYearId&&
  financeV4.value!==null&&financeV4.currency!==null;
 const changeService=(sid:number)=>{
  if(!data)return;
  const before=actualSelection===null?data.services.filter(s=>s.selected).map(s=>s.service_id):actualSelection;
  setSelected(before.includes(sid)?before.filter(x=>x!==sid):[...before,sid]);
  setSelectionContext(context);
 };
 return <section className={styles.panel} aria-busy={pending} aria-label={t.title}>
  <header className={styles.header}>
   <div><h2>{t.title}</h2><p>{t.description}</p></div>
   {mode==='dashboard'?<Link href="/admin/finance/obligations-analytics" className={styles.link}>{t.detail}</Link>:null}
  </header>
  {mode==='page'?<nav className={styles.periods} aria-label={t.detail}>
   {periods.map(p=><button key={p} type="button" aria-pressed={scope===p}
    className={scope===p?styles.active:styles.period} onClick={()=>setPeriodScope(p)}>
    {{current_verified_month:t.current,selected_month:t.month,school_year_to_date:t.ytd,school_year:t.year}[p]}
   </button>)}
   {scope==='selected_month'?<label className={styles.monthInput}>{t.chooseMonth}
    <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>:null}
  </nav>:null}
  {activeSchoolId===null||activeAcademicYearId===null?<p role="status">{t.missing}</p>:null}
  {pending?<p role="status">{t.loading}</p>:null}
  {!pending&&data?<>
   {actualSelection!==null&&actualSelection.length===0?<p className={styles.note} role="status">{t.clearHelp}</p>:null}
   <div className={styles.metrics}>
    <div><span>{t.total}</span><strong dir="auto">{verified?money(data.total,data.currency,language):'—'}</strong></div>
    <div><span>{t.average}</span><strong dir="auto">{verified?money(data.average_per_active_student,data.currency,language):'—'}</strong></div>
   </div>
   {!verified?<p className={styles.warn} role="status">{t.partial}</p>:null}
   <div className={styles.servicesHead}><h3>{t.services}</h3>
    <div><button type="button" onClick={()=>{setSelected(null);setSelectionContext(context);}}>{t.all}</button>
    <button type="button" onClick={()=>{setSelected([]);setSelectionContext(context);}}>{t.none}</button></div>
   </div>
   <div className={styles.services}>
    {data.services.map(service=><label className={styles.service} key={service.service_id}>
     <span className={styles.serviceTitle}><input type="checkbox" checked={service.selected}
       onChange={()=>changeService(service.service_id)} />
      <span><strong>{service.service_name}</strong>
      <small>{service.beneficiary_count} {t.beneficiaries}</small></span></span>
     <span className={styles.serviceMoney}><strong dir="auto">{verified?money(service.total,data.currency,language):'—'}</strong>
     {mode==='page'?<small>{t.perBeneficiary}: {verified?money(service.average_per_beneficiary,data.currency,language):'—'}</small>:null}</span>
    </label>)}
   </div>
   {scope!=='current_verified_month'?<p className={styles.note}>{t.schedule}</p>:null}
   {scope==='school_year'&&data.includes_future_scheduled_periods?<p className={styles.warn}>{t.future}</p>:null}
   {mode==='page'&&(scope==='school_year'||scope==='school_year_to_date')&&verified?
    <div className={styles.breakdown}><h3>{t.months}</h3>
    {data.monthly_distribution.map(item=><div key={item.period_key}>
      <span>{monthName(item.period_key,language)}</span>
      <strong dir="auto">{money(item.total,data.currency,language)}</strong>
    </div>)}</div>:null}
  </>:null}
  {!pending&&!data&&fallback?<div className={styles.metrics}>
   <div><span>{t.total}</span><strong dir="auto">{money(financeV4!.value,financeV4!.currency!,language)}</strong></div>
   <div><span>{t.average}</span><strong dir="auto">{money(financeV4!.active_student_average,financeV4!.currency!,language)}</strong></div>
   <p role="status">{t.fallback}</p>
  </div>:null}
  {!pending&&!data&&!fallback&&activeSchoolId!==null&&activeAcademicYearId!==null?
   <div className={styles.warn} role="status"><p>{resource.error?t.unavailable:resource.data!==null?t.stale:t.unavailable}</p>
     <button type="button" onClick={resource.reload}>{t.retry}</button></div>:null}
 </section>;
}
