import {describe,expect,it} from 'vitest';
import {allowedTimetableDays,timetableSetupMessage,timetableSetupReady,type TimetableSetupContext} from './setup-context';

const ready:TimetableSetupContext={
 school_id:1,academic_year_id:1,setup_complete:true,allowed_weekdays:['monday','tuesday'],periods:[{}],
 blockers:{open_draft:[],save_line:[],publish:[]},
 completeness:{config_present:true,study_days_count:7,study_days_reliable:true,lesson_period_count:6}
};

describe('timetable setup-context gating',()=>{
 it('fails closed when context is absent',()=>{
   expect(timetableSetupReady(null)).toBe(false);
   expect(allowedTimetableDays(null)).toEqual([]);
 });
 it('blocks incomplete configuration without fallback weekdays',()=>{
   const context={...ready,setup_complete:false,allowed_weekdays:['monday']};
   expect(timetableSetupReady(context)).toBe(false);
   expect(allowedTimetableDays(context)).toEqual([]);
   expect(timetableSetupMessage(context,false)).toContain('لم يكتمل');
 });
 it('allows only weekdays explicitly returned by a complete config',()=>{
   expect(timetableSetupReady(ready)).toBe(true);
   expect(allowedTimetableDays(ready)).toEqual(['monday','tuesday']);
 });
 it('accepts backend weekday objects with key fields',()=>{
   expect(allowedTimetableDays({...ready,allowed_weekdays:[{key:'monday',label:'الاثنين',day_mode:'full'},{key:'friday',day_mode:'morning_only'}]})).toEqual(['monday','friday']);
 });
 it('treats an unavailable undeployed API as blocking',()=>{
   expect(timetableSetupMessage(null,true)).toContain('تعذّر التحقق');
 });
});
