import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
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
import { Checkbox } from "~/components/ui/checkbox";
import {
  INCIDENT_IMPACT,
  INCIDENT_STATUS,
  INCIDENT_STATUS_LABELS,
  SERVICE_STATUS,
  SERVICE_STATUS_LABELS,
  ServiceStatus,
} from "~/lib/constants";
import { metaGenerator } from "~/utils/metaGenerator";

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
  updateServiceStatus: z.boolean().default(false),
});

// Add this function to determine the service status based on incident status and impact
function getServiceStatus(
  incidentStatus: string,
  incidentImpact: string
): string {
  console.log(incidentStatus, incidentImpact);
  if (incidentStatus === INCIDENT_STATUS.RESOLVED) {
    return SERVICE_STATUS.OPERATIONAL;
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

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Create New Incident",
    description: "Report a new incident affecting your services.",
  });
};

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
      updateServiceStatus: false,
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

      if (values.updateServiceStatus) {
        const newServiceStatus = getServiceStatus(values.status, values.impact);
        const { error: serviceUpdateError } = await supabase
          .from("services")
          .update({ current_status: newServiceStatus })
          .in("id", values.serviceIds);

        if (serviceUpdateError) throw serviceUpdateError;
      }

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
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Incident</h1>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 sm:space-y-8"
        >
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
                  <div className="flex flex-wrap gap-2 sm:gap-4">
                    {[
                      {
                        value: INCIDENT_STATUS.INVESTIGATING,
                        label:
                          INCIDENT_STATUS_LABELS[INCIDENT_STATUS.INVESTIGATING],
                        icon: AlertCircle,
                        color: "yellow",
                      },
                      {
                        value: INCIDENT_STATUS.IDENTIFIED,
                        label:
                          INCIDENT_STATUS_LABELS[INCIDENT_STATUS.IDENTIFIED],
                        icon: AlertTriangle,
                        color: "orange",
                      },
                      {
                        value: INCIDENT_STATUS.MONITORING,
                        label:
                          INCIDENT_STATUS_LABELS[INCIDENT_STATUS.MONITORING],
                        icon: Clock,
                        color: "blue",
                      },
                      {
                        value: INCIDENT_STATUS.RESOLVED,
                        label: INCIDENT_STATUS_LABELS[INCIDENT_STATUS.RESOLVED],
                        icon: CheckCircle,
                        color: "green",
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
                          className={`flex items-center space-x-2
                            hover:bg-${status.color}-50
                            hover:text-${status.color}-600
                            ${status.color} ${
                            field.value === status.value
                              ? `text-${status.color}-600 border-${status.color}-500`
                              : "text-gray-500"
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
                  <div className="flex flex-wrap gap-2 sm:gap-4">
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

          <FormField
            control={form.control}
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
                    This will update the status of the selected services to{" "}
                    <strong>
                      {
                        SERVICE_STATUS_LABELS[
                          getServiceStatus(
                            form.watch("status"),
                            form.watch("impact")
                          ) as ServiceStatus
                        ]
                      }
                    </strong>
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={createIncidentMutation.isPending}
            className="w-full sm:w-auto"
          >
            {createIncidentMutation.isPending
              ? "Creating..."
              : "Create Incident"}
          </Button>
        </form>
      </Form>
      <div className="hidden bg-yellow-100 text-yellow-500 border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600">
        This is a hidden div to register the tailwind css classes for the status
        buttons.
      </div>
      <div className="hidden bg-orange-100 text-orange-500 border-orange-500 hover:bg-orange-50 hover:text-orange-600">
        This is a hidden div to register the tailwind css classes for the status
        buttons.
      </div>
      <div className="hidden bg-blue-100 text-blue-500 border-blue-500 hover:bg-blue-50 hover:text-blue-600">
        This is a hidden div to register the tailwind css classes for the status
        buttons.
      </div>
      <div className="hidden bg-green-100 text-green-500 border-green-500 hover:bg-green-50 hover:text-green-600">
        This is a hidden div to register the tailwind css classes for the status
        buttons.
      </div>
    </div>
  );
}
