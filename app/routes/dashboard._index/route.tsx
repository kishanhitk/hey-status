import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Database } from "~/types/supabase";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Separator } from "~/components/ui/separator";

type Service = Database["public"]["Tables"]["services"]["Row"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase } = createServerSupabase(request, env);

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("name");

  const { data: activeIncidents } = await supabase
    .from("incidents")
    .select("*")
    .neq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentIncidents } = await supabase
    .from("incidents")
    .select("*")
    .eq("status", "resolved")
    .order("updated_at", { ascending: false })
    .limit(5);

  return json({ services, activeIncidents, recentIncidents });
}

function getStatusIcon(status: Service["current_status"]) {
  switch (status) {
    case "operational":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "degraded_performance":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "partial_outage":
    case "major_outage":
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

export default function DashboardIndex() {
  const { services, activeIncidents, recentIncidents } =
    useLoaderData<typeof loader>();

  const allOperational = services?.every(
    (service) => service.current_status === "operational"
  );

  return (
    <div className="px-6">
      <header className="flex h-16 shrink-0 items-center transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 h-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-full" />
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {allOperational ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <span className="text-xl font-medium">
                {allOperational
                  ? "All Systems Operational"
                  : "Some Systems Degraded"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {activeIncidents && activeIncidents.length > 0 ? (
              <ul className="space-y-2">
                {activeIncidents.map((incident) => (
                  <li key={incident.id} className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span>{incident.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active incidents</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <a href="/dashboard/incidents/new">Report New Incident</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard/maintenance/new">Schedule Maintenance</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {services?.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between"
                >
                  <span>{service.name}</span>
                  {getStatusIcon(service.current_status)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents && recentIncidents.length > 0 ? (
              <ul className="space-y-2">
                {recentIncidents.map((incident) => (
                  <li key={incident.id} className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{incident.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent incidents</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
