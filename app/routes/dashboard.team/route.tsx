import { LoaderFunctionArgs, json, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { toast } from "~/hooks/use-toast";
import { useState } from "react";
import { ROLE_LABELS, Role, ROLES } from "~/lib/constants";
import { metaGenerator } from "~/utils/metaGenerator";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
};

const inviteFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum([ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER]),
});

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum([ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER]),
});

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Team Management",
    description: "Manage your team members and invitations.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: team } = await supabase.from("users").select("*");
  const { data: invitations } = await supabase.from("invitations").select("*");
  return json({ initialTeam: team, initialInvitations: invitations });
}

export default function Team() {
  const { initialTeam, initialInvitations } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const { data: team, isLoading: isTeamLoading } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      return data as TeamMember[];
    },
    initialData: initialTeam as TeamMember[],
  });

  const { data: invitations, isLoading: isInvitationsLoading } = useQuery<
    Invitation[]
  >({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*");
      if (error) throw error;
      return data as Invitation[];
    },
    initialData: initialInvitations as Invitation[],
  });

  const inviteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof inviteFormSchema>) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

      const { data, error } = await supabase
        .from("invitations")
        .insert({
          email: values.email,
          role: values.role,
          organization_id: user?.profile?.organization_id,
          created_by: user?.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation sent successfully" });
      setIsInviteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation cancelled successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: z.infer<typeof updateRoleSchema>) => {
      const { error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: ROLES.VIEWER,
    },
  });

  function onSubmit(values: z.infer<typeof inviteFormSchema>) {
    inviteMutation.mutate(values);
  }

  if (isTeamLoading || isInvitationsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Manage your team members and invitations.
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0">Invite Team Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(ROLES).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {ROLE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">
            Team Members
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="text-white px-4 py-1 bg-black text-xs rounded-full text-center w-fit">
                        {ROLE_LABELS[member.role]}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={member.role}
                        onValueChange={(newRole: Role) => {
                          updateRoleMutation.mutate({
                            userId: member.id,
                            role: newRole,
                          });
                        }}
                        disabled={member.id === user?.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Change role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLES).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {ROLE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {invitations && invitations.length > 0 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              Invitations
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
                      <TableCell>
                        {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/invite/${invitation.id}`
                            );
                            toast({
                              title: "Invitation link copied to clipboard",
                            });
                          }}
                        >
                          Copy Link
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                          onClick={() =>
                            cancelInvitationMutation.mutate(invitation.id)
                          }
                          disabled={cancelInvitationMutation.isPending}
                        >
                          {cancelInvitationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Cancel"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
