import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {copy} from './copy';
const workspace=readFileSync(new URL('./workspace.tsx',import.meta.url),'utf8');
const desk=readFileSync(new URL('../cash-desk/cash-desk-workspace.tsx',import.meta.url),'utf8');
const dialog=readFileSync(new URL('../cash-desk/open-session-dialog.tsx',import.meta.url),'utf8');
const transport=readFileSync(new URL('../../../../lib/api/finance-cash-desk.ts',import.meta.url),'utf8');
describe('Cash Boxes V2 frontend contract',()=>{
 it('offers shared mode even when there are zero boxes, while Odoo enforces the school policy',()=>{
  expect(workspace).toContain('journal_link_mode:fields.journal_link_mode');
  expect(workspace).toContain('<option value="shared">{t.sharedMode}</option>');
  expect(workspace).not.toContain('supportsV2');
  expect(workspace).toContain("code==='cash_boxes_v2_not_enabled'?t.sharedUnavailable");
  expect(copy.ar.sharedMode).toBe('دفتر مشترك');
  expect(copy.ar.sharedUnavailable).toContain('غير مفعّل');
 });
 it('uses box identity even when journals coincide',()=>{expect(desk).toContain('eligibleBoxes.length>1');expect(desk).toContain('selectedBoxId');expect(dialog).toContain('cash_box_id:Number(selectedBoxId)');expect(transport).toContain('cash_box_id: cashBoxId');});
 it('does not open positive V2 cash sessions without a documented source',()=>{expect(dialog).toContain('positiveSourceUnavailable');expect(dialog).toContain('!positiveSourceUnavailable');});
 it('keeps journal-only transport for legacy sessions',()=>{expect(dialog).toContain('...(selectedBoxId?');expect(transport).toContain('...(cashBoxId ?');});
});
