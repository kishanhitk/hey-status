import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate, Link } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form as ShadcnForm,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { toast } from "~/hooks/use-toast";

const acceptInvitationSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { invitationId } = params;
  const { supabase } = createServerSupabase(request, context.cloudflare.env);

  if (!invitationId) {
    throw new Response("Invitation ID is required", { status: 400 });
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select(
      `
      *,
      organizations (name),
      created_by (full_name, email)
    `
    )
    .eq("id", invitationId)
    .single();

  if (error || !invitation) {
    throw new Response("Invitation not found", { status: 404 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new Response("Invitation has expired", { status: 410 });
  }

  return json({ invitation });
}

export default function AcceptInvitation() {
  const { invitation } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useUser();

  const form = useForm<z.infer<typeof acceptInvitationSchema>>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      fullName: "",
      password: "",
    },
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof acceptInvitationSchema>) => {
      if (!user) {
        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email: invitation.email,
            password: values.password,
            options: {
              data: {
                full_name: values.fullName,
                organization_id: invitation.organization_id,
              },
            },
          });

        if (signUpError) throw signUpError;

        const { error: insertError } = await supabase.from("users").insert({
          id: authData.user?.id,
          email: invitation.email,
          full_name: values.fullName,
          organization_id: invitation.organization_id,
          role: invitation.role,
        });

        if (insertError) throw insertError;
      } else {
        // If user is already logged in, just update their organization
        const { error: updateError } = await supabase
          .from("users")
          .update({
            organization_id: invitation.organization_id,
            role: invitation.role,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;
      }

      await supabase.from("invitations").delete().eq("id", invitation.id);

      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "Invitation accepted successfully" });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof acceptInvitationSchema>) {
    acceptInvitationMutation.mutate(values);
  }

  if (isUserLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accept Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You&apos;ve been invited to join {invitation.organizations.name} as
            a {invitation.role}.
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Invited by: {invitation.created_by.full_name} (
            {invitation.created_by.email})
          </p>
        </div>
        {user ? (
          <Button
            onClick={() =>
              acceptInvitationMutation.mutate({
                fullName: user.user_metadata.full_name,
                password: "",
              })
            }
            className="w-full"
            disabled={acceptInvitationMutation.isPending}
          >
            {acceptInvitationMutation.isPending
              ? "Accepting..."
              : "Accept Invitation"}
          </Button>
        ) : (
          <>
            <Button asChild className="mt-4 text-center mx-auto w-full">
              <Link
                to={`/login?redirect=${encodeURIComponent(
                  `/invite/${invitation.id}`
                )}`}
              >
                Login to accept invitation
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
