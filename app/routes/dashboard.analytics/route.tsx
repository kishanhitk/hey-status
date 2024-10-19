import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { BarChart, LineChart, PieChart } from "lucide-react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase } = createServerSupabase(request, env);

  // Fetch data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: uptimeData } = await supabase
    .from("uptime_daily_logs")
    .select("*")
    .gte("date", thirtyDaysAgo.toISOString())
    .order("date", { ascending: true });

  const { data: incidentData } = await supabase
    .from("incidents")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const { data: services } = await supabase.from("services").select("*");

  // Process data for charts (this is a simplified example)
  const uptimeChartData = processUptimeData(uptimeData);
  const incidentChartData = processIncidentData(incidentData);
  const serviceHealthData = processServiceHealth(services, uptimeData);

  return json({ uptimeChartData, incidentChartData, serviceHealthData });
}

function processUptimeData(data) {
  // Process uptime data for chart
  // This is a placeholder - you'd need to aggregate data by day
  return data;
}

function processIncidentData(data) {
  // Process incident data for chart
  // This is a placeholder - you'd need to count incidents by type or status
  return data;
}

function processServiceHealth(services, uptimeData) {
  // Calculate overall health for each service
  // This is a placeholder - you'd need to calculate average uptime for each service
  return services;
}

export default function AnalyticsPage() {
  const { uptimeChartData, incidentChartData, serviceHealthData } =
    useLoaderData<typeof loader>();

  return (
    <div className="px-6 ">
      <header className="flex h-16 shrink-0 items-center transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 h-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-full" />
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart className="h-[200px] w-full" />
            {/* Replace with actual chart component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart className="h-[200px] w-full" />
            {/* Replace with actual chart component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart className="h-[200px] w-full" />
            {/* Replace with actual chart component */}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Health Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {serviceHealthData.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between"
                >
                  <span>{service.name}</span>
                  <span>{service.health}%</span>
                  {/* Add a visual indicator of health */}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Avg. Uptime
                </dt>
                <dd className="text-2xl font-semibold">99.9%</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Total Incidents
                </dt>
                <dd className="text-2xl font-semibold">
                  {incidentChartData.length}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Avg. Resolution Time
                </dt>
                <dd className="text-2xl font-semibold">2h 15m</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Active Services
                </dt>
                <dd className="text-2xl font-semibold">
                  {serviceHealthData.length}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
