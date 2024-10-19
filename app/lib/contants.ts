export const ROLES = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.EDITOR]: "Editor",
  [ROLES.VIEWER]: "Viewer",
};

export const SERVICE_STATUS = {
  OPERATIONAL: "operational",
  DEGRADED_PERFORMANCE: "degraded_performance",
  PARTIAL_OUTAGE: "partial_outage",
  MAJOR_OUTAGE: "major_outage",
};

export type ServiceStatus =
  (typeof SERVICE_STATUS)[keyof typeof SERVICE_STATUS];

export const SERVICE_STATUS_LABELS = {
  [SERVICE_STATUS.OPERATIONAL]: "Operational",
  [SERVICE_STATUS.DEGRADED_PERFORMANCE]: "Degraded Performance",
  [SERVICE_STATUS.PARTIAL_OUTAGE]: "Partial Outage",
  [SERVICE_STATUS.MAJOR_OUTAGE]: "Major Outage",
};
