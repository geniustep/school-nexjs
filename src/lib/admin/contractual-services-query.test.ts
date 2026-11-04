import {describe,it,expect} from 'vitest';
import {makeObligationsQuery,selectionMatches,type ObligationService} from './contractual-services-analytics-contract';
const rows:ObligationService[]=[{service_id:1,service_name:'Tuition',service_code:'T',selected:true,total:'10.00',
 beneficiary_count:1,average_per_beneficiary:'10.00',data_quality:'complete'},
 {service_id:2,service_name:'Transport',service_code:'X',selected:false,total:'0.00',
 beneficiary_count:0,average_per_beneficiary:null,data_quality:'complete'}];
describe('services query selection',()=>{
 it('omits the selector for default selection',()=>{
  expect('selected_service_ids' in makeObligationsQuery(5,'current_verified_month','2026-11',null)).toBe(false);
 });
 it('keeps empty selection and sorted selection match',()=>{
  expect(makeObligationsQuery(5,'selected_month','2026-11',[]).selected_service_ids).toBe('');
  expect(makeObligationsQuery(5,'selected_month','2026-11',[1,2]).selected_service_ids).toBe('1,2');
  expect(selectionMatches(rows,[1])).toBe(true);
  expect(selectionMatches(rows,null)).toBe(false);
 });
});
