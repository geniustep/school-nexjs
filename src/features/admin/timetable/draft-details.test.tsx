// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
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
 it.each(['rtl','ltr'])('orders Monday through Sunday, then by start time in %s',async(dir)=>{
  const previousDir=document.documentElement.dir;
  document.documentElement.dir=dir;
  const days=['sunday','friday','monday','wednesday','saturday','tuesday','thursday','monday'];
  const lines=days.map((weekday,index)=>({line_id:index+1,assignment_id:false,weekday,start_time:index===7?8:10,end_time:index===7?9:11}));
  try{
   setup(response(10,4,lines));
   render(<DraftDetails selection={selection} onClose={()=>{}}/>);
   const table=await screen.findByRole('table');
   const cells=within(table).getAllByRole('row').slice(1).map(row=>within(row).getAllByRole('cell'));
   expect(cells.map(row=>row[0].textContent)).toEqual(['days.monday','days.monday','days.tuesday','days.wednesday','days.thursday','days.friday','days.saturday','days.sunday']);
   expect(cells.slice(0,2).map(row=>row[1].textContent)).toEqual(['08:00–09:00','10:00–11:00']);
   expect(lines.map(line=>line.weekday)).toEqual(days);
  }finally{document.documentElement.dir=previousDir;}
 });
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

describe('draft details overlay',()=>{
 it.each(['rtl','ltr'])('opens outside the page flow in %s',async(dir)=>{
  const { readFileSync }=await import('node:fs');
  const style=document.createElement('style');
  style.textContent=readFileSync('src/features/admin/timetable/timetable-workspace.css','utf8');
  document.head.append(style);
  const previousDir=document.documentElement.dir;
  document.documentElement.dir=dir;
  try{
   setup();
   const view=render(<div data-testid="workspace"><DraftDetails selection={selection} onClose={()=>{}}/></div>);
   const dialog=await screen.findByRole('dialog');
   const backdrop=dialog.parentElement!;
   expect(backdrop.parentElement).toBe(document.body);
   expect(view.getByTestId('workspace').contains(dialog)).toBe(false);
   expect(getComputedStyle(backdrop).position).toBe('fixed');
   expect(dialog.getAttribute('aria-modal')).toBe('true');
   view.unmount();
  }finally{style.remove();document.documentElement.dir=previousDir;}
 });
 it('restores focus and background scrolling on close without scrolling the page',async()=>{
  setup();
  const opener=document.createElement('button');
  document.body.append(opener);opener.focus();
  const overflow=document.body.style.overflow;
  const padding=document.body.style.paddingInlineEnd;
  const scroll=vi.spyOn(window,'scrollTo');
  const onClose=vi.fn();
  const view=render(<DraftDetails selection={selection} onClose={onClose}/>);
  await screen.findByText('timetableWorkspace.noDraftLines');
  expect(document.body.style.overflow).toBe('hidden');
  await userEvent.setup().keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledOnce();
  view.unmount();
  expect(document.activeElement).toBe(opener);
  expect(document.body.style.overflow).toBe(overflow);
  expect(document.body.style.paddingInlineEnd).toBe(padding);
  expect(scroll).not.toHaveBeenCalled();
  scroll.mockRestore();opener.remove();
 });
 it('keeps keyboard navigation within the overlay',async()=>{
  setup();render(<DraftDetails selection={selection} onClose={()=>{}}/>);
  await screen.findByText('timetableWorkspace.noDraftLines');
  const close=screen.getByRole('button',{name:'common.close'});
  close.focus();
  await userEvent.setup().tab();
  expect(document.activeElement).toBe(close);
 });
});
