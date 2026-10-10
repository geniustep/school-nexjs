// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {AttendanceForceSyncControl} from './attendance-force-sync-control';
import type {EdgeAttendanceForceSyncState,EdgeAttendanceForceSyncStatus,EdgeAttendanceSourceDevice} from '@/features/admin/edge/types';
const enqueue=vi.fn();const fetchStatus=vi.fn();const toast={show:vi.fn(),success:vi.fn(),warning:vi.fn(),error:vi.fn()};
vi.mock('@/features/admin/edge/api/attendance',()=>({enqueueAttendanceForceSync:(...a:unknown[])=>enqueue(...a),fetchAttendanceForceSyncStatus:(...a:unknown[])=>fetchStatus(...a)}));
vi.mock('@/features/i18n/locale-context',()=>({useLocale:()=>({locale:'ar'})}));
vi.mock('@/components/ui/toast',()=>({useToast:()=>toast}));
const source:EdgeAttendanceSourceDevice={id:1,source_device_id:'hik-entrance-01',vendor:'hikvision',name:'Entrance',active:true};
function status(state:EdgeAttendanceForceSyncState,o:Partial<EdgeAttendanceForceSyncStatus>={}):EdgeAttendanceForceSyncStatus{return{request_id:'fs_test',operation:'attendance.force_sync',state,source_device:{id:1,source_device_id:'hik-entrance-01',name:'Entrance',active:true},edge_device:{id:3,device_uid:'edge-1',device_name:'Edge',active:true},requested_at:'2026-10-09 12:00:00',dispatched_at:null,started_at:null,finished_at:null,expires_at:'2099-10-09 12:30:00',watermark_before:null,watermark_after:null,steps:[],events_polled:n¶»§q«^