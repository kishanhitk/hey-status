import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";

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

type Incident = {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  impact: "none" | "minor" | "major" | "critical";
  created_at: string;
  updated_at: string;
  services_incidents: { service: Service }[];
};

type StatusPageData = {
  organization: { name: string; slug: string } | null;
  services: Service[];
  activeIncidents: Incident[];
  resolvedIncidents: Incident[];
  uptime: { [key: string]: number };
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
  const { data: activeIncidents } = await supabase
    .from("incidents")
    .select(
      `
      *,
      services_incidents(service:services(*))
    `
    )
    .eq("organization_id", organization.id)
    .neq("status", "resolved")
    .order("created_at", { ascending: false });

  // Fetch resolved incidents (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: resolvedIncidents } = await supabase
    .from("incidents")
    .select(
      `
      *,
      services_incidents(service:services(*))
    `
    )
    .eq("organization_id", organization.id)
    .eq("status", "resolved")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

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

  return json<StatusPageData>({
    organization,
    services: services || [],
    activeIncidents: activeIncidents || [],
    resolvedIncidents: resolvedIncidents || [],
    uptime: averageUptime,
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

export default function PublicStatusPage() {
  const { organization, services, activeIncidents, resolvedIncidents } =
    useLoaderData<StatusPageData>();

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
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Recent Incidents
            </h2>
            <div className="space-y-6">
              {[...activeIncidents, ...resolvedIncidents]
                .slice(0, 5)
                .map((incident) => (
                  <div key={incident.id}>
                    <div className="flex items-center mb-2">
                      {incident.status === "resolved" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <span className="ml-2 text-lg font-medium text-gray-900">
                        {incident.title}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-1">
                      Status:{" "}
                      {incident.status.charAt(0).toUpperCase() +
                        incident.status.slice(1)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {incident.status === "resolved" ? "Resolved" : "Updated"}{" "}
                      - {formatDate(incident.updated_at)}
                    </p>
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
