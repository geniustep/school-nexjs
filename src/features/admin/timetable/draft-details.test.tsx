// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { get } = vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@/lib/api/client',()=>({api:{get}}));
vi.mock('@/features/i18n/locale-context',()=>({useT:()=>(key:string)=>key}));
import { DraftDetails } from './draft-details';
const selection={draftId:10,classId:4,name:'QA draft',warnings:1,conflicts:0};
const response=(draftId=10,classId=4,lines:unknown[]=[])=>({success:true,data:{draft:{draft_id:draftId,class_id:classId,lines}}});
function setup(draft= response()){
 get.mockImplementation((path:string)=>Promise.resolve(path.endsWith('timetable-assignments')?{success:true,data:{assignments:[]}}:draft));
}
beforeEach(()=>{ get.mockReset(); });
afterEach(cleanup);
describe('read-only draft details',()=>{
 it('explains unavailable aggregate warning details without inventing a cause',async()=>{
  setup();render(<DraftDetails selection={selection} onClose={()=>{}}/>);
  expect(await screen.findByText('timetableWorkspace.warningDetailsUnavailable')).toBeTruthy();
  expect(screen.getByText('timetableWorkspace.noDraftLines')).toBeTruthy();
 });
 it.each([[11,4],[10,5]])('rejects a mismatched draft or class response (%s, %s)',async(draftId,classId)=>{
  setup(response(draftId,classId,[{line_id:1}]));
  render(<DraftDetails selection={selection} onClose={()=>{}}/>);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
 });
 it('retries a failed read without write requests',async()=>{
  get.mockResolvedValue({success:false,error:{code:'forbidden'}});
  render(<DraftDetails selection={selection} onClose={()=>{}}/>);
  await screen.findByRole('alert');
  setup();await userEvent.setup().click(screen.getByRole('button',{name:'timetableWorkspace.retryDetails'}));
  expect(await screen.findByText('timetableWorkspace.noDraftLines')).toBeTruthy();
  expect(get).toHaveBeenCalledTimes(4);
 });
 it('does not retain another draft on selection changes',async()=>{
  setup(response(10,4,[{line_id:1,weekday:'monday',start_time:8,end_time:9,warning_messages:['old draft warning']}]));
  const view=render(<DraftDetails selection={selection} onClose={()=>{}}/>);
  await screen.findByText('old draft warning');
  setup(response(20,5));
  view.rerender(<DraftDetails selection={{...selection,draftId:20,classId:5}} onClose={()=>{}}/>);
  await screen.findByText('timetableWorkspace.noDraftLines');
  expect(screen.queryByText('old draft warning')).toBeNull();
  expect(get).toHaveBeenCalledWith('/admin/classes/5/timetable-draft',{draft_id:20});
 });
});
