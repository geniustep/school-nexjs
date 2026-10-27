import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {endpoints} from '@/lib/api/endpoints';
import {copy} from './copy';

const workspace=readFileSync(new URL('./workspace.tsx',import.meta.url),'utf8');
describe('cash boxes front-end contract',()=>{
 it('registers every implemented V1 read route',()=>{
  expect(endpoints.admin.financeCashBoxes).toBe('/admin/finance/cash-boxes');
  expect(endpoints.admin.financeCashTransfers).toBe('/admin/finance/cash-transfers');
  expect(endpoints.admin.financeCashHandovers).toBe('/admin/finance/cash-handovers');
  expect(endpoints.admin.financeCashBox(3)).toBe('/admin/finance/cash-boxes/3');
  expect(endpoints.admin.financeCashTransfer(3)).toBe('/admin/finance/cash-transfers/3');
  expect(endpoints.admin.financeCashHandover(3)).toBe('/admin/finance/cash-handovers/3');
 });
 it('retains contract-specific mutation routes',()=>{
  expect(endpoints.admin.financeCashTransferApprove(9)).toMatch(/9\/approve$/);
  expect(endpoints.admin.financeCashTransferDispatch(9)).toMatch(/9\/dispatch$/);
  expect(endpoints.admin.financeCashTransferAccept(9)).toMatch(/9\/accept$/);
  expect(endpoints.admin.financeCashHandoverAccept(4)).toMatch(/4\/accept$/);
  expect(endpoints.admin.financeCashBoxParticipants(4)).toMatch(/4\/participants$/);
 });
 it('does not send mutation when allowed_actions is missing',()=>{
  expect(workspace).toContain("allowed(detail,'accept')");
  expect(workspace).toContain('setOutcomeUnknown(true)');
  expect(workspace).toContain('window.confirm(t.confirm)');
  expect(workspace).toContain('active_school_id:activeSchoolId');
 });
 it('has Arabic, French and English interface labels',()=>{
  expect(copy.ar.handovers).toBe('تسليم العهدة');
  expect(copy.fr.transfers).toBe('Transferts de fonds');
  expect(copy.en.boxes).toBe('Cash boxes');
 });
});

describe('cash boxes UX redesign invariants',()=>{
 it('opens financial creation in a dialog rather than below the lists',()=>{
  expect(workspace).toContain('role="dialog"');
  expect(workspace).toContain('aria-modal="true"');
  expect(workspace).toContain('cb-modal-backdrop');
  expect(workspace).not.toContain('<section className="card cb-form">');
 });
 it('chooses participants by a scoped staff name rather than a raw ID input',()=>{
  expect(workspace).toContain('endpoints.admin.staff');
  expect(workspace).toContain("active_school_id:activeSchoolId");
  expect(workspace).toContain('staff.map(person');
  expect(workspace).toContain("key==='user_id'||key==='to_custodian_id'");
 });
});

describe('cash boxes guarded UX and localization',()=>{
 it('maps staff selections to verified res.users identities before submission',()=>{
  expect(workspace).toContain('selectCashStaff(result.data,Number(activeSchoolId))');
  expect(workspace).toContain('participant&&safeId(fields.user_id)');
  expect(workspace).toContain('custodian&&safeId(fields.to_custodian_id)');
  expect(workspace).toContain('value={person.user_id??person.id}');
 });
 it('localizes box options and provides meaningful empty states',()=>{
  expect(workspace).toContain("{display('box_type','collection')}");
  expect(workspace).toContain('cb-detail-empty');
  expect(workspace).toContain('cb-list-empty');
  expect(copy.ar.selectRecord).toBe('اختر صندوقًا أو عملية');
 });
 it('keeps financial dialogs keyboard accessible and guards empty submits',()=>{
  expect(workspace).toContain("event.key==='Escape'");
  expect(workspace).toContain('ref={dialogRef}');
  expect(workspace).toContain('!canSubmitForm');
 });
});
