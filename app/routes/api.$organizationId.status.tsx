import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { organizationId } = params;
  const { supabase } = createServerSupabase(request, context.cloudflare.env);

  if (!organizationId) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch organization
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", organizationId)
    .single();

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch services
  const { data: services } = await supabase
    .from("services")
    .select("id, name, current_status")
    .eq("organization_id", organization.id)
    .order("name");

  // Fetch active incidents (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: activeIncidents } = await supabase
    .from("incidents")
    .select(
      `
      id,
      title,
      impact,
      created_at,
      incident_updates(status, created_at)
    `
    )
    .eq("organization_id", organization.id)
    .gte("created_at", sevenDaysAgo.toISOString())
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch upcoming maintenances
  const now = new Date().toISOString();
  const { data: upcomingMaintenances } = await supabase
    .from("scheduled_maintenances")
    .select(
      `
      id,
      title,
      start_time,
      end_time
    `
    )
    .eq("organization_id", organization.id)
    .gte("end_time", now)
    .order("start_time")
    .limit(5);

  const response = {
    organization: {
      name: organization.name,
      url: `https://hey-status.pages.dev/${organization.slug}`,
    },
    status: {
      indicator: services?.every((s) => s.current_status === "operational")
        ? "ok"
        : "error",
      description: services?.every((s) => s.current_status === "operational")
        ? "All Systems Operational"
        : "Some Systems Are Experiencing Issues",
    },
    services: services?.map((service) => ({
      name: service.name,
      status: service.current_status,
    })),
    incidents: activeIncidents?.map((incident) => ({
      id: incident.id,
      title: incident.title,
      impact: incident.impact,
      created_at: incident.created_at,
      status: incident.incident_updates[0]?.status || "investigating",
      last_updated_at:
        incident.incident_updates[0]?.created_at || incident.created_at,
    })),
    scheduled_maintenances: upcomingMaintenances?.map((maintenance) => ({
      id: maintenance.id,
      title: maintenance.title,
      start_time: maintenance.start_time,
      end_time: maintenance.end_time,
    })),
  };

  return json(response, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
