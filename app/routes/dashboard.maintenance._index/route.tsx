import { useState } from "react";
import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { toast } from "~/hooks/use-toast";
import { useUser } from "~/hooks/useUser";
import { Edit2 } from "lucide-react";

type Maintenance = {
  id: string;
  title: string;
  description: string;
  status: "scheduled" | "in_progress" | "completed";
  scheduled_start_time: string;
  scheduled_end_time: string;
  serviceIds: string[];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: maintenances, error: maintenancesError } = await supabase.from(
    "scheduled_maintenances"
  ).select(`
      *,
      services_scheduled_maintenances(service_id)
    `);

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name");

  if (maintenancesError || servicesError) {
    throw new Error("Failed to fetch data");
  }

  const formattedMaintenances = maintenances.map((maintenance) => ({
    ...maintenance,
    serviceIds: maintenance.services_scheduled_maintenances.map(
      (ssm) => ssm.service_id
    ),
  }));

  return json({ initialMaintenances: formattedMaintenances, services });
}

export default function Maintenance() {
  const { initialMaintenances, services } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: maintenances } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scheduled_maintenances")
        .select(`
          *,
          services_scheduled_maintenances(service_id)
        `);
      if (error) throw error;
      return data.map((maintenance) => ({
        ...maintenance,
        serviceIds: maintenance.services_scheduled_maintenances.map(
          (ssm) => ssm.service_id
        ),
      }));
    },
    initialData: initialMaintenances,
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      // Delete associated services_scheduled_maintenances records
      await supabase
        .from("services_scheduled_maintenances")
        .delete()
        .eq("scheduled_maintenance_id", id);

      // Delete the maintenance
      const { error } = await supabase
        .from("scheduled_maintenances")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      toast({ title: "Maintenance deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this maintenance?")) {
      deleteMaintenance.mutate(id);
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
              <TableHead>Affected Services</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenances?.map((maintenance: Maintenance) => (
              <TableRow key={maintenance.id}>
                <TableCell className="underline">
                  <Link
                    to={`/dashboard/maintenance/${maintenance.id}`}
                    prefetch="intent"
                  >
                    {maintenance.title}
                  </Link>
                </TableCell>
                <TableCell>{maintenance.status}</TableCell>
                <TableCell>
                  {new Date(maintenance.scheduled_start_time).toLocaleString()}
                </TableCell>
                <TableCell>
                  {new Date(maintenance.scheduled_end_time).toLocaleString()}
                </TableCell>
                <TableCell>
                  {maintenance.serviceIds
                    .map(
                      (serviceId) =>
                        services.find((s) => s.id === serviceId)?.name
                    )
                    .join(", ")}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="mr-2" asChild>
                    <Link to={`/dashboard/maintenance/${maintenance.id}`}>
                      <Edit2 />
                    </Link>
                  </Button>
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
