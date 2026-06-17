'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import type { Student360TabId } from '../utils/student-360-tabs';
import { logStudent360TabError } from '../utils/student-360-tabs';

interface Props {
  studentId: string | number;
  tab: Student360TabId;
  endpoint?: string;
  onRetry?: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: string;
}

function TabErrorFallback({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <EmptyState
      icon="!"
      title={t('admin.student360.tabErrors.boundaryTitle')}
      description={t('admin.student360.tabErrors.boundaryDesc')}
      compact
      action={
        onRetry ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>
            {t('common.retry')}
          </button>
        ) : undefined
      }
    />
  );
}

export class Student360TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorType: 'unknown' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorType: error.name || 'Error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logStudent360TabError({
      student_id: this.props.studentId,
      tab_name: this.props.tab,
      endpoint: this.props.endpoint,
      error_type: error.name || 'render_error',
      request_status: info.componentStack ? 'render' : undefined,
      component_name: info.componentStack?.split('\n')[1]?.trim() ?? undefined,
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.tab !== this.props.tab && this.state.hasError) {
      this.setState({ hasError: false, errorType: 'unknown' });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorType: 'unknown' });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return <TabErrorFallback onRetry={this.props.onRetry ? this.handleRetry : undefined} />;
    }
    return this.props.children;
  }
}
