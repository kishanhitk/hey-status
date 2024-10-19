import { useState } from "react";
import {
  json,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/cloudflare";
import {
  useLoaderData,
  useActionData,
  useNavigation,
  Form,
} from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { useUser } from "~/hooks/useUser";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/hooks/use-toast";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "~/components/ui/multi-select";
import { AlertCircle, AlertTriangle, CheckCircle, Clock } from "lucide-react";

type Service = {
  id: string;
  name: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name");

  if (error) {
    throw new Error("Failed to fetch services");
  }

  return json({ services });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const impact = formData.get("impact") as string;
  const serviceIds = formData.getAll("serviceIds") as string[];

  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: user } = await supabase.auth.getUser();

  try {
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        title,
        description,
        status,
        impact,
        organization_id: user.user?.user_metadata.organization_id,
        created_by: user.user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    if (serviceIds.length > 0) {
      const { error: linkError } = await supabase
        .from("services_incidents")
        .insert(
          serviceIds.map((serviceId) => ({
            incident_id: data.id,
            service_id: serviceId,
          }))
        );

      if (linkError) throw linkError;
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 400 });
  }
}

export default function NewIncident() {
  const { services } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const { user } = useUser();

  if (actionData?.success) {
    toast({ title: "Incident created successfully" });
  } else if (actionData?.error) {
    toast({
      title: "Failed to create incident",
      description: actionData.error,
      variant: "destructive",
    });
  }

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create New Incident</h1>
      <Form method="post" className="space-y-8">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Incident Title
          </label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Enter incident title"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-2"
          >
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            placeholder="Enter incident description"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex space-x-4">
            {[
              {
                value: "investigating",
                label: "Investigating",
                icon: AlertCircle,
                color: "bg-yellow-500",
              },
              {
                value: "identified",
                label: "Identified",
                icon: AlertTriangle,
                color: "bg-orange-500",
              },
              {
                value: "monitoring",
                label: "Monitoring",
                icon: Clock,
                color: "bg-blue-500",
              },
              {
                value: "resolved",
                label: "Resolved",
                icon: CheckCircle,
                color: "bg-green-500",
              },
            ].map((status) => (
              <label key={status.value} className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value={status.value}
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="outline"
                  className={`flex items-center space-x-2 ${status.color} text-white`}
                >
                  <status.icon className="w-4 h-4" />
                  <span>{status.label}</span>
                </Button>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Impact</label>
          <div className="flex space-x-4">
            {[
              { value: "none", label: "None", color: "bg-gray-500" },
              { value: "minor", label: "Minor", color: "bg-yellow-500" },
              { value: "major", label: "Major", color: "bg-orange-500" },
              { value: "critical", label: "Critical", color: "bg-red-500" },
            ].map((impact) => (
              <label key={impact.value} className="flex items-center">
                <input
                  type="radio"
                  name="impact"
                  value={impact.value}
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="outline"
                  className={`${impact.color} text-white`}
                >
                  {impact.label}
                </Button>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Affected Services
          </label>
          <MultiSelector
            onValuesChange={(values) => setSelectedServices(values)}
            values={selectedServices}
          >
            <MultiSelectorTrigger>
              <MultiSelectorInput placeholder="Select affected services" />
            </MultiSelectorTrigger>
            <MultiSelectorContent>
              <MultiSelectorList>
                {services.map((service) => (
                  <MultiSelectorItem key={service.id} value={service.id}>
                    {service.name}
                  </MultiSelectorItem>
                ))}
              </MultiSelectorList>
            </MultiSelectorContent>
          </MultiSelector>
          {selectedServices.map((serviceId) => (
            <input
              key={serviceId}
              type="hidden"
              name="serviceIds"
              value={serviceId}
            />
          ))}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Incident"}
        </Button>
      </Form>
    </div>
  );
}
