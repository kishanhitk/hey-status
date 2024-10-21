import { LoaderFunctionArgs, json, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate, Link } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { toast } from "~/hooks/use-toast";
import DotPattern from "~/components/ui/dot-pattern";
import { cn } from "~/lib/utils";
import { Globe, Loader2, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Accept Invitation",
    description: "Accept your invitation to join an organization.",
  });
};

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { invitationId } = params;
  const { supabase } = createServerSupabase(request, context.cloudflare.env);

  if (!invitationId) {
    throw new Response("Invitation ID is required", { status: 400 });
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("invitations")
    .select(
      `
      *,
      organizations (name)
    `
    )
    .eq("id", invitationId)
    .single();

  if (invitationError || !invitation) {
    throw new Response("Invitation not found", { status: 404 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return json({ invitation, error: "expired" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let error = null;
  if (user) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userProfile?.organization_id) {
      error = "already_in_org";
    } else if (invitation.email !== user.email) {
      error = "email_mismatch";
    }
  }

  return json({ invitation, user, error });
}

export default function AcceptInvitation() {
  const { invitation, error } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const navigate = useNavigate();
  const { user, loading: isUserLoading } = useUser();
  const queryClient = useQueryClient();

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not logged in");

      const { data, error } = await supabase.functions.invoke(
        "accept-invitation",
        {
          body: { invitationId: invitation.id },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Invitation accepted successfully" });
      queryClient.invalidateQueries({ queryKey: ["user"] });
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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
            <CardTitle>Invitation Details</CardTitle>
            <CardDescription>
              You have been invited to join{" "}
              <span className="font-semibold">
                {invitation.organizations?.name}
              </span>{" "}
              as a <span className="font-semibold">{invitation.role}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error === "expired" ? (
              <p className="text-red-500">This invitation has expired.</p>
            ) : error === "already_in_org" ? (
              <div className="space-y-4">
                <p className="text-red-500">
                  You are already part of an organization. Please log out to
                  accept this invitation with a different account.
                </p>
                <Button onClick={handleLogout} className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            ) : error === "email_mismatch" ? (
              <div className="space-y-4">
                <p className="text-red-500">
                  This invitation is not for your current email address. Please
                  log out and sign in with the correct email.
                </p>
                <Button onClick={handleLogout} className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            ) : user ? (
              <Button
                onClick={() => acceptInvitationMutation.mutate()}
                className="w-full"
                disabled={acceptInvitationMutation.isPending}
              >
                {acceptInvitationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <p>Please log in to accept this invitation.</p>
                <Button asChild className="w-full">
                  <Link
                    to={`/login?redirect=${encodeURIComponent(
                      `/invite/${invitation.id}`
                    )}`}
                  >
                    Log In
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
