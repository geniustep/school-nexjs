import { describe, expect, it } from 'vitest';
import type { SchoolClass } from '@/types/class';
import type { TimetableSlot } from '@/types/timetable';
import { academicFilterOptions, filterWorkspaceSlots, schoolDay, sortWorkspaceSlots, type WorkspaceFilters } from './timetable-workspace-filters';
const classes = [
 {id:1,name:'1AP-A',level:{id:10,name:'الأول ابتدائي',cycle:{id:100,name:'الابتدائي'}}},
 {id:2,name:'1AP-B',level:{id:10,name:'الأول ابتدائي',cycle:{id:100,name:'الابتدائي'}}},
 {id:3,name:'2AP-A',level:{id:20,name:'الثاني ابتدائي',cycle:{id:100,name:'الابتدائي'}}},
 {id:4,name:'1AC-A',level:{id:30,name:'الأول إعدادي',cycle:{id:200,name:'الإعدادي'}}},
 {id:5,name:'Unknown',level:null},
] as SchoolClass[];
const slots: TimetableSlot[] = classes.map((c,index) => ({id:c.id,class:{id:c.id,name:c.name},teacher:{id:index%2+1,name:'Teacher'},day:index%2?'tuesday':'monday',start_time:'09:00'}));
const empty: WorkspaceFilters={cycles:[],levels:[],classes:[],teachers:[],days:[]};
describe('academic facets', () => {
 it('narrows options from cycle to level to class with no guessed links',()=>{
  expect(academicFilterOptions(classes,['100'],[]).levels.map((r)=>r.id)).toEqual(['10','20']);
  expect(academicFilterOptions(classes,['100'],['10']).classes.map((r)=>r.id)).toEqual(['1','2']);
  expect(academicFilterOptions(classes,[],[]).classes).toHaveLength(5);
 });
 it('combines selections with OR inside each facet and AND across facets',()=>{
  expect(filterWorkspaceSlots(slots,classes,{...empty,classes:['1','2','4'],teachers:['1'],days:['monday','sunday']}).map((s)=>s.id)).toEqual([1]);
  expect(filterWorkspaceSlots(slots,classes,{...empty,cycles:['100','200'],levels:['10','30']}).map((s)=>s.id)).toEqual([1,2,4]);
 });
 it('keeps records with missing metadata when no academic facet is active',()=>{
  expect(filterWorkspaceSlots(slots,[],empty)).toHaveLength(5);
  expect(filterWorkspaceSlots(slots,[],{...empty,cycles:['100']})).toHaveLength(0);
 });
 it('finds classes beyond the first 50 without truncating selection',()=>{
  const many=Array.from({length:65},(_,i)=>({...classes[0],id:i+1,name:`Class ${i+1}`}));
  const rows=many.map((c)=>({...slots[0],id:c.id,class:{id:c.id,name:c.name}}));
  expect(academicFilterOptions(many,[],[]).classes).toHaveLength(65);
  expect(filterWorkspaceSlots(rows,many,{...empty,classes:['60','65']}).map((s)=>s.id)).toEqual([60,65]);
 });
 it('sorts Monday to Sunday and then time without changing source rows',()=>{
  const rows=[{...slots[0],id:1,day:'sunday'},{...slots[0],id:2,day:'monday',start_time:'10:00'},{...slots[0],id:3,day:'monday',start_time:'08:00'}];
  expect(sortWorkspaceSlots(rows).map((r)=>r.id)).toEqual([3,2,1]);
  expect(rows.map((r)=>r.id)).toEqual([1,2,3]);
 });
});
describe('school wall date',()=>{
 it('uses school timezone across UTC midnight',()=>{
  const now=new Date('2026-10-18T23:30:00Z');
  expect(schoolDay(now,'Etc/GMT-1')).toEqual({day:'monday',date:'2026-10-19'});
  expect(schoolDay(now,'America/New_York')?.day).toBe('sunday');
 });
 it('fails closed for an invalid timezone',()=>expect(schoolDay(new Date(),'bad/timezone')).toBeNull());
});

describe('missing academic labels',()=>{
 it('sorts unnamed levels and cycles and preserves their real IDs',()=>{
  const incomplete=classes.map((c)=>({...c,name:undefined,level:c.level?{...c.level,name:undefined,cycle:c.level.cycle?{...c.level.cycle,name:undefined}:undefined}:null}));
  // Deliberately model an incomplete runtime payload at the API boundary.
  const result=academicFilterOptions(incomplete as unknown as SchoolClass[],[],[]);
  expect(result.cycles.map((c)=>c.name)).toEqual(['#100','#200']);
  expect(result.levels.map((c)=>c.name)).toEqual(['#10','#20','#30']);
  expect(result.classes[0]).toEqual({id:'1',name:'#1'});
 });
});
