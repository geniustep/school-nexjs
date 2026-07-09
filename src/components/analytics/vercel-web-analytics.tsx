'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { sanitizeAnalyticsUrl } from '@/lib/analytics/sanitize-analytics-url';

function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  return {
    ...event,
    url: sanitizeAnalyticsUrl(event.url),
  };
}

export function VercelWebAnalytics() {
  return <Analytics beforeSend={sanitizeAnalyticsEvent} />;
}
