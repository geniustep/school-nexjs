// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const context = vi.hoisted(() => ({manage:true, error:false, locale:'ar'}));
const { get } = vi.hoisted(() => ({get:vi.fn()}));
vi.mock('@/lib/api/client',()=>({api:{get}}));
vi.mock('@/features/i18n/locale-context', () => ({useLocale:()=>({locale:context.locale,t:(key:string)=>key}),useT:()=>(key:string)=>key}));
vi.mock('@/features/auth/session-context', () => ({useSession:()=>({role:'admin',permissions:context.manage?['manage_timetable','view_classes']:['view_timetable']})}));
vi.mock('@/features/auth/admin-session-context', () => ({useAdminSession:()=>({activeAcademicYearId:1})}));
vi.mock('@/features/academic-context/hooks/use-global-academic-year-resource', () => ({useGlobalAcademicYearResource:()=>({data:[{draft_id:1,name:'Central TC-1',state:'published',line_count:4,warning_count:1,conflict_count:0,scope_class_ids:[1]},{draft_id:2,name:'Draft Multi',state:'draft',line_count:0,warning_count:0,conflict_count:2,scope_class_ids:[1,2]}],initialLoading:false,fetching:false,loading:false,error:context.error?{code:'network_error',message:'network'}:null,reload:()=>{}})}));
vi.mock('@/features/admin/admin-timetable-panel', () => ({AdminTimetablePanel:({aside}:{aside:ReactNode})=><div>{aside}</div>}));
vi.mock('@/components/states/resource', () => ({ResourceView:({state,children}:{state:{error:unknown;data:unknown[]};children:(data:unknown[])=>ReactNode})=>state.error?<div role="alert">network error</div>:children(state.data)}));
vi.mock('@/components/admin/require-admin-permission', () => ({RequireAdminPermission:({children}:{children:ReactNode})=>children}));
import { TimetableWorkspace } from '@/app/admin/timetable/page';
afterEach(cleanup);
beforeEach(()=>{context.manage=true;context.error=false;context.locale='ar';get.mockReset();});
describe('timetable workspace contract boundaries',()=>{
 it('opens the exact draft sessions and warning messages instead of filtering published slots',async()=>{
  get.mockImplementation((path:string)=>Promise.resolve({success:true,data:path.endsWith('timetable-assignments')?{assignments:[{assignment_id:171,subject_name:'الرياضيات',teacher_name:'أستاذ تجريبي'}]}:{draft:{draft_id:1,class_id:1,lines:[{line_id:5,assignment_id:171,weekday:'monday',start_time:8.5,end_time:9.5,warning_messages:['ملاحظة الحصة من الخدمة'],conflict_messages:[]}]}}}));
  render(<TimetableWorkspace/>);
  const button=screen.getByRole('button',{name:'timetableWorkspace.viewClass'});
  await userEvent.setup().click(button);
  expect(await screen.findByText('ملاحظة الحصة من الخدمة')).toBeTruthy();
  expect(screen.getByText('الرياضيات')).toBeTruthy();
  expect(screen.getByText('08:30–09:30')).toBeTruthy();
  expect(get).toHaveBeenCalledWith('/admin/classes/1/timetable-draft',{draft_id:1});
  expect(button.getAttribute('aria-expanded')).toBe('true');
  await userEvent.setup().click(screen.getByRole('button',{name:'common.close'}));
  expect(screen.queryByText('ملاحظة الحصة من الخدمة')).toBeNull();
 });
 it('links to the implemented setup and studio routes',()=>{
  render(<TimetableWorkspace/>);
  expect(screen.getByRole('link',{name:'timetableWorkspace.settings'}).getAttribute('href')).toBe('/admin/timetable/setup');
  expect(screen.getByRole('link',{name:'timetableWorkspace.studio'}).getAttribute('href')).toBe('/admin/timetable/studio');
  expect(screen.getByRole('link',{name:'timetableWorkspace.detailedEditor'}).getAttribute('href')).toBe('/admin/timetable/bulk');
  expect(screen.queryByText('timetableWorkspace.studioUnavailable')).toBeNull();
  expect(screen.getAllByRole('button',{name:'timetableWorkspace.viewClass'})).toHaveLength(1);
 });
 it('allows view-only studio access without exposing settings outside its permission',()=>{
  context.manage=false;render(<TimetableWorkspace/>);
  expect(screen.getByRole('link',{name:'timetableWorkspace.studio'}).getAttribute('href')).toBe('/admin/timetable/studio');
  expect(screen.getByRole('link',{name:'timetableWorkspace.detailedEditor'}).getAttribute('href')).toBe('/admin/timetable/bulk');
  expect(screen.queryByRole('link',{name:'timetableWorkspace.settings'})).toBeNull();
 });
 it('does not display stale successful counters when the drafts request fails',()=>{
  context.error=true;render(<TimetableWorkspace/>);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getAllByText('—')).toHaveLength(3);
  expect(screen.queryByText('Central TC-1')).toBeNull();
 });
});
