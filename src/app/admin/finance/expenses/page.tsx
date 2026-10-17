/** @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status proposed — visual review pending.
 */
import { RequireExpensesAccess } from '@/features/admin/finance/expenses/require-expenses-access';
import { ExpensesWorkspace } from '@/features/admin/finance/expenses/workspace';
export default function ExpensesPage(){return <RequireExpensesAccess><ExpensesWorkspace/></RequireExpensesAccess>;}
