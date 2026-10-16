// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
const { get, post, session } = vi.hoisted(() => ({get:vi.fn(),post:vi.fn(),session:{permissions:['view_timetable']}}));
vi.mock('@/components/admin/require-admin-permission',()=>({RequireAdminPermission:({children}:{children:ReactNode})=>children}));
vi.mock('@/features/auth/session-context',()=>({useSession:()=>({role:'admin',permissions:session.permissions})}));
vi.mock('@/features/academic-context/hooks/use-global-academic-year-resource',()=>({useGlobalAcademicYearResource:()=>({loading:false,error:null,data:[{id:1,name:'TC-1',level:{id:2,name:'Level'}}]})}));
vi.mock('@/lib/hooks/use-admin-resource',()=>({useAdminResource:()=>({loading:false,error:null,data:[{id:2,name:'Level',cycle:{id:3,name:'Cycle'}}]})}));
vi.mock('@/lib/api/client',()=>({api:{get,post}}));
import StudioPage from './page';
afterEach(()=>{cleanup();vi.clearAllMocks();session.permissions=['view_timetable'];});
describe('studio destination screen',()=>{
 it('opens and loads class context read-only while keeping write/publish disabled',async()=>{
  get.mockImplementation((path:string)=>Promise.resolve({success:true,data:path.endsWith('timetable-assignments')?{assignments:[]}:path.endsWith('timetable-draft')?{draft:{draft_id:10,state:'draft',config_id:4,write_date:'v1',lines:[],conflict_count:0,can_publish:true}}:{setup_complete:true,config:{id:4},periods:[],breaks:[],allowed_weekdays:[],blockers:{save_line:[],publish:[],open_draft:[]}}}));
  render(<StudioPage/>);
  expect(screen.getByRole('heading',{name:'استوديو استعمال الزمان'})).toBeTruthy();
  const user=userEvent.setup();
  await user.selectOptions(screen.getByLabelText('01 · السلك'),'Cycle');
  await user.selectOptions(screen.getByLabelText('02 · المستوى'),'2');
  await user.selectOptions(screen.getByLabelText('03 · القسم'),'1');
  await waitFor(()=>expect(get).toHaveBeenCalledWith('/admin/timetable/setup-context',{class_id:1,draft_id:10}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'حفظ المسودة'})).toBeTruthy());
  expect((screen.getByRole('button',{name:'حفظ المسودة'}) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button',{name:'نشر هذا القسم'}) as HTMLButtonElement).disabled).toBe(true);
  expect(post).not.toHaveBeenCalled();
 });
});

