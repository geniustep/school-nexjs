import { describe, expect, it } from 'vitest';
import {
  canShowObligationTotal, makeObligationsQuery, parseContractualObligations,
  selectionMatches,
} from './contractual-services-analytics-contract';

const school=42,year=2026;
const service={service_id:101,service_code:'TUITION',service_name:'Tuition',selected:true,
  total:'1200.00',scheduled_year_total:'12000.00',beneficiary_count:1,
  average_per_beneficiary:'1200.00',average_per_beneficiary_across_year:'12000.00',
  data_quality:'complete'};
function payload(scope='current_verified_month', overrides:Record<string,unknown>={}) {
 const yearScope=scope==='school_year'||scope==='school_year_to_date';
 return {status:'ok',contract:'contractual_services_analytics_v1',school_id:school,academic_year_id:year,currency:'MAD',
  analytics:{period_scope:scope,period_key:'2026-11',basis:yearScope?'current_schedule':scope==='selected_month'?'current_schedule':null,
   historical_snapshot:false,selection_mode:'all_services_default',verification_status:'approved',
   total:yearScope?'12000.00':'1200.00',average_per_active_student:yearScope?'12000.00':'1200.00',
   services:[service],active_student_count:1,services_total_reconciles_with_analytics_total:true,
   monthly_distribution:yearScope?[{period_key:'2026-11',total:'12000.00'}]:[],
   monthly_distribution_reconciles_with_total:true,finance_v4_full_selection_match:true,
   ...overrides}};
}
describe('finance contractual analytics Odoo contract',()=>{
 it('accepts current month and V4 parity',()=>{
  const d=parseContractualObligations(payload(),school,year,'current_verified_month');
  expect(canShowObligationTotal(d,null)).toBe(true);
  expect(d?.services[0].total).toBe('1200.00');
 });
 it('uses canonical annual service amount and average',()=>{
  const d=parseContractualObligations(payload('school_year'),school,year,'school_year');
  expect(d?.services[0].total).toBe('12000.00');
  expect(d?.services[0].average_per_beneficiary).toBe('12000.00');
  expect(canShowObligationTotal(d,null)).toBe(true);
 });
 it('rejects mismatched school/year',()=>{
  expect(parseContractualObligations(payload(),43,year,'current_verified_month')).toBeNull();
  expect(parseContractualObligations(payload(),school,2027,'current_verified_month')).toBeNull();
 });
 it('fails closed on partial data and reconciliation mismatch',()=>{
  const d=parseContractualObligations(payload('school_year',{verification_status:'not_approved',total:null}),school,year,'school_year');
  expect(canShowObligationTotal(d,null)).toBe(false);
  expect(canShowObligationTotal(parseContractualObligations(payload('school_year',{monthly_distribution_reconciles_with_total:false}),school,year,'school_year'),null)).toBe(false);
 });
 it('preserves an explicit empty service selection as a verified zero',()=>{
  const d=parseContractualObligations(payload('current_verified_month',{
   selection_mode:'no_services_selected',total:'0.00',services:[{...service,selected:false,total:'0.00'}],
  }),school,year,'current_verified_month');
  expect(canShowObligationTotal(d,[])).toBe(true);
  expect(selectionMatches(d!.services,[])).toBe(true);
  expect(makeObligationsQuery(year,'current_verified_month','2026-11',[]).selected_service_ids).toBe('');
 });
 it('rejects invalid financial values',()=>{
  expect(parseContractualObligations(payload('school_year',{services:[{...service,scheduled_year_total:'bogus'}]}),school,year,'school_year')).toBeNull();
 });
 it('requires current schedule for noncurrent scopes',()=>{
  expect(parseContractualObligations(payload('school_year',{historical_snapshot:true}),school,year,'school_year')).toBeNull();
 });
 it('validates selected month before displaying stale data',()=>{
  expect(parseContractualObligations(payload('selected_month'),school,year,'selected_month','2026-10')).toBeNull();
  expect(parseContractualObligations(payload('selected_month'),school,year,'selected_month','2026-11')).not.toBeNull();
 });
});
