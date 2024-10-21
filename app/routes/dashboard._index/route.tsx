import { LoaderFunctionArgs, json, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Database } from "~/types/supabase";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SERVICE_STATUS_LABELS } from "~/lib/constants";
import { metaGenerator } from "~/utils/metaGenerator";

type Service = Database["public"]["Tables"]["services"]["Row"];
type Incident = Database["public"]["Tables"]["incidents"]["Row"];
type Maintenance =
  Database["public"]["Tables"]["scheduled_maintenances"]["Row"];

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Dashboard Overview",
    description:
      "Get an overview of your services, incidents, and scheduled maintenance.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase } = createServerSupabase(request, env);

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("name");

  const { data: activeIncidents } = await supabase
    .from("incidents")
    .select("*")
    .neq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentIncidents } = await supabase
    .from("incidents")
    .select("*")
    .eq("status", "resolved")
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data: upcomingMaintenances } = await supabase
    .from("scheduled_maintenances")
    .select("*")
    .gt("start_time", new Date().toISOString())
    .order("start_time")
    .limit(5);

  return json({
    services,
    activeIncidents,
    recentIncidents,
    upcomingMaintenances,
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

export default function DashboardIndex() {
  const { services, activeIncidents, recentIncidents, upcomingMaintenances } =
    useLoaderData<typeof loader>();

  const allOperational = services?.every(
    (service) => service.current_status === "operational"
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Overview of your services and incidents.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {allOperational ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <span className="text-xl font-medium">
                {allOperational
                  ? "All Systems Operational"
                  : "Some Systems Degraded"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {activeIncidents && activeIncidents.length > 0 ? (
              <ul className="space-y-2">
                {activeIncidents.map((incident: Incident) => (
                  <li key={incident.id} className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span>{incident.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active incidents</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMaintenances && upcomingMaintenances.length > 0 ? (
              <ul className="space-y-2">
                {upcomingMaintenances.map((maintenance: Maintenance) => (
                  <li
                    key={maintenance.id}
                    className="flex items-center space-x-2"
                  >
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span>{maintenance.title}</span>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(maintenance.start_time))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming maintenance</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {services?.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between"
                >
                  <span>{service.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {SERVICE_STATUS_LABELS[service.current_status]}
                    </span>
                    {getStatusIcon(service.current_status)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents && recentIncidents.length > 0 ? (
              <ul className="space-y-2">
                {recentIncidents.map((incident: Incident) => (
                  <li key={incident.id} className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{incident.title}</span>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(incident.updated_at))} ago
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent incidents</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
        <Button asChild variant="outline">
          <Link prefetch="intent" to="/dashboard/services">
            Manage Services
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link prefetch="intent" to="/dashboard/maintenance/new">
            Schedule Maintenance
          </Link>
        </Button>
        <Button asChild>
          <Link prefetch="intent" to="/dashboard/incidents/new">
            Report New Incident
          </Link>
        </Button>
      </div>
    </div>
  );
}
