import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate, Link } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
import { useMutation } from "@tanstack/react-query";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import { toast } from "~/hooks/use-toast";
import DotPattern from "~/components/ui/dot-pattern";
import { cn } from "~/lib/utils";
import { Globe, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

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
  const { user, loading: isUserLoading } = useUser();

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not logged in");

      const { error: updateError } = await supabase
        .from("users")
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

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

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <DotPattern
        width={20}
        height={20}
        cx={5}
        cy={5}
        cr={1}
        className={cn(
          "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
        )}
      />
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div>
          <Link
            to="/"
            className="flex items-center justify-center text-black mb-6"
          >
            <Globe className="h-8 w-8 mr-2" />
            <span className="text-2xl font-bold">HeyStatus</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              <span className="font-semibold">
                {invitation.created_by.full_name}
              </span>{" "}
              has invited you to join{" "}
              <span className="font-semibold">
                {invitation.organizations?.name}
              </span>{" "}
              as a <span className="font-semibold">{invitation.role}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <Button
                onClick={() => acceptInvitationMutation.mutate()}
                className="w-full"
                disabled={acceptInvitationMutation.isPending}
              >
                {acceptInvitationMutation.isPending
                  ? "Accepting..."
                  : "Accept Invitation"}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link
                  to={`/login?redirect=${encodeURIComponent(
                    `/invite/${invitation.id}`
                  )}`}
                >
                  Login to accept invitation
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
