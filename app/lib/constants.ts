import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

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

export const SERVICE_STATUS_ICONS = {
  [SERVICE_STATUS.OPERATIONAL]: CheckCircle,
  [SERVICE_STATUS.DEGRADED_PERFORMANCE]: AlertTriangle,
  [SERVICE_STATUS.PARTIAL_OUTAGE]: XCircle,
  [SERVICE_STATUS.MAJOR_OUTAGE]: XCircle,
};

export const getServiceStatusIcon = (status: ServiceStatus) => {
  return SERVICE_STATUS_ICONS[status];
};

export const INCIDENT_STATUS = {
  INVESTIGATING: "investigating",
  IDENTIFIED: "identified",
  MONITORING: "monitoring",
  RESOLVED: "resolved",
};

export type IncidentStatus =
  (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

export const INCIDENT_STATUS_LABELS = {
  [INCIDENT_STATUS.INVESTIGATING]: "Investigating",
  [INCIDENT_STATUS.IDENTIFIED]: "Identified",
  [INCIDENT_STATUS.MONITORING]: "Monitoring",
  [INCIDENT_STATUS.RESOLVED]: "Resolved",
};

export const INCIDENT_STATUS_ICONS = {
  [INCIDENT_STATUS.INVESTIGATING]: AlertTriangle,
  [INCIDENT_STATUS.IDENTIFIED]: AlertCircle,
  [INCIDENT_STATUS.MONITORING]: Clock,
  [INCIDENT_STATUS.RESOLVED]: CheckCircle,
};

export const getIncidentStatusIcon = (status: IncidentStatus) => {
  return INCIDENT_STATUS_ICONS[status];
};

export const INCIDENT_STATUS_COLORS = {
  [INCIDENT_STATUS.INVESTIGATING]: "text-yellow-500",
  [INCIDENT_STATUS.IDENTIFIED]: "text-red-500",
  [INCIDENT_STATUS.MONITORING]: "text-blue-500",
  [INCIDENT_STATUS.RESOLVED]: "text-green-500",
};

export const INCIDENT_STATUS_BACKGROUND_COLORS = {
  [INCIDENT_STATUS.INVESTIGATING]: "bg-yellow-100",
  [INCIDENT_STATUS.IDENTIFIED]: "bg-red-100",
  [INCIDENT_STATUS.MONITORING]: "bg-blue-100",
  [INCIDENT_STATUS.RESOLVED]: "bg-green-100",
};

export const INCIDENT_IMPACT = {
  NONE: "none",
  MINOR: "minor",
  MAJOR: "major",
  CRITICAL: "critical",
};

export type IncidentImpact =
  (typeof INCIDENT_IMPACT)[keyof typeof INCIDENT_IMPACT];

export const INCIDENT_IMPACT_LABELS = {
  [INCIDENT_IMPACT.NONE]: "None",
  [INCIDENT_IMPACT.MINOR]: "Minor",
  [INCIDENT_IMPACT.MAJOR]: "Major",
  [INCIDENT_IMPACT.CRITICAL]: "Critical",
};

export const MAINTENANCE_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  [MAINTENANCE_STATUS.SCHEDULED]: "Scheduled",
  [MAINTENANCE_STATUS.IN_PROGRESS]: "In Progress",
  [MAINTENANCE_STATUS.COMPLETED]: "Completed",
};

export const MAINTENANCE_IMPACT = {
  NONE: "none",
  MINOR: "minor",
  MAJOR: "major",
  CRITICAL: "critical",
} as const;

export const MAINTENANCE_IMPACT_LABELS: Record<MaintenanceImpact, string> = {
  [MAINTENANCE_IMPACT.NONE]: "None",
  [MAINTENANCE_IMPACT.MINOR]: "Minor",
  [MAINTENANCE_IMPACT.MAJOR]: "Major",
  [MAINTENANCE_IMPACT.CRITICAL]: "Critical",
};

export type MaintenanceStatus =
  (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];
export type MaintenanceImpact =
  (typeof MAINTENANCE_IMPACT)[keyof typeof MAINTENANCE_IMPACT];
