import {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  json,
  redirect,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
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

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userDetails } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (userDetails?.role !== "admin") {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;

  const validationResult = updateOrgSchema.safeParse({ name });

  if (!validationResult.success) {
    return json({ errors: validationResult.error.flatten().fieldErrors });
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", userDetails.organization_id);

  if (error) {
    return json(
      { error: "Failed to update organization name" },
      { status: 500 }
    );
  }

  return json({ success: true });
}

export default function Settings() {
  const { organization } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { user } = useUser();

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

  const onSubmit = handleSubmit(async (data) => {
    const form = new FormData();
    form.append("name", data.name);

    const response = await fetch("/dashboard/settings", {
      method: "POST",
      body: form,
    });

    const result = await response.json();

    if (result.success) {
      toast({ title: "Organization name updated successfully" });
    } else if (result.error) {
      toast({
        title: "Failed to update organization name",
        description: result.error,
        variant: "destructive",
      });
    }
  });

  if (user?.profile?.role !== "admin") {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Organization Settings</h1>
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
        <Button type="submit">Update Organization Name</Button>
      </Form>
      {actionData?.error && (
        <p className="text-red-500 mt-4">{actionData.error}</p>
      )}
    </div>
  );
}
