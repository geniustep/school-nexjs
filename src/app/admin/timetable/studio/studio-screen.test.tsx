// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
const { get, post } = vi.hoisted(() => ({get:vi.fn(),post:vi.fn()}));
vi.mock('@/components/admin/require-admin-permission',()=>({RequireAdminPermission:({children}:{children:ReactNode})=>children}));
vi.mock('@/features/auth/session-context',()=>({useSession:()=>({role:'admin',permissions:['view_timetable']})}));
vi.mock('@/features/academic-context/hooks/use-global-academic-year-resource',()=>({useGlobalAcademicYearResource:()=>({loading:false,error:null,data:[{id:1,name:'TC-1',level:{id:2,name:'Level'}}]})}));
vi.mock('@/lib/hooks/use-admin-resource',()=>({useAdminResource:()=>({loading:false,error:null,data:[{id:2,name:'Level',cycle:{id:3,name:'Cycle'}}]})}));
vi.mock('@/lib/api/client',()=>({api:{get,post}}));
import StudioPage from './page';
afterEach(()=>{cleanup();vi.clearAllMocks();});
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
