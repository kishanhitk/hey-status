import { useState } from "react";
import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useParams, useNavigate } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { toast } from "~/hooks/use-toast";
import { useUser } from "~/hooks/useUser";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import {
  INCIDENT_IMPACT,
  INCIDENT_STATUS,
  INCIDENT_STATUS_LABELS,
  IncidentStatus,
  SERVICE_STATUS,
} from "~/lib/contants";
import { Checkbox } from "~/components/ui/checkbox";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { incidentId } = params;

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select(
      `
      *,
      services_incidents(service_id),
      incident_updates(*)
    `
    )
    .eq("id", incidentId)
    .single();

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name");

  if (incidentError || servicesError) {
    throw new Error("Failed to fetch data");
  }

  return json({ incident, services });
}

const incidentSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  description: z.string().optional(),
  impact: z.enum(["none", "minor", "major", "critical"]),
  serviceIds: z.array(z.string()),
});

const updateSchema = z.object({
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  message: z.string().min(1, "Message is required"),
  updateServiceStatus: z.boolean().default(false),
});

// Add this function to determine the service status based on incident status and impact
function getServiceStatus(incidentStatus: string, incidentImpact: string) {
  if (incidentStatus === INCIDENT_STATUS.RESOLVED) {
    return "operational";
  }

  switch (incidentImpact) {
    case INCIDENT_IMPACT.CRITICAL:
      return SERVICE_STATUS.MAJOR_OUTAGE;
    case INCIDENT_IMPACT.MAJOR:
      return SERVICE_STATUS.PARTIAL_OUTAGE;
    case INCIDENT_IMPACT.MINOR:
      return SERVICE_STATUS.DEGRADED_PERFORMANCE;
    default:
      return SERVICE_STATUS.OPERATIONAL;
  }
}

