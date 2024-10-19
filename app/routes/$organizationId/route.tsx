import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

type Service = {
  id: string;
  name: string;
  description: string | null;
  current_status:
    | "operational"
    | "degraded_performance"
    | "partial_outage"
    | "major_outage";
};

type IncidentStatus =
  | "resolved"
  | "investigating"
  | "identified"
  | "monitoring";

const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  resolved: "Resolved",
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
};

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { organizationId } = params;
  const { supabase } = createServerSupabase(request, context.cloudflare.env);

  // Fetch organization
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", organizationId)
    .single();

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch services
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organization.id);

  // Fetch active incidents
  const { data: activeIncidents, error: activeIncidentsError } = await supabase
    .from("incidents")
    .select(
      `
      *,
      services_incidents(service:services(*)),
      incident_updates(id, status, message, created_at)
    `
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .order("created_at", {
      ascending: false,
      foreignTable: "incident_updates",
    });

  if (activeIncidentsError) {
    console.error(activeIncidentsError);
  }
  // Fetch resolved incidents (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: resolvedIncidents } = await supabase
    .from("incidents")
    .select(
      `
      *,
      services_incidents(service:services(*)),
      incident_updates(id, status, message, created_at)
    `
    )
    .eq("organization_id", organization.id)
    .eq("status", "resolved")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .order("created_at", {
      ascending: false,
      foreignTable: "incident_updates",
    });

  // Calculate uptime (last 30 days)
  const { data: uptimeLogs } = await supabase
    .from("uptime_daily_logs")
    .select("service_id, uptime_percentage")
    .eq("organization_id", organization.id)
    .gte("date", thirtyDaysAgo.toISOString());

  const uptime =
    uptimeLogs?.reduce((acc, log) => {
      if (!acc[log.service_id]) {
        acc[log.service_id] = [];
      }
      acc[log.service_id].push(log.uptime_percentage);
      return acc;
    }, {} as Record<string, number[]>) || {};

  const averageUptime = Object.keys(uptime).reduce((acc, serviceId) => {
    acc[serviceId] =
      uptime[serviceId].reduce((sum, val) => sum + val, 0) /
      uptime[serviceId].length;
    return acc;
  }, {} as Record<string, number>);

  // Fetch scheduled maintenances
  const { data: scheduledMaintenances } = await supabase
    .from("scheduled_maintenances")
    .select(
      `
      *,
      services_scheduled_maintenances(service:services(*))
    `
    )
    .eq("organization_id", organization.id)
    .gte("scheduled_end_time", new Date().toISOString())
    .order("scheduled_start_time", { ascending: true });

  console.log({ activeIncidents });
  return json({
    organization,
    services: services || [],
    activeIncidents: activeIncidents || [],
    resolvedIncidents: resolvedIncidents || [],
    uptime: averageUptime,
    scheduledMaintenances: scheduledMaintenances || [],
  });
}

function getStatusIcon(status: Service["current_status"]) {
  switch (status) {
    case "operational":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "degraded_performance":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "partial_outage":
    case "major_outage":
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatUTCDate(dateString: string) {
  return format(new Date(dateString), "MMM d, HH:mm 'UTC'");
}

function getIncidentStatusColor(status: IncidentStatus): string {
  switch (status) {
    case "resolved":
      return "text-green-600";
    case "investigating":
      return "text-red-600";
    case "identified":
      return "text-orange-600";
    case "monitoring":
      return "text-blue-600";
    default:
      return "text-gray-600";
  }
}

export default function PublicStatusPage() {
  const {
    organization,
    services,
    activeIncidents,
    resolvedIncidents,
    scheduledMaintenances,
  } = useLoaderData<typeof loader>();

  if (!organization) {
    return <div>Organization not found</div>;
  }

  const allOperational = services.every(
    (service) => service.current_status === "operational"
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="h-8 w-8 text-blue-500"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            <span className="ml-2 text-xl font-bold text-gray-900">
              {organization.name} Status
            </span>
          </div>
          <nav className="flex space-x-4">
            <Link className="text-gray-500 hover:text-gray-900" to="#">
              Home
            </Link>
            <Link className="text-gray-500 hover:text-gray-900" to="#">
              History
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Current Status
            </h2>
            <div className="flex items-center">
              {allOperational ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <span className="ml-2 text-xl font-medium text-gray-900">
                {allOperational
                  ? "All systems operational"
                  : "Some systems are experiencing issues"}
              </span>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Components
            </h2>
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <span className="text-lg text-gray-900">{service.name}</span>
                  <div className="flex items-center">
                    {getStatusIcon(service.current_status)}
                    <span className="ml-2 text-sm capitalize">
                      {service.current_status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {scheduledMaintenances.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Scheduled Maintenance
              </h2>
              <div className="space-y-6">
                {scheduledMaintenances.map((maintenance) => (
                  <div key={maintenance.id}>
                    <div className="flex items-center mb-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="ml-2 text-lg font-medium text-gray-900">
                        {maintenance.title}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-1">
                      Status:{" "}
                      {maintenance.status.charAt(0).toUpperCase() +
                        maintenance.status.slice(1)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Scheduled: {formatDate(maintenance.scheduled_start_time)}{" "}
                      - {formatDate(maintenance.scheduled_end_time)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Incident History
            </h2>
            <div className="space-y-8">
              {[...activeIncidents, ...resolvedIncidents].map((incident) => (
                <div key={incident.id} className="border-b pb-6">
                  <h3
                    className={`text-xl font-semibold mb-2 ${getIncidentStatusColor(
                      incident.incident_updates[0]?.status as IncidentStatus
                    )}`}
                  >
                    {incident.title}
                  </h3>
                  <div className="space-y-4">
                    {incident.incident_updates
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime()
                      )
                      .map((update) => (
                        <div key={update.id}>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">
                              {
                                INCIDENT_STATUS_LABELS[
                                  update.status as IncidentStatus
                                ]
                              }
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatUTCDate(update.created_at)}
                          </div>
                          <p className="text-gray-700">{update.message}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-gray-500">
            © 2023 {organization.name}. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <Link
              className="text-gray-500 hover:text-gray-900 flex items-center"
              to="#"
            >
              Status RSS <ExternalLink className="ml-1 h-4 w-4" />
            </Link>
            <Link className="text-gray-500 hover:text-gray-900" to="#">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
