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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { toast } from "~/hooks/use-toast";
import { IncidentForm } from "~/routes/dashboard.incidents/IncidentForm";
import { useUser } from "~/hooks/useUser";
import { formatDistanceToNow, format } from "date-fns";
import { INCIDENT_IMPACT_LABELS, INCIDENT_STATUS_LABELS } from "~/lib/contants";

type Incident = {
  id: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  impact: "none" | "minor" | "major" | "critical";
  serviceIds: string[];
};

type Service = {
  id: string;
  name: string;
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
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const { user } = useUser();

  const { data: incidents } = useQuery({
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
        .order("created_at", { ascending: false });
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

  const createIncidentMutation = useMutation({
    mutationFn: async (newIncident: Omit<Incident, "id">) => {
      const { data, error } = await supabase
        .from("incidents")
        .insert({
          title: newIncident.title,
          description: newIncident.description,
          status: newIncident.status,
          impact: newIncident.impact,
          organization_id: user?.profile?.organization_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (newIncident.serviceIds && newIncident.serviceIds.length > 0) {
        const { error: linkError } = await supabase
          .from("services_incidents")
          .insert(
            newIncident.serviceIds.map((serviceId) => ({
              incident_id: data.id,
              service_id: serviceId,
            }))
          );

        if (linkError) throw linkError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Incident created successfully" });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async (updatedIncident: Incident) => {
      const { data, error } = await supabase
        .from("incidents")
        .update({
          title: updatedIncident.title,
          description: updatedIncident.description,
          status: updatedIncident.status,
          impact: updatedIncident.impact,
        })
        .eq("id", updatedIncident.id)
        .select()
        .single();

      if (error) throw error;

      // Remove existing service links
      await supabase
        .from("services_incidents")
        .delete()
        .eq("incident_id", updatedIncident.id);

      // Add new service links
      if (updatedIncident.serviceIds && updatedIncident.serviceIds.length > 0) {
        const { error: linkError } = await supabase
          .from("services_incidents")
          .insert(
            updatedIncident.serviceIds.map((serviceId) => ({
              incident_id: updatedIncident.id,
              service_id: serviceId,
            }))
          );

        if (linkError) throw linkError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Incident updated successfully" });
      setEditingIncident(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete associated services_incidents records
      await supabase.from("services_incidents").delete().eq("incident_id", id);

      // Delete the incident
      const { error } = await supabase.from("incidents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Incident deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: Omit<Incident, "id">) => {
    if (editingIncident) {
      updateIncidentMutation.mutate({ ...data, id: editingIncident.id });
    } else {
      createIncidentMutation.mutate(data);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Incidents</h1>
        <Button asChild>
          <Link to="/dashboard/incidents/new">Add New Incident</Link>
        </Button>
      </div>

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
          {incidents?.map((incident: any) => (
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
                  {INCIDENT_STATUS_LABELS[incident.currentStatus]}
                  <div className="text-sm text-gray-500">
                    Last update:{" "}
                    {incident.lastUpdateTime
                      ? formatDistanceToNow(new Date(incident.lastUpdateTime), {
                          addSuffix: true,
                        })
                      : "N/A"}
                  </div>
                </div>
              </TableCell>
              <TableCell>{INCIDENT_IMPACT_LABELS[incident.impact]}</TableCell>
              <TableCell>
                {incident.serviceIds
                  .map(
                    (serviceId) =>
                      services.find((s) => s.id === serviceId)?.name
                  )
                  .join(", ")}
              </TableCell>
              <TableCell>
                {incident.created_at
                  ? format(new Date(incident.created_at), "MMM d, yyyy HH:mm")
                  : "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={!!editingIncident}
        onOpenChange={(open) => !open && setEditingIncident(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
          </DialogHeader>
          {editingIncident && (
            <IncidentForm
              initialData={editingIncident}
              onSubmit={handleSubmit}
              isSubmitting={updateIncidentMutation.isPending}
              services={services}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
