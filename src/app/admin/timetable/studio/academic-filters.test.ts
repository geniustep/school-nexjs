import {describe,it,expect} from 'vitest';
import {buildStudioCatalog,studioLevelsForCycle,studioClassesForLevel,studioClassSelection} from './academic-filters';
import type {SchoolClass,Level} from '@/types/class';
const classes=[
 {id:4,name:'1APG-1',level:{id:10,name:'الأولى ابتدائي'}},
 {id:5,name:'1APG-2',level:{id:10,name:'الأولى ابتدائي'}},
 {id:6,name:'2APG-1',level:{id:11,name:'الثانية ابتدائي'}},
 {id:9,name:'1AC-1',level:{id:20,name:'الأولى إعدادي'}}
] as SchoolClass[];
const levels=[
 {id:10,name:'الأولى ابتدائي',cycle:{id:1,name:'التعليم الابتدائي',code:'P'}},
 {id:11,name:'الثانية ابتدائي',cycle:{id:1,name:'التعليم الابتدائي',code:'P'}},
 {id:20,name:'الأولى إعدادي',cycle:{id:2,name:'التعليم الإعدادي',code:'C'}}
] as Level[];
describe('studio cascading academic filters',()=>{
 it('derives cycles from reference levels when class cycle is abbreviated',()=>{
  const catalog=buildStudioCatalog(classes,levels);
  expect(catalog.cycles).toContain('التعليم الابتدائي');
  expect(catalog.cycles).toContain('التعليم الإعدادي');
  expect(studioLevelsForCycle(catalog,'التعليم الابتدائي').map(l=>l.id).sort()).toEqual([10,11]);
 });
 it('shows only classes for selected level',()=>{expect(studioClassesForLevel(classes,10).map(c=>c.id)).toEqual([4,5]);});
 it('resets class when level or cycle no longer matches',()=>{
  const catalog=buildStudioCatalog(classes,levels);
  expect(studioClassSelection(classes,'التعليم الابتدائي',10,4,catalog)).toBe(4);
  expect(studioClassSelection(classes,'التعليم الإعدادي',10,4,catalog)).toBe(0);
  expect(studioClassSelection(classes,'التعليم الابتدائي',11,4,catalog)).toBe(0);
 });
 it('never offers class choices before choosing level',()=>{expect(studioClassesForLevel(classes,0)).toEqual([]);});
 it('preserves partial catalogs when one class level lacks full metadata',()=>{
  const catalog=buildStudioCatalog([{id:1,name:'X',level:{id:7,name:'مستوى تجريبي'}}] as SchoolClass[],[]);
  expect(catalog.cycles).toEqual(['سلك غير محدد']);
 });
});