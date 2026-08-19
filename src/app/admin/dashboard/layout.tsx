import type { ReactNode } from 'react';
import './dashboard-refinements.css';

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <div className="admin-dashboard-refined">{children}</div>;
}
