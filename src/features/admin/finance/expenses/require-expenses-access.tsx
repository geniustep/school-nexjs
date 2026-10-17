'use client';
import type { ReactNode } from 'react';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { PermissionDeniedState, NoActiveSchoolState } from '@/components/states/states';
import { expenseCapability } from './model';
export function RequireExpensesAccess({ children }: {
    children: ReactNode;
}) {
    const user = useSession();
    const { activeSchoolId } = useAdminSession();
    if (!expenseCapability(user, 'view'))
        return <PermissionDeniedState />;
    if (!activeSchoolId)
        return <NoActiveSchoolState />;
    return <>{children}</>;
}
