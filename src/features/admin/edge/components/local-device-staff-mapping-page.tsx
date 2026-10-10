'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ApiErrorView,EmptyState,LoadingState} from '@/components/states/states';
import {Badge,Card,PageHeader} from '@/components/ui/primitives';
import {useLocale} from '@/features/i18n/locale-context';
import {useToast} from '@/components/ui/toast';
import {fetchAttendanceDevicePersons,fetchAttendanceSourceDevices,fetchStaffCandidates,saveAttendancePersonMapping,unlinkAttendancePersonMapping} from '@/features/admin/edge/api/attendance';
import {AttendanceForceSyncControl} from '@/features/admin/edge/components/attendance-force-sync-control';
import type {EdgeAttendanceDevicePerson,EdgeAttendanceSourceDevice,EdgeStaffCandidate} from '@/features/admin/edge/types';
import type {ApiErrorBody} from '@/types/api';
import '../edge-local-devices.css';
type Filter='all'|'mapped'|'unmapped';
const C={ar:{unavailable:'لا تتوفر لهذا الموظف علاقة مدرسية واحدة صالحة للربط بالحضور.',title:'الأجهزة المحلية',sub:'اربط مستخدمي أجهزة الحضور بموظفي رقيم. تشغيل الحضور المباشر مستقل عن الربط.',total:'مستخدمو الجهاز',mapped:'مرتبط',unmapped:'غير مرتبط',all:'الكل',search:'البحث بالاسم أو المعرّف',synced:'الدليل متزامن',off:'الحضور المباشر غير مفعّل',on:'الحضور المباشر مفعّل',link:'ربط بموظف'���q�^