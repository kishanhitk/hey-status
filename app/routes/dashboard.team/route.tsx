import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
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
import { ROLE_LABELS, Role } from "~/lib/contants";

type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
};

const inviteFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(["admin", "editor", "viewer"]),
});

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

  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      return data as TeamMember[];
    },
    initialData: initialTeam,
  });

  const { data: invitations } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*");
      if (error) throw error;
      return data as Invitation[];
    },
    initialData: initialInvitations,
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

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "viewer",
    },
  });

  function onSubmit(values: z.infer<typeof inviteFormSchema>) {
    inviteMutation.mutate(values);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Team Management</h1>

      <h2 className="text-2xl font-semibold mb-4">Team Members</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {team.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.full_name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <div className="text-white px-4 py-1 bg-black text-xs rounded-full text-center w-fit ">
                  {ROLE_LABELS[member.role as Role]}
                </div>
              </TableCell>
              <TableCell>
                {new Date(member.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="text-2xl font-semibold my-8">Invitations</h2>
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
          {invitations?.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{invitation.role}</TableCell>
              <TableCell>
                {new Date(invitation.expires_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/invite/${invitation.id}`
                    );
                    toast({ title: "Invitation link copied to clipboard" });
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-2"
                  onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                >
                  Cancel
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mt-8">Invite Team Member</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Send Invitation</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
