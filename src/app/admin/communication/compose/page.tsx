'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * General / administrative school communication compose (recipient scopes).
 * Not a channel composer — broad scopes live here only.
 */

import { GeneralCommunicationComposeWorkspace } from '@/features/communication/components/general-communication-compose-workspace';

export default function AdminCommunicationComposePage() {
  return <GeneralCommunicationComposeWorkspace />;
}
