import { useState } from "react";
import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import { toast } from "~/hooks/use-toast";
import { ServiceForm } from "~/routes/dashboard.services/ServiceForm";
import { useUser } from "~/hooks/useUser";
import { Edit2Icon, ExternalLink, Trash2Icon } from "lucide-react";
import { SERVICE_STATUS_LABELS, ServiceStatus } from "~/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Services",
    description: "Manage and monitor your services.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch services");
  }

  return json({ initialServices: services });
}

const STATUS_COLORS = {
  operational: {
    dot: "bg-green-500",
    text: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  degraded_performance: {
    dot: "bg-yellow-500",
    text: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  },
  partial_outage: {
    dot: "bg-orange-500",
    text: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  },
  major_outage: {
    dot: "bg-red-500",
    text: "bg-red-100 text-red-800 hover:bg-red-200",
  },
};

export default function Services() {
  const { initialServices } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const { user } = useUser();

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    initialData: initialServices,
    staleTime: 1000,
  });

  const createServiceMutation = useMutation({
    mutationFn: async (newService: Omit<Service, "id">) => {
      const { data, error } = await supabase
        .from("services")
        .insert({
          ...newService,
          organization_id: user?.profile?.organization_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service created successfully" });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (updatedService: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from("services")
        .update(updatedService)
        .eq("id", updatedService.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service updated successfully" });
      setEditingService(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) {
        console.error("Error deleting service:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service deleted successfully" });
      setDeletingService(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: Omit<Service, "id">) => {
    if (editingService) {
      updateServiceMutation.mutate({ ...data, id: editingService.id });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (deletingService) {
      deleteServiceMutation.mutate(deletingService.id);
    }
  };

  const handleStatusChange = (serviceId: string, newStatus: ServiceStatus) => {
    updateServiceMutation.mutate({ id: serviceId, current_status: newStatus });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Services</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Services are the individual components of your stack.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0">Add New Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <ServiceForm
              onSubmit={handleSubmit}
              isSubmitting={createServiceMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {services && services.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>{service.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Select
                        value={service.current_status}
                        onValueChange={(value) =>
                          handleStatusChange(service.id, value as ServiceStatus)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SERVICE_STATUS_LABELS).map(
                            ([value, label]) => (
                              <SelectItem
                                key={value}
                                value={value}
                                className={`${
                                  STATUS_COLORS[
                                    value as keyof typeof STATUS_COLORS
                                  ].text
                                } rounded-md px-2 py-1 my-1`}
                              >
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <div className="relative ml-3">
                        {service.current_status && (
                          <>
                            <div
                              className={`w-3 h-3 rounded-full mr-2 ${
                                STATUS_COLORS[
                                  service.current_status as ServiceStatus
                                ].dot
                              } animate-ping absolute animate-all duration-&lsqb;2000ms&rsqb;`}
                            ></div>
                            <div
                              className={`w-3 h-3 rounded-full mr-2 ${
                                STATUS_COLORS[
                                  service.current_status as ServiceStatus
                                ].dot
                              }`}
                            ></div>
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {service.url && (
                      <a
                        href={service.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center"
                      >
                        {service.url}
                        <ExternalLink className="w-4 h-4 inline-block ml-2" />
                      </a>
                    )}
                  </TableCell>

                  <TableCell className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-2"
                      onClick={() => setEditingService(service)}
                    >
                      <Edit2Icon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingService(service)}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-lg mx-auto w-full">
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            No services yet
          </h3>
          <div className="mt-3">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              Add New Service
            </Button>
          </div>
          <div className="mt-4 text-sm text-muted-foreground max-w-xs mx-auto">
            <p>
              You can add services like your website, API, database, mobile app,
              etc.
            </p>
          </div>
        </div>
      )}

      <Dialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editingService && (
            <ServiceForm
              initialData={editingService}
              onSubmit={handleSubmit}
              isSubmitting={updateServiceMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingService}
        onOpenChange={(open) => !open && setDeletingService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the service &quot;
              <span className="font-bold text-black font-mono">
                {deletingService?.name}
              </span>
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <p className="text-sm text-gray-500">Deleting this service will:</p>
            <ul className="list-disc list-inside text-sm text-gray-500 mt-2">
              <li>
                Remove its association with any incidents (the incidents
                themselves will remain)
              </li>
              <li>
                Remove its association with any scheduled maintenances (the
                maintenances themselves will remain)
              </li>
              <li>Delete all status logs for this service</li>
              <li>Delete all uptime data for this service</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingService(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteServiceMutation.isPending}
            >
              {deleteServiceMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
