import {describe,it,expect} from 'vitest';
import {buildStudioGrid,selectStudioPeriod,type StudioPeriod} from './studio-utils';
const periods:StudioPeriod[]=[{id:11,name:'الحصة 1',start_time:8,end_time:9,session_half:'morning',sequence:10},{id:12,name:'الحصة 2',start_time:14,end_time:15,session_half:'afternoon',sequence:20}];
describe('timetable studio grid',()=>{
 it('maps canonical period IDs to weekdays with no user-entered hours',()=>{
  const cells=buildStudioGrid(periods,['monday'],[],{'monday:11':34});
  expect(cells).toHaveLength(2);
  expect(cells[0]).toMatchObject({periodId:11,assignmentId:34,savedLine:false});
 });
 it('displays existing legacy lessons by exact canonical times',()=>{
  const cells=buildStudioGrid(periods,['monday'],[{line_id:9,weekday:'monday',assignment_id:3,start_time:8,end_time:9}],{});
  expect(cells[0]).toMatchObject({assignmentId:3,savedLine:true});
 });
 it('does not match times that depart from canonical period boundaries',()=>{
  const cells=buildStudioGrid(periods,['monday'],[{weekday:'monday',assignment_id:3,start_time:8.25,end_time:9}],{});
  expect(cells[0].assignmentId).toBeNull();
 });
 it('rejects closed day and Friday afternoon via day mode',()=>{
  expect(selectStudioPeriod(periods,12,'friday',['friday'],[{key:'friday',day_mode:'morning_only'}])).toBeNull();
  expect(selectStudioPeriod(periods,11,'friday',['friday'],[{key:'friday',day_mode:'morning_only'}])?.id).toBe(11);
  expect(selectStudioPeriod(periods,11,'sunday',[],[])).toBeNull();
 });
 it('does not match another period or unknown weekday',()=>{
  expect(selectStudioPeriod(periods,999,'monday',['monday'])).toBeNull();
 });
});