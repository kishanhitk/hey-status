import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "~/components/ui/multi-select";
import { toast } from "~/hooks/use-toast";

type Service = {
  id: string;
  name: string;
};

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed"]),
  scheduled_start_time: z.string(),
  scheduled_end_time: z.string(),
  serviceIds: z.array(z.string()).min(1, {
    message: "Please select at least one affected service.",
  }),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name");

  if (error) {
    throw new Error("Failed to fetch services");
  }

  return json({ services });
}

export default function NewMaintenance() {
  const { services: initialServices } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const { user } = useUser();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "scheduled",
      scheduled_start_time: "",
      scheduled_end_time: "",
      serviceIds: [],
    },
  });

  const {
    data: services,
    isLoading: isLoadingServices,
    error: servicesError,
  } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name");
      if (error) throw error;
      return data as Service[];
    },
    initialData: initialServices,
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data, error } = await supabase
        .from("scheduled_maintenances")
        .insert({
          title: values.title,
          description: values.description,
          status: values.status,
          scheduled_start_time: values.scheduled_start_time,
          scheduled_end_time: values.scheduled_end_time,
          organization_id: user?.profile?.organization_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (values.serviceIds.length > 0) {
        const { error: linkError } = await supabase
          .from("services_scheduled_maintenances")
          .insert(
            values.serviceIds.map((serviceId) => ({
              scheduled_maintenance_id: data.id,
              service_id: serviceId,
            }))
          );

        if (linkError) throw linkError;
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: "Maintenance scheduled successfully" });
      navigate("/dashboard/maintenance");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMaintenanceMutation.mutate(values);
  }

  if (isLoadingServices) {
    return <div>Loading services...</div>;
  }

  if (servicesError) {
    return <div>Error loading services: {servicesError.message}</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Schedule New Maintenance</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter maintenance title" {...field} />
                </FormControl>
                <FormDescription>
                  A brief title describing the maintenance.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter maintenance description"
                    {...field}
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Detailed description of the maintenance (optional).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduled_start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Start Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduled_end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled End Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Affected Services</FormLabel>
                <FormControl>
                  <MultiSelector
                    onValuesChange={field.onChange}
                    values={field.value}
                    options={services.map((service) => ({
                      value: service.id,
                      label: service.name,
                    }))}
                  >
                    <MultiSelectorTrigger>
                      <MultiSelectorInput placeholder="Select affected services" />
                    </MultiSelectorTrigger>
                    <MultiSelectorContent>
                      <MultiSelectorList>
                        {services.map((service) => (
                          <MultiSelectorItem
                            key={service.id}
                            value={service.id}
                          >
                            {service.name}
                          </MultiSelectorItem>
                        ))}
                      </MultiSelectorList>
                    </MultiSelectorContent>
                  </MultiSelector>
                </FormControl>
                <FormDescription>
                  Select the services affected by this maintenance.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createMaintenanceMutation.isPending}>
            {createMaintenanceMutation.isPending
              ? "Scheduling..."
              : "Schedule Maintenance"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
