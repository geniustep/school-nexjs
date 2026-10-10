'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/features/i18n/locale-context';
import { enqueueAttendanceForceSync, fetchAttendanceForceSyncStatus } from '@/features/admin/edge/api/attendance';
import type { EdgeAttendanceForceSyncState, EdgeAttendanceForceSyncStatus, EdgeAttendanceSourceDevice } from '@/features/admin/edge/types';

const POLL_INTERVAL_MS = 2500;
const EXPIRY_GRACE_MS = 10000;
const FALLBACK_OBSERVATION_MS = 35 * 60_000;
const ACTIVE_STATES = new Set<EdgeAttendanceForceSyncState>(['queued','dispatched','running']);
const TERMINAL_STATES = new Set<EdgeAttendanceForceSyncState>(['success','partial','failed','already_running','expired','rejected_scope']);

export function isAttendanceForceSyncActive(state: EdgeAttendanceForceSyncState){return ACTIVE_STATES.has(state)}
export function isAttendanceForceSyncTerminal(state: EdgeAttendanceForceSyncState){return TERMINAL_STATES.has(state)}

const COPY={ar:{syncNow:'مزامنة الآن',starting:'جارٍ بدء المزامنة…',queued:'جارٍ بدء المزامنة…',dispatched:'تم إرسال طلب المزامنة إلى الجهاز…',running:'جارٍ مزامنة بيانات جهاز الحضور…',success:'اكتملت المزامنة بنجاح',partial:'اكتملت المزامنة جزئيًا',failed:'تعذرت المزامنة',already_running:'توجد مزامنة جارية بض��q�^