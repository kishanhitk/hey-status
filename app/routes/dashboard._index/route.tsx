import { LoaderFunctionArgs, json, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Database } from "~/types/supabase";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  PlusCircle,
  WrenchIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentIncidents } = await supabase
    .from("incidents")
    .select("*")
    .not("resolved_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(5);

  const now = new Date().toISOString();
  const { data: ongoingMaintenances } = await supabase
    .from("scheduled_maintenances")
    .select("*")
    .lte("start_time", now)
    .gt("end_time", now)
    .order("start_time")
    .limit(5);

  const { data: upcomingMaintenances } = await supabase
    .from("scheduled_maintenances")
    .select("*")
    .gt("start_time", now)
    .order("start_time")
    .limit(5);

  return json({
    services,
    activeIncidents,
    recentIncidents,
    ongoingMaintenances,
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
  const {
    services,
    activeIncidents,
    recentIncidents,
    ongoingMaintenances,
    upcomingMaintenances,
  } = useLoaderData<typeof loader>();

  const allOperational = services?.every(
    (service) => service.current_status === "operational"
  );

  const hasActiveIncidents = activeIncidents && activeIncidents.length > 0;
  const hasOngoingMaintenance =
    ongoingMaintenances && ongoingMaintenances.length > 0;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Home</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Overview of your services and incidents.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            {services && services.length > 0 ? (
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  {allOperational && !hasActiveIncidents ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  )}
                  <span className="text-xl font-medium">
                    {allOperational && !hasActiveIncidents
                      ? "All Systems Operational"
                      : "Some Systems Affected"}
                  </span>
                </div>
                {(!allOperational ||
                  hasActiveIncidents ||
                  hasOngoingMaintenance) && (
                  <span className="text-sm text-gray-500 mt-1 ml-10">
                    {hasActiveIncidents
                      ? "Due to active incident"
                      : !allOperational
                      ? "Due to service issue"
                      : hasOngoingMaintenance
                      ? "Maintenance in progress (may affect some systems)"
                      : ""}
                  </span>
                )}
              </div>
            ) : (
              <p>No services added yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {hasActiveIncidents ? (
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
            <CardTitle>Ongoing Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            {hasOngoingMaintenance ? (
              <ul className="space-y-2">
                {ongoingMaintenances.map((maintenance: Maintenance) => (
                  <li key={maintenance.id} className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <WrenchIcon className="h-5 w-5 text-blue-500" />
                      <span>{maintenance.title}</span>
                    </div>
                    <div className="text-sm text-gray-500 ml-7">
                      Ends{" "}
                      {format(new Date(maintenance.end_time), "MMM d, HH:mm")} (
                      {formatDistanceToNow(new Date(maintenance.end_time), {
                        addSuffix: true,
                      })}
                      )
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No ongoing maintenance</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Service Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {services && services.length > 0 ? (
              <ul className="space-y-2">
                {services.map((service) => (
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
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">No services added yet.</p>
                <Button asChild variant="default">
                  <Link to="/dashboard/services">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Service
                  </Link>
                </Button>
              </div>
            )}
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

      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link prefetch="intent" to="/dashboard/services">
            Manage Services
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link prefetch="intent" to="/dashboard/maintenance/new">
            Schedule Maintenance
          </Link>
        </Button>
        <Button asChild className="w-full sm:w-auto">
          <Link prefetch="intent" to="/dashboard/incidents/new">
            Report New Incident
          </Link>
        </Button>
      </div>
    </div>
  );
}