export default function IncidentDetails() {
  const { incident, services } = useLoaderData<typeof loader>();
  const { incidentId } = useParams();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  const {
    data: incidentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          `
          *,
          services_incidents(service_id),
          incident_updates(*)
        `
        )
        .eq("id", incidentId)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: incident,
  });

  const incidentForm = useForm({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: incidentData?.title || "",
      description: incidentData?.description || "",
      impact: incidentData?.impact || "none",
      serviceIds:
        incidentData?.services_incidents?.map((si) => si.service_id) || [],
    },
  });

  const updateForm = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      status: "investigating",
      message: "",
      updateServiceStatus: false,
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof incidentSchema>) => {
      const { data, error } = await supabase
        .from("incidents")
        .update({
          title: values.title,
          description: values.description,
          impact: values.impact,
        })
        .eq("id", incidentId)
        .select()
        .single();

      if (error) throw error;

      // Update services
      await supabase
        .from("services_incidents")
        .delete()
        .eq("incident_id", incidentId);

      if (values.serviceIds.length > 0) {
        await supabase.from("services_incidents").insert(
          values.serviceIds.map((serviceId) => ({
            incident_id: incidentId,
            service_id: serviceId,
          }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      toast({ title: "Incident updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof updateSchema>) => {
      const { data, error } = await supabase
        .from("incident_updates")
        .insert({
          incident_id: incidentId,
          status: values.status,
          message: values.message,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (values.updateServiceStatus) {
        const newServiceStatus = getServiceStatus(
          values.status,
          incidentData.impact
        );
        const { error: serviceUpdateError } = await supabase
          .from("services")
          .update({ current_status: newServiceStatus })
          .in(
            "id",
            incidentData.services_incidents.map((si) => si.service_id)
          );

        if (serviceUpdateError) throw serviceUpdateError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      toast({ title: "Update added successfully" });
      updateForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIncidentMutation = useMutation({
    mutationFn: async () => {
      // Delete associated services_incidents records
      await supabase
        .from("services_incidents")
        .delete()
        .eq("incident_id", incidentId);

      // Delete associated incident_updates
      await supabase
        .from("incident_updates")
        .delete()
        .eq("incident_id", incidentId);

      // Delete the incident
      const { error } = await supabase
        .from("incidents")
        .delete()
        .eq("id", incidentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Incident deleted successfully" });
      navigate("/dashboard/incidents");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteIncidentMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleIncidentSubmit = (values: z.infer<typeof incidentSchema>) => {
    updateIncidentMutation.mutate(values);
  };

  const handleUpdateSubmit = (values: z.infer<typeof updateSchema>) => {
    addUpdateMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load incident details. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Incident Details</h1>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Are you sure you want to delete this incident?
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the
                incident and all associated updates.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteIncidentMutation.isPending}
              >
                {deleteIncidentMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex">
        <div className="w-full">
          <Form {...incidentForm}>
            <form
              onSubmit={incidentForm.handleSubmit(handleIncidentSubmit)}
              className="space-y-4"
            >
              <FormField
                control={incidentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={incidentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={incidentForm.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact</FormLabel>
                    <FormControl>
                      <div className="flex space-x-4">
                        {[
                          { value: "none", label: "None" },
                          { value: "minor", label: "Minor" },
                          { value: "major", label: "Major" },
                          { value: "critical", label: "Critical" },
                        ].map((impact) => (
                          <label
                            key={impact.value}
                            className="flex items-center"
                          >
                            <input
                              type="radio"
                              {...field}
                              value={impact.value}
                              checked={field.value === impact.value}
                              className="sr-only"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => field.onChange(impact.value)}
                              className={`border-gray-300 text-gray-500 rounded-2xl px-7 ${
                                field.value === impact.value
                                  ? "border-black text-black"
                                  : ""
                              }`}
                            >
                              {impact.label}
                            </Button>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={incidentForm.control}
                name="serviceIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Services</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) =>
                          field.onChange([...field.value, value])
                        }
                        value={field.value[field.value.length - 1]}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select services" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Selected services:{" "}
                      {field.value
                        .map((id) => services.find((s) => s.id === id)?.name)
                        .join(", ")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updateIncidentMutation.isPending}>
                {updateIncidentMutation.isPending
                  ? "Updating..."
                  : "Update Incident"}
              </Button>
            </form>
          </Form>

          <Separator className="my-8" />

          <h2 className="text-2xl font-bold mb-4">Status Updates</h2>

          {incidentData?.incident_updates
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .map((update) => (
              <div key={update.id} className="mb-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold">
                  {INCIDENT_STATUS_LABELS[update.status as IncidentStatus]}
                </h3>
                <p className="text-sm text-gray-500 mb-2">
                  {formatDistanceToNow(new Date(update.created_at))} ago
                </p>
                <p>{update.message}</p>
              </div>
            ))}

          <Separator className="my-8" />

          <h2 className="text-2xl font-bold mb-4">Add Update</h2>
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <div className="flex space-x-4">
                        {[
                          {
                            value: "investigating",
                            label: "Investigating",
                            icon: AlertCircle,
                          },
                          {
                            value: "identified",
                            label: "Identified",
                            icon: AlertTriangle,
                          },
                          {
                            value: "monitoring",
                            label: "Monitoring",
                            icon: Clock,
                          },
                          {
                            value: "resolved",
                            label: "Resolved",
                            icon: CheckCircle,
                          },
                        ].map((status) => (
                          <label
                            key={status.value}
                            className="flex items-center"
                          >
                            <input
                              type="radio"
                              {...field}
                              value={status.value}
                              checked={field.value === status.value}
                              className="sr-only"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => field.onChange(status.value)}
                              className={`flex items-center space-x-2 border-gray-300 text-gray-500 ${
                                field.value === status.value
                                  ? "border-black text-black"
                                  : ""
                              }`}
                            >
                              <status.icon className="w-4 h-4" />
                              <span>{status.label}</span>
                            </Button>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter update message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="updateServiceStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Update status of affected services</FormLabel>
                      <FormDescription>
                        This will update the status of the following services to{" "}
                        <strong>
                          {getServiceStatus(
                            updateForm.watch("status"),
                            incidentData.impact
                          )}
                        </strong>
                        :{" "}
                        {incidentData.services_incidents
                          .map(
                            (si) =>
                              services.find((s) => s.id === si.service_id)?.name
                          )
                          .join(", ")}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={addUpdateMutation.isPending}>
                {addUpdateMutation.isPending ? "Adding..." : "Add Update"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
