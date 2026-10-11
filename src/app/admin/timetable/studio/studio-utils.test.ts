import {describe,it,expect} from 'vitest';
import {buildStudioGrid,buildStudioSaveChanges,selectStudioPeriod,type StudioPeriod} from './studio-utils';
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
describe('studio draft save changes',()=>{
 it('creates canonical period-bound lines without sending times',()=>{
  const grid=buildStudioGrid(periods,['monday'],[],{'monday:11':45});
  expect(buildStudioSaveChanges(grid,{'monday:11':45})).toEqual({
   lines:[{assignment_id:45,weekday:'monday',period_id:11}],delete_line_ids:[],
  });
 });
 it('updates persisted line and removes another by line id',()=>{
  const grid=buildStudioGrid(periods,['monday'],[
   {line_id:3,weekday:'monday',period_id:11,start_time:8,end_time:9,assignment_id:4},
   {line_id:7,weekday:'monday',period_id:12,start_time:14,end_time:15,assignment_id:9},
  ],{'monday:11':6,'monday:12':null});
  expect(buildStudioSaveChanges(grid,{'monday:11':6,'monday:12':null})).toEqual({
   lines:[{line_id:3,assignment_id:6,weekday:'monday',period_id:11}],
   delete_line_ids:[7],
  });
 });
 it('does not submit a duplicate unchanged assignment',()=>{
  const grid=buildStudioGrid(periods,['monday'],[
   {line_id:3,weekday:'monday',period_id:11,start_time:8,end_time:9,assignment_id:4},
  ],{'monday:11':4});
  expect(buildStudioSaveChanges(grid,{'monday:11':4})).toEqual({
   lines:[],delete_line_ids:[],
  });
 });
});
