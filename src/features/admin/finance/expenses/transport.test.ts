import { describe, it, expect } from 'vitest';
import { shouldInjectActiveSchoolIdInBody } from '@/lib/api/bff-route-policy';
import { permissionForAdminPath } from '@/lib/permissions/admin-pages';
describe('Expenses transport scope', () => {
    it('keeps expense school context outside strict editable payload', () => { for (const path of ['/admin/finance/expenses', '/admin/finance/expenses/4', '/admin/finance/expenses/4/reject', '/admin/finance/expenses/categories'])
        expect(shouldInjectActiveSchoolIdInBody(path)).toBe(false); });
    it('does not relax other finance payload conventions', () => expect(shouldInjectActiveSchoolIdInBody('/admin/finance/payments')).toBe(true));
});
