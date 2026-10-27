import {describe,it,expect} from 'vitest';
import {allowed,readRecords,readTotal,positive,capabilities,selectCashStaff} from './model';

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

describe('cash staff identity and school guards',()=>{
 const staff={id:14,user_id:14,name:'ليلى',active:true,account_status:'active',user_kind:'admin_staff',schools:[{id:2,name:'المدرسة'}]};
 it('selects the res.users id only for active accounts in the current school',()=>{
  expect(selectCashStaff({items:[staff]},2).map(row=>row.user_id??row.id)).toEqual([14]);
  expect(selectCashStaff({items:[staff]},3)).toEqual([]);
 });
 it('rejects conflicting ids, inactive accounts and parent-only rows',()=>{
  expect(selectCashStaff({items:[{...staff,user_id:99},{...staff,account_status:'suspended'},{...staff,user_kind:'parent',is_admin_staff:false,is_teacher:false}]},2)).toEqual([]);
 });
 it('rejects duplicates, missing school memberships and absent ids',()=>{
  expect(selectCashStaff([staff,{...staff},{...staff,id:0,user_id:null},{...staff,schools:[]}],2)).toHaveLength(1);
 });
});
