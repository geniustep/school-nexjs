'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {useLocale} from '@/features/i18n/locale-context';
import {copy as cashBoxCopy} from '@/features/admin/finance/cash-boxes/copy';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
import { CashDeskPageHeader } from '@/features/admin/finance/cash-desk/cash-desk-page-header';
import { CashSessionDetailView } from '@/features/admin/finance/cash-desk/cash-session-detail-view';
import { CashSessionKpiSkeleton } from '@/features/admin/finance/cash-desk/cash-session-kpi-grid';
import { OpenCashSessionDialog } from '@/features/admin/finance/cash-desk/open-session-dialog';
import { useCashJournals } from '@/features/admin/finance/cash-desk/use-cash-journals';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/finance/cash-desk/cash-desk-ui.css';
import { fetchCashSession, fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { canOpenCashSession } from '@/lib/permissions/finance';
import {
  cashDeskHasOpenSession,
  cashSessionCashierName,
  cashSessionOwnedByUser,
} from '@/lib/utils/cash-session-access';
import { cashSessionDisplayNumber } from '@/lib/utils/cash-session-normalize';¶»§q«^