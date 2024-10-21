import {
  LoaderFunctionArgs,
  json,
  redirect,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData, Form } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useUser } from "~/hooks/useUser";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "~/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { metaGenerator } from "~/utils/metaGenerator";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "~/hooks/useSupabase";

const updateOrgSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters long"),
});

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Settings",
    description: "Manage your organization settings.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: userDetails } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (userDetails?.role !== "admin") {
    return redirect("/dashboard");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", userDetails.organization_id)
    .single();

  return json({ organization });
}

export default function Settings() {
  const { organization } = useLoaderData<typeof loader>();
  const { user, loading } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: {
      name: organization?.name || "",
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("organizations")
        .update({ name })
        .eq("id", user?.profile.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Organization name updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update organization name",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = handleSubmit((data) => {
    updateOrgMutation.mutate(data.name);
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.profile?.role !== "admin") {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Settings</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Organization Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Manage your organization&apos;s settings and preferences.
          </p>
        </div>
      </div>

      <div className="max-w-md">
        <Form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              {...register("name")}
              defaultValue={organization?.name}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          <Button type="submit" disabled={updateOrgMutation.isPending}>
            {updateOrgMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Organization Name"
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}
