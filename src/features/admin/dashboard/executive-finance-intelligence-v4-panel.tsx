'use client';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import { localeToBcp47 } from '@/lib/i18n/config';
import type { ExecutiveFinanceIntelligenceV4 } from '@/lib/admin/executive-finance-v4-contract';
import styles from './executive-finance-intelligence-v4.module.css';

type Words={title:string,month:string,description:string,complete:string,partial:string,unavailable:string,
 unknown:string,students:string,verified:string,zero:string,coverage:string,unresolved:string,notice:string,
 review:string,reasons:Record<string,string>};
const copy:Record<Locale,Words>={
 ar:{title:'ذكاء المالية',month:'الشهر الجاري',description:'القيمة الشهرية التعاقدية للالتزامات المتكررة الموثقة للتلاميذ النشطين',
 complete:'بيانات مكتملة',partial:'بيانات جزئية',unavailable:'غير متاح',unknown:'غير محددة بعد',students:'التلاميذ النشطون',
 verified:'قيم شهرية موثقة',zero:'التزام صفري مثبت',coverage:'تغطية غير مؤكدة',unresolved:'حالات غير محسومة',
 notice:'هذا مؤشر تعاقدي، وليس تحصيلات نقدية أو إيرادات أو أرباحًا.',review:'فتح المالية',
 reasons:{COMPLETE:'جميع البيانات المطلوبة موثقة',PARTIAL:'توجد بيانات تحتاج إلى مراجعة',MONTHLY_COVERAGE_UNVERIFIED:'تغطية الشهر غير مؤكدة',
 MISSING_CURRENT_PERIOD:'فترات الشهر الجاري غير مكتملة',CONFLICT:'تعارض في بيانات الاتفاقات',OPERATIONAL_LIFECYCLE_MISMATCH:'اختلاف بين حالة التلميذ والعقد',
 FINANCE_INTELLIGENCE_V4_NOT_LOADED:'لم يُحمّل المؤشر بعد',SELECTED_YEAR_DOES_NOT_COVER_CURRENT_DATE:'السنة المختارة لا تشمل الشهر الجاري',
 FINANCE_INTELLIGENCE_V4_INVALID:'بيانات غير صالحة',FINANCE_INTELLIGENCE_V4_EMPTY:'لا توجد بيانات موثوقة',
 monthly_coverage_unverified:'تغطية شهرية غير مؤكدة',unverifiable_current_period:'الفترة الحالية غير متحققة',
 inconsistent_period_dates:'تواريخ غير متسقة',service_schedule_lifecycle_conflict:'تعارض فترة الخدمة',
 overlapping_active_service_contracts:'اتفاقات متداخلة',operational_student_lifecycle_mismatch:'حالة تشغيلية غير متسقة',negative_scheduled_period:'فترة غير صالحة'}},
 fr:{title:'Intelligence financière',month:'Mois en cours',description:'Valeur mensuelle contractuelle vérifiée des obligations récurrentes des élèves actifs',
 complete:'Données complètes',partial:'Données partielles',unavailable:'Indisponible',unknown:'Pas encore déterminée',students:'Élèves actifs',
 verified:'Valeurs mensuelles vérifiées',zero:'Obligation nulle confirmée',coverage:'Couverture non vérifiée',unresolved:'Cas non résolus',
 notice:'Indicateur contractuel, ni encaissements, ni chiffre d’affaires, ni bénéfices.',review:'Ouvrir les finances',
 reasons:{COMPLETE:'Toutes les données sont vérifiées',PARTIAL:'Données à vérifier',MONTHLY_COVERAGE_UNVERIFIED:'Couverture mensuelle non vérifiée',
 MISSING_CURRENT_PERIOD:'Périodes du mois incomplètes',CONFLICT:'Contradiction contractuelle',OPERATIONAL_LIFECYCLE_MISMATCH:'Écart de statut',
 FINANCE_INTELLIGENCE_V4_NOT_LOADED:'Indicateur non chargé',SELECTED_YEAR_DOES_NOT_COVER_CURRENT_DATE:'Année hors période actuelle',
 FINANCE_INTELLIGENCE_V4_INVALID:'Données non valides',FINANCE_INTELLIGENCE_V4_EMPTY:'Données non disponibles',
 monthly_coverage_unverified:'Couverture non vérifiée',unverifiable_current_period:'Période non vérifiable',
 inconsistent_period_dates:'Dates incohérentes',service_schedule_lifecycle_conflict:'Conflit de service',
 overlapping_active_service_contracts:'Contrats superposés',operational_student_lifecycle_mismatch:'Statut incohérent',negative_scheduled_period:'Période invalide'}},
 en:{title:'Finance intelligence',month:'Current month',description:'Verified contracted monthly recurring obligations for active students',
 complete:'Complete data',partial:'Partial data',unavailable:'Unavailable',unknown:'Not yet determined',students:'Active students',
 verified:'Verified monthly values',zero:'Verified zero obligations',coverage:'Unverified coverage',unresolved:'Unresolved cases',
 notice:'Contracted value, not cash collected, revenue, or profit.',review:'Open finance',
 reasons:{COMPLETE:'All data verified',PARTIAL:'Some data need review',MONTHLY_COVERAGE_UNVERIFIED:'Monthly coverage unverified',
 MISSING_CURRENT_PERIOD:'Current periods incomplete',CONFLICT:'Contract data conflict',OPERATIONAL_LIFECYCLE_MISMATCH:'Lifecycle mismatch',
 FINANCE_INTELLIGENCE_V4_NOT_LOADED:'Metric not loaded',SELECTED_YEAR_DOES_NOT_COVER_CURRENT_DATE:'Year excludes current month',
 FINANCE_INTELLIGENCE_V4_INVALID:'Invalid data',FINANCE_INTELLIGENCE_V4_EMPTY:'No verified data',
 monthly_coverage_unverified:'Unverified monthly coverage',unverifiable_current_period:'Period cannot be verified',
 inconsistent_period_dates:'Dates inconsistent',service_schedule_lifecycle_conflict:'Service conflict',
 overlapping_active_service_contracts:'Overlapping contracts',operational_student_lifecycle_mismatch:'Operational mismatch',negative_scheduled_period:'Invalid period'}},
 es:{title:'Inteligencia financiera',month:'Mes actual',description:'Valor mensual contractual verificado de obligaciones recurrentes de alumnos activos',
 complete:'Datos completos',partial:'Datos parciales',unavailable:'No disponible',unknown:'Aún sin determinar',students:'Alumnos activos',
 verified:'Valores mensuales verificados',zero:'Obligación cero verificada',coverage:'Cobertura no verificada',unresolved:'Casos sin resolver',
 notice:'Valor contractual, no cobros, ingresos ni beneficios.',review:'Abrir finanzas',
 reasons:{COMPLETE:'Todos los datos verificados',PARTIAL:'Algunos datos requieren revisión',MONTHLY_COVERAGE_UNVERIFIED:'Cobertura mensual no verificada',
 MISSING_CURRENT_PERIOD:'Períodos del mes incompletos',CONFLICT:'Conflicto contractual',OPERATIONAL_LIFECYCLE_MISMATCH:'Diferencia operativa',
 FINANCE_INTELLIGENCE_V4_NOT_LOADED:'Indicador no cargado',SELECTED_YEAR_DOES_NOT_COVER_CURRENT_DATE:'Año fuera del mes actual',
 FINANCE_INTELLIGENCE_V4_INVALID:'Datos inválidos',FINANCE_INTELLIGENCE_V4_EMPTY:'Sin datos verificados',
 monthly_coverage_unverified:'Cobertura mensual no verificada',unverifiable_current_period:'Período no verificable',
 inconsistent_period_dates:'Fechas inconsistentes',service_schedule_lifecycle_conflict:'Conflicto de servicio',
 overlapping_active_service_contracts:'Contratos solapados',operational_student_lifecycle_mismatch:'Estado incoherente',negative_scheduled_period:'Período inválido'}}};
