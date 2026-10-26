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
  expect(workspace).toContain('setOutcomeUnknown(true)')¶»§q«^