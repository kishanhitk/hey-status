import { useState } from "react";
import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useParams, useNavigate } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { toast } from "~/hooks/use-toast";
import { useUser } from "~/hooks/useUser";
import { formatDistanceToNow, format } from "date-fns";
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
import { AlertCircle, Loader2, CalendarIcon } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_IMPACT,
  MAINTENANCE_IMPACT_LABELS,
  SERVICE_STATUS,
} from "~/lib/constants";
import { Checkbox } from "~/components/ui/checkbox";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "~/components/ui/multi-select";
import { TimePickerDemo } from "~/components/TimePickerDemo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { cn } from "~/lib/utils";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { maintenanceId } = params;

  const { data: maintenance, error: maintenanceError } = await supabase
    .from("scheduled_maintenances")
    .select(
      `
      *,
      services_scheduled_maintenances(service_id, auto_change_status),
      maintenance_updates(*)
    `
    )
    .eq("id", maintenanceId)
    .single();

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name");

  if (maintenanceError || servicesError) {
    throw new Error("Failed to fetch data");
  }

  return json({ maintenance, services });
}

const maintenanceSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  description: z.string().optional(),
  impact: z.enum(["none", "minor", "major", "critical"]),
  scheduled_start_time: z.date(),
  scheduled_end_time: z.date(),
  serviceIds: z.array(z.string()),
  autoChangeStatus: z.boolean(),
});

const updateSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export default function MaintenanceDetails() {
  const { maintenance, services } = useLoaderData<typeof loader>();
  const { maintenanceId } = useParams();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  const {
    data: maintenanceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["maintenance", maintenanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_maintenances")
        .select(
          `
          *,
          services_scheduled_maintenances(service_id, auto_change_status),
          maintenance_updates(*)
        `
        )
        .eq("id", maintenanceId)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: maintenance,
  });

  const maintenanceForm = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      title: maintenanceData?.title || "",
      description: maintenanceData?.description || "",
      impact: maintenanceData?.impact || "none",
      scheduled_start_time: maintenanceData?.scheduled_start_time
        ? new Date(maintenanceData.scheduled_start_time)
        : new Date(),
      scheduled_end_time: maintenanceData?.scheduled_end_time
        ? new Date(maintenanceData.scheduled_end_time)
        : new Date(),
      serviceIds:
        maintenanceData?.services_scheduled_maintenances?.map(
          (ssm) => ssm.service_id
        ) || [],
      autoChangeStatus:
        maintenanceData?.services_scheduled_maintenances?.[0]
          ?.auto_change_status || false,
    },
  });

  const updateForm = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      message: "",
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: async (values: z.infer<typeof maintenanceSchema>) => {
      const { data, error } = await supabase
        .from("scheduled_maintenances")
        .update({
          title: values.title,
          description: values.description,
          impact: values.impact,
          scheduled_start_time: values.scheduled_start_time.toISOString(),
          scheduled_end_time: values.scheduled_end_time.toISOString(),
        })
        .eq("id", maintenanceId)
        .select()
        .single();

      if (error) throw error;

      // Update services
      await supabase
        .from("services_scheduled_maintenances")
        .delete()
        .eq("scheduled_maintenance_id", maintenanceId);

      if (values.serviceIds.length > 0) {
        await supabase.from("services_scheduled_maintenances").insert(
          values.serviceIds.map((serviceId) => ({
            scheduled_maintenance_id: maintenanceId,
            service_id: serviceId,
            auto_change_status: values.autoChangeStatus,
          }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maintenance", maintenanceId],
      });
      toast({ title: "Maintenance updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof updateSchema>) => {
      const { data, error } = await supabase
        .from("maintenance_updates")
        .insert({
          scheduled_maintenance_id: maintenanceId,
          message: values.message,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maintenance", maintenanceId],
      });
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

  const startMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_maintenances")
        .update({
          status: MAINTENANCE_STATUS.IN_PROGRESS,
          actual_start_time: new Date().toISOString(),
        })
        .eq("id", maintenanceId)
        .select()
        .single();

      if (error) throw error;

      // Update service statuses if auto_change_status is true
      if (
        maintenanceData.services_scheduled_maintenances.some(
          (ssm) => ssm.auto_change_status
        )
      ) {
        const newStatus = getServiceStatus(
          MAINTENANCE_STATUS.IN_PROGRESS,
          maintenanceData.impact
        );
        await updateServiceStatuses(
          maintenanceData.services_scheduled_maintenances,
          newStatus
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maintenance", maintenanceId],
      });
      toast({ title: "Maintenance started successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_maintenances")
        .update({
          status: MAINTENANCE_STATUS.COMPLETED,
          actual_end_time: new Date().toISOString(),
        })
        .eq("id", maintenanceId)
        .select()
        .single();

      if (error) throw error;

      // Update service statuses if auto_change_status is true
      if (
        maintenanceData.services_scheduled_maintenances.some(
          (ssm) => ssm.auto_change_status
        )
      ) {
        await updateServiceStatuses(
          maintenanceData.services_scheduled_maintenances,
          SERVICE_STATUS.OPERATIONAL
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maintenance", maintenanceId],
      });
      toast({ title: "Maintenance completed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("scheduled_maintenances")
        .delete()
        .eq("id", maintenanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      toast({ title: "Maintenance deleted successfully" });
      navigate("/dashboard/maintenance");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMaintenanceMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleMaintenanceSubmit = (
    values: z.infer<typeof maintenanceSchema>
  ) => {
    updateMaintenanceMutation.mutate(values);
  };

  const handleUpdateSubmit = (values: z.infer<typeof updateSchema>) => {
    addUpdateMutation.mutate(values);
  };

  const handleStartMaintenance = () => {
    startMaintenanceMutation.mutate();
  };

  const handleCompleteMaintenance = () => {
    completeMaintenanceMutation.mutate();
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
          Failed to load maintenance details. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Maintenance Details</h1>

      <div className="flex">
        <div className="w-full">
          <Form {...maintenanceForm}>
            <form
              onSubmit={maintenanceForm.handleSubmit(handleMaintenanceSubmit)}
              className="space-y-4"
            >
              <FormField
                control={maintenanceForm.control}
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
                control={maintenanceForm.control}
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
                control={maintenanceForm.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact</FormLabel>
                    <FormControl>
                      <div className="flex space-x-4">
                        {Object.entries(MAINTENANCE_IMPACT).map(
                          ([key, value]) => (
                            <label key={value} className="flex items-center">
                              <input
                                type="radio"
                                {...field}
                                value={value}
                                checked={field.value === value}
                                className="sr-only"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => field.onChange(value)}
                                className={`border-gray-300 text-gray-500 ${
                                  field.value === value
                                    ? "border-black text-black"
                                    : ""
                                }`}
                              >
                                {MAINTENANCE_IMPACT_LABELS[value]}
                              </Button>
                            </label>
                          )
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={maintenanceForm.control}
                  name="scheduled_start_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled Start Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[280px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP HH:mm:ss")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <TimePickerDemo
                              setDate={field.onChange}
                              date={field.value}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={maintenanceForm.control}
                  name="scheduled_end_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled End Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[280px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP HH:mm:ss")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <TimePickerDemo
                              setDate={field.onChange}
                              date={field.value}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={maintenanceForm.control}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={maintenanceForm.control}
                name="autoChangeStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Automatically change status of affected services
                      </FormLabel>
                      <FormDescription>
                        This will update the status of the selected services
                        when the maintenance starts and ends.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateMaintenanceMutation.isPending}
              >
                {updateMaintenanceMutation.isPending
                  ? "Updating..."
                  : "Update Maintenance"}
              </Button>
            </form>
          </Form>

          <Separator className="my-8" />

          <h2 className="text-2xl font-bold mb-4">Maintenance Updates</h2>

          {maintenanceData?.maintenance_updates
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .map((update) => (
              <div key={update.id} className="mb-4 p-4 bg-gray-100 rounded-lg">
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

          <Separator className="my-8" />

          <div className="flex space-x-4">
            {maintenanceData.status === MAINTENANCE_STATUS.SCHEDULED && (
              <Button
                onClick={handleStartMaintenance}
                disabled={startMaintenanceMutation.isPending}
              >
                {startMaintenanceMutation.isPending
                  ? "Starting..."
                  : "Start Maintenance"}
              </Button>
            )}
            {maintenanceData.status === MAINTENANCE_STATUS.IN_PROGRESS && (
              <Button
                onClick={handleCompleteMaintenance}
                disabled={completeMaintenanceMutation.isPending}
              >
                {completeMaintenanceMutation.isPending
                  ? "Completing..."
                  : "Complete Maintenance"}
              </Button>
            )}
          </div>

          <Separator className="my-8" />

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-fit border-red-500 text-red-500 hover:bg-red-500 hover:text-white ml-auto"
              >
                Delete Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Are you sure you want to delete this maintenance?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the
                  maintenance and all associated updates.
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
                  disabled={deleteMaintenanceMutation.isPending}
                >
                  {deleteMaintenanceMutation.isPending
                    ? "Deleting..."
                    : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine service status based on maintenance status and impact
function getServiceStatus(
  maintenanceStatus: string,
  maintenanceImpact: string
) {
  if (maintenanceStatus === MAINTENANCE_STATUS.COMPLETED) {
    return SERVICE_STATUS.OPERATIONAL;
  }

  switch (maintenanceImpact) {
    case MAINTENANCE_IMPACT.CRITICAL:
      return SERVICE_STATUS.MAJOR_OUTAGE;
    case MAINTENANCE_IMPACT.MAJOR:
      return SERVICE_STATUS.PARTIAL_OUTAGE;
    case MAINTENANCE_IMPACT.MINOR:
      return SERVICE_STATUS.DEGRADED_PERFORMANCE;
    default:
      return SERVICE_STATUS.OPERATIONAL;
  }
}

// Helper function to update service statuses
async function updateServiceStatuses(services, newStatus) {
  const supabase = useSupabase();
  for (const service of services) {
    if (service.auto_change_status) {
      await supabase
        .from("services")
        .update({ current_status: newStatus })
        .eq("id", service.service_id);
    }
  }
}
