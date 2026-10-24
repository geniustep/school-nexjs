/** Fail-closed read-only adapter for Odoo Finance Intelligence V4. */
export type FinanceV4Quality = 'complete' | 'partial';
export type ExecutiveFinanceIntelligenceV4 = {
 available: boolean; reason_code: string|null; metric_id: string|null; metric_version: string|null;
 metric_definition_key: string|null; data_quality: FinanceV4Quality|null; value: string|null;
 active_student_average: string|null; currency: string|null; school_id: number|null;
 academic_year_id: number|null; month_key: string|null; as_of_date: string|null;
 active_student_count: number|null; students_with_verified_monthly_value: number|null;
 students_with_verified_zero_monthly_obligation: number|null; students_monthly_coverage_unverified: number|null;
 unresolved_student_count: number|null; students_without_active_agreement: number|null;
 lifecycle_anomaly_count: number|null; mismatched_currency_students_count: number|null;
 diagnostic_summary: {reason_code:string;count:number}[];
 explanation: {reason_code:string|null;affected_case_count:number|null};
};
const ID='active_students_contracted_monthly_recurring_value';
const VERSION='finance-intelligence-v4';
const DEF='contracted_monthly_recurring_obligation_current_month';
function obj(v:unknown):Record<string,unknown>|null {
 return v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
}
function str(v:unknown):string|null {return typeof v==='string'&&v.trim()?v.trim():null}
function integer(v:unknown, positive=false):number|null {
 const n=typeof v==='number'?v:typeof v==='string'&&/^\d+$/.test(v)?Number(v):NaN;
 return Number.isSafeInteger(n)&&n>=(positive?1:0)?n:null;
}
function amount(v:unknown):string|null {
 if(typeof v!=='string'&&typeof v!=='number')return null;
 const s=String(v).trim();
 if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(s))return null;
 const n=Number(s);return Number.isFinite(n)&&n<=Number.MAX_SAFE_INTEGER?s:null;
}
function notAvailable(reason:string):ExecutiveFinanceIntelligenceV4 {
 return {available:false,reason_code:reason,metric_id:ID,metric_version:VERSION,metric_definition_key:DEF,
 data_quality:null,value:null,active_student_average:null,currency:null,school_id:null,academic_year_id:null,
 month_key:null,as_of_date:null,active_student_count:null,students_with_verified_monthly_value:null,
 students_with_verified_zero_monthly_obligation:null,students_monthly_coverage_unverified:null,
 unresolved_student_count:null,students_without_active_agreement:null,lifecycle_anomaly_count:null,
 mismatched_currency_students_count:null,diagnostic_summary:[],explanation:{reason_code:null,affected_case_count:null}};
}
export function readExecutiveFinanceIntelligenceV4(raw:unknown):ExecutiveFinanceIntelligenceV4|null {
 if(raw==null)return null; // Older runtime or backend RBAC redaction.
 const o=obj(raw);
 if(!o)return notAvailable('FINANCE_INTELLIGENCE_V4_INVALID');
 if(o.available!==true)return notAvailable(str(o.reason_code)??'FINANCE_INTELLIGENCE_V4_EMPTY');
 if(o.metric_id!==ID||o.metric_version!==VERSION||o.metric_definition_key!==DEF ||
 (o.data_quality!=='complete'&&o.data_quality!=='partial'))return notAvailable('FINANCE_INTELLIGENCE_V4_INVALID');
 const complete=o.data_quality==='complete';
 const value=complete?amount(o.value):null;
 const currency=str(o.currency);
 if(complete&&(value===null||currency===null))return notAvailable('FINANCE_INTELLIGENCE_V4_INVALID');
 const e=obj(o.explanation);
 const diagnostics=Array.isArray(o.diagnostic_summary)?o.diagnostic_summary.flatMap((item:unknown)=>{
  const d=obj(item);const code=str(d?.reason_code);const count=integer(d?.count);
  return code&&/^[A-Za-z0-9_]+$/.test(code)&&count!==null?[{reason_code:code,count}]:[];
 }):[];
 return {
 available:true,reason_code:null,metric_id:ID,metric_version:VERSION,metric_definition_key:DEF,
 data_quality:o.data_quality,value,active_student_average:complete?amount(o.active_student_average):null,
 currency,school_id:integer(o.school_id,true),academic_year_id:integer(o.academic_year_id,true),
 month_key:str(o.month_key),as_of_date:str(o.as_of_date),active_student_count:integer(o.active_student_count),
 students_with_verified_monthly_value:integer(o.students_with_verified_monthly_value),
 students_with_verified_zero_monthly_obligation:integer(o.students_with_verified_zero_monthly_obligation),
 students_monthly_coverage_unverified:integer(o.students_monthly_coverage_unverified),
 unresolved_student_count:integer(o.unresolved_student_count),
 students_without_active_agreement:integer(o.students_without_active_agreement),
 lifecycle_anomaly_count:integer(o.lifecycle_anomaly_count),
 mismatched_currency_students_count:integer(o.mismatched_currency_students_count),
 diagnostic_summary:diagnostics,
 explanation:{reason_code:str(e?.reason_code),affected_case_count:integer(e?.affected_case_count)},
 };
}
/** Do not show stale measurements from another school or academic year. */
export function isFinanceV4CurrentContext(d:ExecutiveFinanceIntelligenceV4,schoolId:number|string|null|undefined,yearId:number|null|undefined):boolean {
 if(!d.available)return true;
 if(schoolId!=null&&(d.school_id===null||d.school_id!==Number(schoolId)))return false;
 if(yearId!=null&&(d.academic_year_id===null||d.academic_year_id!==yearId))return false;
 return true;
}
