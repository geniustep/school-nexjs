'use client';
import {RequireAdminPermission} from '@/components/admin/require-admin-permission';
import {ClassBulkTimetableEditor} from '@/features/admin/timetable/class-bulk-editor';
export default function ClassBulkTimetablePage(){return <RequireAdminPermission permission="view_timetable"><ClassBulkTimetableEditor/></RequireAdminPermission>}
