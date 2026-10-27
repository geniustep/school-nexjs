import {describe,it,expect} from 'vitest';
import {allowed,readRecords,readTotal,positive,capabilities} from './model';

describe('governed cash boxes contracts',()=>{
 it('does not infer mutation permissions from presence of the record',()=>{
  const row={id:1,name:'Cash',school_id:3,allowed_actions:['view']};
  expect(allowed(row,'accept')).toBe(false);
  expect(allowed(row,'dispatch')).toBe(false);
  expect(allowed(row,'view')).toBe(true);
 });
 it('does not show recipient action absent from the backend',()=>{
  expect(allowed({id:1,name:'Transfer',school_id:3,allowed_actions:['view','approve']},'accept')).toBe(false);
 });
 it('reads list envelope and pagination without assuming optimistic totals',()=>{
  expect(readRecords([{id:1,name:'Box',school_id:3}])).toHaveLength(1);
  expect(readRecords({items:[{id:1,name:'Box',school_id:3}]})).toHaveLength(1);
  expect(readTotal({pagination:{total:42}},1)).toBe(42);
  expect(readTotal({},1)).toBe(1);
 });
 it('validates positive amounts',()=>{expect(positive('0')).toBe(false);expect(positive('-3')).toBe(false);expect(positive('12.50')).toBe(true);});
 it('requires independent finance capability codes',()=>{
  expect(capabilities.boxes.view).toBe('finance.view_cash_boxes');
  expect(capabilities.transfers.accept).toBe('finance.accept_cash_transfer');
  expect(capabilities.handovers.view).toBe('finance.view_cash_handover');
 });
});
