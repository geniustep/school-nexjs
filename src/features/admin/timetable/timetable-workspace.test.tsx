// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const context = vi.hoisted(() => ({manage:true, error:false, locale:'ar'}));
vi.mock('@/features/i18n/locale-context', () => ({useLocale:()=>({locale:context.locale,t:(key:string)=>key})}));
vi.mock('@/features/auth/session-context', () => ({useSession:()=>({role:'admin',permissions:context.manage?['manage_timetable','view_classes']:['view_timetable']})}));
vi.mock('@/features/auth/admin-session-context', () => ({useAdminSession:()=>({activeAcademicYearId:1})}));
vi.mock('@/features/academic-context/hooks/use-global-academic-year-resource', () => ({useGlobalAcademicYearResource:()=>({data:[{draft_id:1,name:'Central TC-1',state:'published',line_count:4,warning_count:1,conflict_count:0,scope_class_ids:[1]},{draft_id:2,name:'Draft Multi',state:'draft',line_count:0,warning_count:0,conflict_count:2,scope_class_ids:[1,2]}],initialLoading:false,fetching:false,loading:false,error:context.error?{code:'network_error',message:'network'}:null,reload:()=>{}})}));
vi.mock('@/features/admin/admin-timetable-panel', () => ({AdminTimetablePanel:({aside}:{aside:ReactNode})=><div>{aside}</div>}));
vi.mock('@/components/states/resource', () => ({ResourceView:({state,children}:{state:{error:unknown;data:unknown[]};children:(data:unknown[])=>ReactNode})=>state.error?<div role="alert">network error</div>:children(state.data)}));
vi.mock('@/components/admin/require-admin-permission', () => ({RequireAdminPermission:({children}:{children:ReactNode})=>children}));
import { TimetableWorkspace } from '@/app/admin/timetable/page';
afterEach(cleanup);
beforeEach(()=>{context.manage=true;context.error=false;context.locale='ar';});
describe('timetable workspace contract boundaries',()=>{
 it('links to the implemented setup and studio routes',()=>{
  render(<TimetableWorkspace/>);
  expect(screen.getByRole('link',{name:'timetableWorkspace.settings'}).getAttribute('href')).toBe('/admin/timetable/setup');
  expect(screen.getByRole('link',{name:'timetableWorkspace.studio'}).getAttribute('href')).toBe('/admin/timetable/studio');
  expect(screen.queryByText('timetableWorkspace.studioUnavailable')).toBeNull();
  expect(screen.getAllByRole('button',{name:'timetableWorkspace.viewClass'})).toHaveLength(1);
 });
 it('allows view-only studio access without exposing settings outside its permission',()=>{
  context.manage=false;render(<TimetableWorkspace/>);
  expect(screen.getByRole('link',{name:'timetableWorkspace.studio'}).getAttribute('href')).toBe('/admin/timetable/studio');
  expect(screen.queryByRole('link',{name:'timetableWorkspace.settings'})).toBeNull();
 });
 it('does not display stale successful counters when the drafts request fails',()=>{
  context.error=true;render(<TimetableWorkspace/>);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getAllByText('—')).toHaveLength(3);
  expect(screen.queryByText('Central TC-1')).toBeNull();
 });
});
