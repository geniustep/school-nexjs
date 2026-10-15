import {describe,expect,it} from 'vitest';
import {errorForTimetableLine,failedTimetableDeletionIds,rejectedTimetableIndexes,timetableBulkSaveNotice,validTimetableLineIds} from './bulk-save-result';

describe('class timetable draft bulk save errors',()=>{
  it('never sends null, undefined or invalid deletion IDs',()=>{
    expect(validTimetableLineIds([null,undefined,0,-3,12,12,22,NaN])).toEqual([12,22]);
  });
  it('uses index to assign validation messages for new lines sharing null line_id',()=>{
    const errors=[
      {index:0,line_id:null,message:'الاثنين مغلق'},
      {index:1,line_id:null,message:'خارج الدوام'},
    ];
    expect(errorForTimetableLine(errors,0)?.message).toBe('الاثنين مغلق');
    expect(errorForTimetableLine(errors,1)?.message).toBe('خارج الدوام');
    expect(rejectedTimetableIndexes(errors)).toEqual(new Set([0,1]));
    expect(failedTimetableDeletionIds(errors)).toEqual([]);
  });
  it('retains only valid IDs of rejected deletions',()=>{
    expect(failedTimetableDeletionIds([
      {line_id:null,code:'invalid_line_id',message:'bad'},
      {line_id:8,message:'cannot delete'},
      {index:0,line_id:9,message:'line rejected'},
    ])).toEqual([8]);
  });
  it('does not signal success for a 200 response with zero saved lines',()=>{
    expect(timetableBulkSaveNotice([{index:0,message:'لا يمكن حفظ الحصة: اليوم مغلق.'}],0)).toContain('لم تُحفظ');
    expect(timetableBulkSaveNotice([{index:0,message:'لا يمكن حفظ الحصة: اليوم مغلق.'}],1)).toContain('حُفظت بعض');
    expect(timetableBulkSaveNotice([],4)).toBe('تم حفظ المسودة');
  });
});
