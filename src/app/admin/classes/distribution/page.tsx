/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import '@/features/admin/classes/distribution/class-distribution-token-aliases.css';
import '@/features/admin/classes/distribution/class-distribution-shell-enhancements.css';
import '@/features/admin/classes/distribution/class-distribution-viewport-fix.css';
import '@/features/admin/classes/distribution/class-distribution-gender-compact.css';
import { ClassDistributionDirectBoard } from '@/features/admin/classes/distribution/class-distribution-direct-board';
import { ClassDistributionShellEnhancements } from '@/features/admin/classes/distribution/class-distribution-shell-enhancements';
import { ClassDistributionUiRepair } from '@/features/admin/classes/distribution/class-distribution-ui-repair';

export default function AdminClassDistributionPage() {
  return (
    <div className="class-distribution-page-shell">
      <ClassDistributionUiRepair />
      <ClassDistributionShellEnhancements />
      <ClassDistributionDirectBoard />
    </div>
  );
}
