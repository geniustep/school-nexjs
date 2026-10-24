// @vitest-environment happy-dom
import {afterEach,describe,it,expect} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {readExecutiveFinanceIntelligenceV4} from '@/lib/admin/executive-finance-v4-contract';
import {ExecutiveFinanceIntelligenceV4Panel} from './executive-finance-intelligence-v4-panel';
afterEach(cleanup);
const raw={available:true,metric_id:'active_students_contracted_monthly_recurring_value',metric_version:'finance-intelligence-v4',metric_definition_key:'contracted_monthly_recurring_obligation_current_month',data_quality:'partial',value:'500',currency:'MAD',active_student_count:6,explanation:{reason_code:'PARTIAL',affected_case_count:2}};
describe('V4 panel',()=>{
 it('hides unverified amount on partial',()=>{render(<ExecutiveFinanceIntelligenceV4Panel data={readExecutiveFinanceIntelligenceV4(raw)!} locale="ar"/>);expect(screen.getByText('غير محددة بعد')).toBeTruthy();expect(screen.queryByText(/500 MAD/)).toBeNull()});
 for(const [locale,title] of [['fr','Intelligence financière'],['en','Finance intelligence'],['es','Inteligencia financiera']] as const){
  it('translates '+locale,()=>{render(<ExecutiveFinanceIntelligenceV4Panel data={readExecutiveFinanceIntelligenceV4(raw)!} locale={locale}/>);expect(screen.getByRole('region',{name:title})).toBeTruthy()});
 }
 it('renders verified zero distinctly',()=>{render(<ExecutiveFinanceIntelligenceV4Panel data={readExecutiveFinanceIntelligenceV4({...raw,data_quality:'complete',value:'0.00'})!} locale="ar"/>);expect(screen.getByText(/MAD/)).toBeTruthy()});
});
