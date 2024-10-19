import { useState } from "react";
import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
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
import { SERVICE_STATUS_LABELS } from "~/lib/contants";

type Service = {
  id: string;
  name: string;
  description: string;
  url: string;
  current_status:
    | "operational"
    | "degraded_performance"
    | "partial_outage"
    | "major_outage";
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: services, error } = await supabase.from("services").select("*");

  if (error) {
    throw new Error("Failed to fetch services");
  }

  return json({ initialServices: services });
}

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
      const { data, error } = await supabase.from("services").select("*");
      if (error) throw error;
      return data;
    },
    initialData: initialServices,
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
    mutationFn: async (updatedService: Service) => {
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Services</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Service</Button>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services?.map((service: Service) => (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
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
              <TableCell>
                {SERVICE_STATUS_LABELS[service.current_status]}
              </TableCell>
              <TableCell>
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