const period={id:2,name:'الفترة الأولى',start_time:8,end_time:9,sequence:1};
const savedLine={line_id:31,assignment_id:171,weekday:'monday',period_id:2,start_time:8,end_time:9};
const makeDraft=(state='draft',write_date='v1',lines:typeof savedLine[]=[])=>({draft_id:10,state,config_id:4,write_date,lines,conflict_count:0,can_publish:state==='validated'});
const context={setup_complete:true,config:{id:4},periods:[period],breaks:[],allowed_weekdays:['monday','tuesday'],blockers:{save_line:[],publish:[],open_draft:[]}};
function setupEditable(state='draft'){
 session.permissions=['view_timetable','manage_timetable','publish_timetable'];
 const current={draft:makeDraft(state)};
 get.mockImplementation((path:string)=>Promise.resolve({success:true,data:path.endsWith('timetable-assignments')?{assignments:[{assignment_id:171,subject_name:'الرياضيات',teacher_name:'أستاذ تجريبي'}]}:path.endsWith('timetable-draft')?{draft:current.draft}:context}));
 return current;
}
async function openClass(){
 render(<StudioPage/>);
 const user=userEvent.setup();
 await user.selectOptions(screen.getByLabelText('01 · السلك'),'Cycle');
 await user.selectOptions(screen.getByLabelText('02 · المستوى'),'2');
 await user.selectOptions(screen.getByLabelText('03 · القسم'),'1');
 await screen.findByLabelText('إسناد الاثنين، الفترة الأولى');
 return user;
}
describe('studio save lifecycle',()=>{
 it('saves, validates, then saves further changes using the same draft and fresh version',async()=>{
  const current=setupEditable();
  post.mockImplementation((path:string)=>{
   if(path.endsWith('/validate'))current.draft={...current.draft,state:'validated',write_date:'v3',can_publish:true};
   else current.draft=makeDraft('draft',current.draft.write_date==='v1'?'v2':'v4',[savedLine,...current.draft.state==='validated'?[{...savedLine,line_id:32,weekday:'tuesday'}]:[]]);
   return Promise.resolve({success:true,data:{draft:current.draft,bulk_result:{errors:[]}}});
  });
  const user=await openClass();
  await user.selectOptions(screen.getByLabelText('إسناد الاثنين، الفترة الأولى'),'171');
  await user.click(screen.getByRole('button',{name:'حفظ المسودة'}));
  await screen.findByText('حُفظت المسودة بنجاح بعد تأكيد الخدمة وإعادة قراءة الحصص.');
  expect(get).toHaveBeenCalledWith('/admin/classes/1/timetable-draft',{draft_id:10});
  await user.click(screen.getByRole('button',{name:'التحقق من المسودة'}));
  await screen.findByText('اكتمل التحقق من المسودة. راجع جاهزيتها للنشر.');
  await user.selectOptions(screen.getByLabelText('إسناد الثلاثاء، الفترة الأولى'),'171');
  await user.click(screen.getByRole('button',{name:'حفظ المسودة'}));
  expect(post).toHaveBeenLastCalledWith('/admin/classes/1/timetable-draft/studio-save',{draft_id:10,expected_write_date:'v3',lines:[{assignment_id:171,weekday:'tuesday',period_id:2}],delete_line_ids:[]});
  await screen.findByText('حُفظت المسودة بنجاح بعد تأكيد الخدمة وإعادة قراءة الحصص.');
  expect((screen.getByRole('button',{name:'نشر هذا القسم'}) as HTMLButtonElement).disabled).toBe(true);
 });
 it.each(['draft_not_editable','timetable_draft_stale'])('preserves unsaved placements on %s without retrying',async(code)=>{
  setupEditable('validated');
  post.mockResolvedValue({success:false,error:{code,message:'Rejected'},meta:{}});
  const user=await openClass();
  await user.selectOptions(screen.getByLabelText('إسناد الاثنين، الفترة الأولى'),'171');
  await user.click(screen.getByRole('button',{name:'حفظ المسودة'}));
  await screen.findByText(code==='draft_not_editable'?/رفضت الخدمة الحفظ بسبب حالة المسودة/:/تغيرت المسودة منذ تحميلها/);
  expect((screen.getByLabelText('إسناد الاثنين، الفترة الأولى') as HTMLSelectElement).value).toBe('171');
  expect(screen.getByText('لديك تغييرات غير محفوظة')).toBeTruthy();
  expect(post).toHaveBeenCalledTimes(1);
 });
 it('does not resend a confirmed save when its follow-up refresh fails',async()=>{
  const current=setupEditable();
  post.mockImplementation(()=>{
   current.draft=makeDraft('draft','v2',[savedLine]);
   get.mockRejectedValueOnce(new Error('Refresh failed'));
   return Promise.resolve({success:true,data:{draft:current.draft,bulk_result:{errors:[]}}});
  });
  const user=await openClass();
  await user.selectOptions(screen.getByLabelText('إسناد الاثنين، الفترة الأولى'),'171');
  await user.click(screen.getByRole('button',{name:'حفظ المسودة'}));
  await screen.findByText(/حُفظت المسودة بنجاح، لكن تعذر تحديث عرضها/);
  expect((screen.getByRole('button',{name:'حفظ المسودة'}) as HTMLButtonElement).disabled).toBe(true);
  expect(post).toHaveBeenCalledTimes(1);
 });
 it.each(['published','archived'])('blocks save and validation for %s drafts',async(state)=>{
  setupEditable(state);
  const user=await openClass();
  await user.selectOptions(screen.getByLabelText('إسناد الاثنين، الفترة الأولى'),'171');
  expect((screen.getByRole('button',{name:'حفظ المسودة'}) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button',{name:'التحقق من المسودة'}) as HTMLButtonElement).disabled).toBe(true);
  expect(post).not.toHaveBeenCalled();
 });
});

it('prevents edits and class changes while a save is in flight',async()=>{
 const current=setupEditable();
 let finish!:(value:unknown)=>void;
 post.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const user=await openClass();
 await user.selectOptions(screen.getByLabelText('إسناد الاثنين، الفترة الأولى'),'171');
 await user.click(screen.getByRole('button',{name:'حفظ المسودة'}));
 expect((screen.getByLabelText('إسناد الثلاثاء، الفترة الأولى') as HTMLSelectElement).disabled).toBe(true);
 expect((screen.getByLabelText('03 · القسم') as HTMLSelectElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'↶ تراجع'}) as HTMLButtonElement).disabled).toBe(true);
 current.draft=makeDraft('draft','v2',[savedLine]);
 finish({success:true,data:{draft:current.draft,bulk_result:{errors:[]}}});
 await screen.findByText('حُفظت المسودة بنجاح بعد تأكيد الخدمة وإعادة قراءة الحصص.');
 expect((screen.getByLabelText('إسناد الثلاثاء، الفترة الأولى') as HTMLSelectElement).disabled).toBe(false);
});
