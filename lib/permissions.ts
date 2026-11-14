export const PERMISSION_KEYS = [
  "manage_courses",
  "manage_students",
  "manage_teachers",
  "view_orders",
  "manage_coupons",
  "manage_announcements",
  "manage_assignments",
  "moderate_messages",
  "manage_support",
] as const;

export type Permission = (typeof PERMISSION_KEYS)[number];
