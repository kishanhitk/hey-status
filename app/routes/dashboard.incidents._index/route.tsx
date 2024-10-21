import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useQuery } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  INCIDENT_IMPACT_LABELS,
  INCIDENT_STATUS_LABELS,
  IncidentImpact,
  IncidentStatus,
} from "~/lib/constants";
import { Loader2 } from "lucide-react";
import { formatLocalDateTime } from "~/utils/dateTime";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Incidents",
    description: "View and manage incidents affecting your services.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: incidents, error: incidentsError } = await supabase.from(
    "incidents"
  ).select(`
      *,
      services_incidents(service_id)
    `);

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name");

  if (incidentsError || servicesError) {
    throw new Error("Failed to fetch data");
  }

  const formattedIncidents = incidents.map((incident) => ({
    ...incident,
    serviceIds: incident.services_incidents.map((si) => si.service_id),
  }));

  return json({ initialIncidents: formattedIncidents, services });
}

export default function Incidents() {
  const { initialIncidents, services } = useLoaderData<typeof loader>();
  const supabase = useSupabase();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          `
          *,
          services_incidents(service_id),
          incident_updates(id, status, created_at)
        `
        )
        .order("created_at", { ascending: false })
        .order("created_at", {
          ascending: false,
          referencedTable: "incident_updates",
        });
      if (error) throw error;
      return data.map((incident) => ({
        ...incident,
        serviceIds: incident.services_incidents.map((si) => si.service_id),
        currentStatus: incident.incident_updates[0]?.status || "No status",
        lastUpdateTime:
          incident.incident_updates[0]?.created_at || incident.created_at,
      }));
    },
    initialData: initialIncidents,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Incidents</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Manage and track all incidents affecting your services.
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0">
          <Link to="/dashboard/incidents/new">Add New Incident</Link>
        </Button>
      </div>

      {incidents && incidents.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Affected Services</TableHead>
                <TableHead>Created On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident: any) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <Link
                      to={`/dashboard/incidents/${incident.id}`}
                      className="underline"
                      prefetch="intent"
                    >
                      {incident.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      {
                        INCIDENT_STATUS_LABELS[
                          incident.currentStatus as IncidentStatus
                        ]
                      }
                      <div className="text-sm text-gray-500">
                        Updated: {formatLocalDateTime(incident.lastUpdateTime)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {INCIDENT_IMPACT_LABELS[incident.impact as IncidentImpact]}
                  </TableCell>
                  <TableCell>
                    {incident.serviceIds
                      .map(
                        (serviceId) =>
                          services.find((s) => s.id === serviceId)?.name
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    {formatLocalDateTime(incident.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-lg mx-auto w-full">
          <h3 className="mt-2 text-lg font-semibold text-gray-900">
            No incidents yet
          </h3>
          <div className="mt-3">
            <Button asChild>
              <Link to="/dashboard/incidents/new">Add New Incident</Link>
            </Button>
          </div>
          <div className="mt-4 text-sm text-muted-foreground max-w-xs mx-auto">
            <p>
              Create incidents to track and communicate issues affecting your
              services.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
