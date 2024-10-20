import { useState } from "react";
import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useParams, useNavigate } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { toast } from "~/hooks/use-toast";
import { useUser } from "~/hooks/useUser";
import { formatDistanceToNow, format, isBefore, isAfter } from "date-fns";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { maintenanceId } = params;

  const { data: maintenance, error: maintenanceError } = await supabase
    .from("scheduled_maintenances")
    .select(
      `
      *,
      services_scheduled_maintenances(service_id),
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

const maintenanceSchema = z
  .object({
    title: z.string().min(2, "Title must be at least 2 characters long"),
    description: z.string().optional(),
    impact: z.enum(["none", "minor", "major", "critical"]),
    start_time: z.date(),
    end_time: z.date(),
    serviceIds: z.array(z.string()),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
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
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

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
          services_scheduled_maintenances(service_id),
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
      start_time: maintenanceData?.start_time
        ? new Date(maintenanceData.start_time)
        : new Date(),
      end_time: maintenanceData?.end_time
        ? new Date(maintenanceData.end_time)
        : new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now if not set
      serviceIds:
        maintenanceData?.services_scheduled_maintenances?.map(
          (ssm) => ssm.service_id
        ) || [],
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
          start_time: values.start_time.toISOString(),
          end_time: values.end_time.toISOString(),
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
          start_time: new Date().toISOString(),
        })
        .eq("id", maintenanceId)
        .select()
        .single();

      if (error) throw error;
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
          end_time: new Date().toISOString(),
        })
        .eq("id", maintenanceId)
        .select()
        .single();

      if (error) throw error;
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
      // First, delete the related records in services_scheduled_maintenances
      const { error: linkError } = await supabase
        .from("services_scheduled_maintenances")
        .delete()
        .eq("scheduled_maintenance_id", maintenanceId);

      if (linkError) throw linkError;

      // Then, delete the maintenance updates
      const { error: updateError } = await supabase
        .from("maintenance_updates")
        .delete()
        .eq("scheduled_maintenance_id", maintenanceId);

      if (updateError) throw updateError;

      // Finally, delete the maintenance itself
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
    setIsStartDialogOpen(false);
  };

  const handleCompleteMaintenance = () => {
    completeMaintenanceMutation.mutate();
    setIsCompleteDialogOpen(false);
  };

  const getMaintenanceStatus = (maintenance) => {
    const now = new Date();
    const startTime = new Date(maintenance.start_time);
    const endTime = new Date(maintenance.end_time);

    if (now < startTime) {
      return "Scheduled";
    } else if (now >= startTime && now < endTime) {
      return "In Progress";
    } else {
      return "Completed";
    }
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
      <div className="mb-4">
        <strong>Status:</strong> {getMaintenanceStatus(maintenanceData)}
      </div>

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
                  name="start_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Time</FormLabel>
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
                  name="end_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Time</FormLabel>
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
            {getMaintenanceStatus(maintenanceData) === "Scheduled" && (
              <Dialog
                open={isStartDialogOpen}
                onOpenChange={setIsStartDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>Start Maintenance</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start Maintenance</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to start this maintenance now? This
                      will update the start time to the current time.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsStartDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleStartMaintenance}>
                      Start Maintenance
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {getMaintenanceStatus(maintenanceData) === "In Progress" && (
              <Dialog
                open={isCompleteDialogOpen}
                onOpenChange={setIsCompleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>Complete Maintenance</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Complete Maintenance</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to complete this maintenance now?
                      This will update the end time to the current time.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCompleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCompleteMaintenance}>
                      Complete Maintenance
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Separator className="my-8" />

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-fit border-red-500 text-red-500 hover:bg-red-500 hover:text-white ml-auto"
              >
                Delete Maintenance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  maintenance and all associated updates.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {deleteMaintenanceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
