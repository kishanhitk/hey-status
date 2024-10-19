import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useParams } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { toast } from "~/hooks/use-toast";
import { useUser } from "~/hooks/useUser";
import { formatDistanceToNow } from "date-fns";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import { AlertCircle, Loader2 } from "lucide-react";

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
});

export default function IncidentDetails() {
  const { incident, services } = useLoaderData<typeof loader>();
  const { incidentId } = useParams();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useUser();

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
    <div className="p-8 ">
      <h1 className="text-3xl font-bold mb-8">Incident Details</h1>

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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
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
                <h3 className="font-semibold">{update.status}</h3>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="investigating">
                          Investigating
                        </SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
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