export function ExecutiveFinanceIntelligenceV4Panel({data,locale}:{data:ExecutiveFinanceIntelligenceV4;locale:Locale}) {
 const t=copy[locale], reason=data.available?data.explanation.reason_code:data.reason_code;
 const complete=data.available&&data.data_quality==='complete'&&data.value!==null&&data.currency!==null;
 const stats=[
  [t.students,data.active_student_count],[t.verified,data.students_with_verified_monthly_value],
  [t.zero,data.students_with_verified_zero_monthly_obligation],[t.coverage,data.students_monthly_coverage_unverified],
  [t.unresolved,data.unresolved_student_count],
 ] as const;
 const explain=(code:string|null)=>code?(t.reasons[code]??t.unavailable):t.unavailable;
 return <section className={styles.panel} aria-label={t.title}>
  <header className={styles.head}><div><h3>{t.title}</h3><small>{t.month}</small></div><span role="status">{!data.available?t.unavailable:data.data_quality==='complete'?t.complete:t.partial}</span></header>
  <p>{t.description}</p>
  <strong className={styles.value} dir="auto">{complete?new Intl.NumberFormat(localeToBcp47(locale),{maximumFractionDigits:2,minimumFractionDigits:2}).format(Number(data.value))+' '+data.currency:data.available?t.unknown:t.unavailable}</strong>
  <p role="status">{explain(reason)}</p>
  {data.available&&<dl className={styles.grid}>{stats.map(([label,num])=><div key={label}><dt>{label}</dt><dd>{num===null?'—':new Intl.NumberFormat(localeToBcp47(locale)).format(num)}</dd></div>)}</dl>}
  {data.available&&data.diagnostic_summary.length>0&&<ul className={styles.diagnostics}>{data.diagnostic_summary.filter(d=>t.reasons[d.reason_code]).slice(0,4).map(d=><li key={d.reason_code}>{explain(d.reason_code)}: {d.count}</li>)}</ul>}
  <p className={styles.notice}>{t.notice}</p>
  {data.available&&<Link href="/admin/finance">{t.review}</Link>}
 </section>;
}
