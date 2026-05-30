// Permission keys — mirrors the Role & Permission matrix in API_REPORT.md §6.
// The /api/v1/me response returns a subset of these in user.permissions.

export type Permission =
  | 'view_dashboard'
  | 'manage_students'
  | 'view_students'
  | 'manage_parents'
  | 'view_parents'
  | 'manage_teachers'
  | 'view_teachers'
  | 'manage_classes'
  | 'view_classes'
  | 'view_attendance'
  | 'manage_attendance'
  | 'take_attendance'
  | 'view_channels'
  | 'manage_channels'
  | 'send_messages'
  | 'view_messages'
  | 'import_data';
