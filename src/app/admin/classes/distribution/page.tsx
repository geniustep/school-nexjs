/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import '@/features/admin/classes/distribution/class-distribution-token-aliases.css';
import '@/features/admin/classes/distribution/class-distribution-shell-enhancements.css';
import { ClassDistributionDirectBoard } from '@/features/admin/classes/distribution/class-distribution-direct-board';
import { ClassDistributionShellEnhancements } from '@/features/admin/classes/distribution/class-distribution-shell-enhancements';

export default function AdminClassDistributionPage() {
  return (
    <div className="class-distribution-page-shell">
      <ClassDistributionShellEnhancements />
      <ClassDistributionDirectBoard />
    </div>
  );
}
