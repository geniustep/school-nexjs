import {describe,expect,it} from 'vitest';
import {DEFAULT_DAY_MODES,inferredBreaks,toMinutes,type ScheduleInterval} from './timetable-setup-utils';

const lesson=(start:string,end:string,session_half:'morning'|'afternoon'='morning'):ScheduleInterval=>({
  name:'',start_time:start,end_time:end,session_half,sequence:10
});
describe('timetable setup smart defaults',()=>{
  it('defaults weekdays while leaving hours unspecified',()=>{
    expect(DEFAULT_DAY_MODES).toEqual(['full','full','full','full','morning_only','closed','closed']);
  });
  it('derives a 30-minute gap after first lesson',()=>{
    expect(inferredBreaks([lesson('08:00','09:00'),lesson('09:30','10:30')],[])).toEqual([
      expect.objectContaining({start_time:'09:00',end_time:'09:30',name:'استراحة 1'})
    ]);
  });
  it('does not infer a break between consecutive or overlapping lessons',()=>{
    expect(inferredBreaks([lesson('08:00','09:00'),lesson('09:00','10:00')],[])).toEqual([]);
    expect(inferredBreaks([lesson('08:00','09:30'),lesson('09:00','10:00')],[])).toEqual([]);
  });
  it('avoids repeating an already recorded break',()=>{
    expect(inferredBreaks([lesson('08:00','09:00'),lesson('09:30','10:30')],[{name:'فسحة',start_time:'09:00',end_time:'09:30',sequence:10}])).toEqual([]);
  });
  it('identifies the lunch interval between morning and afternoon',()=>{
    expect(inferredBreaks([lesson('11:00','12:00'),lesson('14:00','15:00','afternoon')],[])[0]).toMatchObject({name:'استراحة الغداء',start_time:'12:00',end_time:'14:00'});
  });
  it('accepts HH:MM and Odoo decimal hours',()=>{
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes(9.5)).toBe(570);
    expect(Number.isNaN(toMinutes('not-a-time'))).toBe(true);
  });
});
