import {describe,it,expect} from 'vitest';
import {readExecutiveFinanceIntelligenceV4 as read,isFinanceV4CurrentContext as context} from './executive-finance-v4-contract';
const raw={available:true,metric_id:'active_students_contracted_monthly_recurring_value',metric_version:'finance-intelligence-v4',metric_definition_key:'contracted_monthly_recurring_obligation_current_month',data_quality:'complete',value:'0.00',currency:'MAD',school_id:3,academic_year_id:4,active_student_average:'0',active_student_count:7};
describe('V4 financial truth and redaction',()=>{
 it('hides RBAC-null and absent metrics',()=>{expect(read(null)).toBeNull();expect(read(undefined)).toBeNull()});
 it('keeps a verified zero',()=>expect(read(raw)?.value).toBe('0.00'));
 it('hides partial data, including average',()=>{const x=read({...raw,data_quality:'partial'});expect(x?.value).toBeNull();expect(x?.active_student_average).toBeNull()});
 it('rejects missing currency or invalid data',()=>{expect(read({...raw,currency:null})?.available).toBe(false);expect(read({...raw,value:'not a number'})?.available).toBe(false)});
 it('redacts per-student diagnostic fields',()=>{const x=read({...raw,diagnostic_summary:[{reason_code:'abc',count:2,student_id:99}]});expect(JSON.stringify(x)).not.toContain('student_id');expect(x?.diagnostic_summary[0].count).toBe(2)});
 it('blocks cross-school and cross-year stale records',()=>{const x=read(raw)!;expect(context(x,3,4)).toBe(true);expect(context(x,9,4)).toBe(false);expect(context(x,3,7)).toBe(false)});
 it('keeps unavailable state',()=>expect(read({available:false,reason_code:'FINANCE_INTELLIGENCE_V4_NOT_LOADED'})?.value).toBeNull());
});
