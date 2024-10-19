import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
import { useMutation } from "@tanstack/react-query";
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
import { AlertCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { INCIDENT_STATUS, INCIDENT_STATUS_LABELS } from "~/lib/contants";

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  statusMessage: z.string().min(1, "Status message is required"),
  impact: z.enum(["none", "minor", "major", "critical"]),
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

export default function NewIncident() {
  const { services } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const { user } = useUser();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "investigating",
      statusMessage: "",
      impact: "none",
      serviceIds: [],
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .insert({
          title: values.title,
          description: values.description,
          impact: values.impact,
          organization_id: user?.profile?.organization_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      if (values.serviceIds.length > 0) {
        const { error: linkError } = await supabase
          .from("services_incidents")
          .insert(
            values.serviceIds.map((serviceId) => ({
              incident_id: incident.id,
              service_id: serviceId,
            }))
          );

        if (linkError) throw linkError;
      }

      const { error: updateError } = await supabase
        .from("incident_updates")
        .insert({
          incident_id: incident.id,
          status: values.status,
          message: values.statusMessage,
          created_by: user?.id,
        });

      if (updateError) throw updateError;

      return incident;
    },
    onSuccess: () => {
      toast({ title: "Incident created successfully" });
      navigate("/dashboard/incidents");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createIncidentMutation.mutate(values);
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create New Incident</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Incident Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter incident title" {...field} />
                </FormControl>
                <FormDescription>
                  A brief title describing the incident.
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
                    placeholder="Enter incident description"
                    {...field}
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Detailed description of the incident (optional).
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
                  <div className="flex space-x-4">
                    {[
                      {
                        value: INCIDENT_STATUS.INVESTIGATING,
                        label:
                          INCIDENT_STATUS_LABELS[INCIDENT_STATUS.INVESTIGATING],
                        icon: AlertCircle,
                      },
                      {
                        value: INCIDENT_STATUS.IDENTIFIED,
                        label:
                          INCIDENT_STATUS_LABELS[INCIDENT_STATUS.IDENTIFIED],
                        icon: AlertTriangle,
                      },
                      {
                        value: INCIDENT_STATUS.MONITORING,
                        label:
                          INCIDENT_STATUS_LABELS[INCIDENT_STATUS.MONITORING],
                        icon: Clock,
                      },
                      {
                        value: INCIDENT_STATUS.RESOLVED,
                        label: INCIDENT_STATUS_LABELS[INCIDENT_STATUS.RESOLVED],
                        icon: CheckCircle,
                      },
                    ].map((status) => (
                      <label key={status.value} className="flex items-center">
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
            control={form.control}
            name="statusMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter status message"
                    {...field}
                    rows={2}
                  />
                </FormControl>
                <FormDescription>
                  Provide details about the current status.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
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
                      <label key={impact.value} className="flex items-center">
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
                  Select the services affected by this incident.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createIncidentMutation.isPending}>
            {createIncidentMutation.isPending
              ? "Creating..."
              : "Create Incident"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
