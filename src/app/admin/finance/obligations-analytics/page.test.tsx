// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {FINANCE_VIEW} from '@/lib/permissions/finance';
import ObligationsAnalyticsPage from './page';
vi.mock('@/components/admin/require-admin-permission',()=>({
 RequireAdminPermission:({permission,children}:{permission:string;children:ReactNode})=>
  <section data-testid="permission-gate" data-permission={permission}>{children}</section>,
}));
vi.mock('@/features/admin/finance/contractual-analytics/contractual-analytics-view',()=>({
 ContractualAnalyticsView:()=> <div>Finance analytics workspace</div>,
}));
afterEach(cleanup);
describe('financial obligations access control',()=>{
 it('uses finance.view not finance.view_student_balance',()=>{
  render(<ObligationsAnalyticsPage/>);
  expect(screen.getByTestId('permission-gate').getAttribute('data-permission')).toBe(FINANCE_VIEW);
  expect(screen.getByText('Finance analytics workspace')).toBeTruthy();
 });
});
