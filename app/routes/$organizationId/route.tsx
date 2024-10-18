import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";

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

function getStatusColor(status: Service["current_status"]) {
  switch (status) {
    case "operational":
      return "bg-green-500";
    case "degraded_performance":
      return "bg-yellow-500";
    case "partial_outage":
      return "bg-orange-500";
    case "major_outage":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

export default function PublicStatusPage() {
  const { organization, services, activeIncidents, resolvedIncidents, uptime } =
    useLoaderData<StatusPageData>();

  if (!organization) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{organization.name} Status</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <Badge
                  className={`${getStatusColor(
                    service.current_status
                  )} text-white`}
                >
                  {service.current_status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeIncidents.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className="mb-4 p-4 bg-white rounded-lg shadow"
              >
                <h3 className="font-semibold">{incident.title}</h3>
                <p className="text-sm text-gray-500">
                  Status: {incident.status}
                </p>
                <p className="text-sm text-gray-500">
                  Impact: {incident.impact}
                </p>
                <p className="text-sm text-gray-500">
                  Started: {formatDate(incident.created_at)}
                </p>
                <p className="text-sm text-gray-500">
                  Affected Services:{" "}
                  {incident.services_incidents
                    .map((si) => si.service.name)
                    .join(", ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Uptime (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {services.map((service) => (
            <div key={service.id} className="mb-4">
              <div className="flex justify-between mb-1">
                <span>{service.name}</span>
                <span>{(uptime[service.id] || 0).toFixed(2)}%</span>
              </div>
              <Progress value={uptime[service.id] || 0} className="w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedIncidents.map((incident) => (
            <div
              key={incident.id}
              className="mb-4 p-4 bg-white rounded-lg shadow"
            >
              <h3 className="font-semibold">{incident.title}</h3>
              <p className="text-sm text-gray-500">Status: {incident.status}</p>
              <p className="text-sm text-gray-500">Impact: {incident.impact}</p>
              <p className="text-sm text-gray-500">
                Resolved: {formatDate(incident.updated_at)}
              </p>
              <p className="text-sm text-gray-500">
                Affected Services:{" "}
                {incident.services_incidents
                  .map((si) => si.service.name)
                  .join(", ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
