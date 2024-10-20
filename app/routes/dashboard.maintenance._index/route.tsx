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

import { Database } from "~/types/supabase";
import {
  MAINTENANCE_IMPACT_LABELS,
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_LABELS,
  MaintenanceImpact,
} from "~/lib/constants";
import { formatLocalDateTime } from "~/utils/dateTime";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Scheduled Maintenance",
    description: "View and manage scheduled maintenance for your services.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: maintenances, error: maintenancesError } = await supabase
    .from("scheduled_maintenances")
    .select(
      `
      *,
      services_scheduled_maintenances(services(id, name))
    `
    )
    .order("start_time", { ascending: true });

  if (maintenancesError) {
    console.error(maintenancesError);
    throw new Error("Failed to fetch data");
  }

  return json({ initialMaintenances: maintenances });
}

export default function Maintenance() {
  const { initialMaintenances } = useLoaderData<typeof loader>();
  const supabase = useSupabase();

  const { data: maintenances } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_maintenances")
        .select(
          `
          *,
          services_scheduled_maintenances(services(id, name))
        `
        )
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    initialData: initialMaintenances,
    staleTime: 10,
  });

  const getMaintenanceStatus = (
    maintenance: Database["public"]["Tables"]["scheduled_maintenances"]["Row"]
  ) => {
    const now = new Date();
    const startTime = maintenance.start_time
      ? new Date(maintenance.start_time)
      : null;
    const endTime = maintenance.end_time
      ? new Date(maintenance.end_time)
      : null;

    if (!startTime || now < startTime) {
      return MAINTENANCE_STATUS_LABELS[MAINTENANCE_STATUS.SCHEDULED];
    } else if (startTime && (!endTime || now < endTime)) {
      return MAINTENANCE_STATUS_LABELS[MAINTENANCE_STATUS.IN_PROGRESS];
    } else {
      return MAINTENANCE_STATUS_LABELS[MAINTENANCE_STATUS.COMPLETED];
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Manage and track all scheduled maintenance for your services.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/maintenance/new">Schedule New Maintenance</Link>
        </Button>
      </div>

      {maintenances && maintenances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Affected Services</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenances?.map((maintenance) => (
              <TableRow key={maintenance.id}>
                <TableCell className="underline font-semibold">
                  <Link
                    to={`/dashboard/maintenance/${maintenance.id}`}
                    prefetch="intent"
                  >
                    {maintenance.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {getMaintenanceStatus(maintenance)}
                  <p className="text-xs text-muted-foreground">
                    Updated: {formatLocalDateTime(maintenance.updated_at)}
                  </p>
                </TableCell>
                <TableCell>
                  {formatLocalDateTime(maintenance.start_time)}
                </TableCell>
                <TableCell>
                  {formatLocalDateTime(maintenance.end_time)}
                </TableCell>
                <TableCell>
                  {
                    MAINTENANCE_IMPACT_LABELS[
                      maintenance.impact as MaintenanceImpact
                    ]
                  }
                </TableCell>
                <TableCell>
                  {maintenance.services_scheduled_maintenances
                    .map((ssm) => ssm.services?.name)
                    ?.join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-lg mx-auto w-full">
          <h3 className="mt-2 text-lg font-semibold text-gray-900">
            No scheduled maintenance yet
          </h3>
          <div className="mt-3">
            <Button asChild>
              <Link to="/dashboard/maintenance/new">
                Schedule New Maintenance
              </Link>
            </Button>
          </div>
          <div className="mt-4 text-sm text-muted-foreground max-w-xs mx-auto">
            <p>
              Schedule maintenance to inform users about planned downtime or
              service interruptions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
