import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Database } from "~/types/supabase";
import { formatDistanceToNow, subDays, format } from "date-fns";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "~/components/ui/chart";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase } = createServerSupabase(request, env);

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data: incidentStats } = await supabase
    .from("incidents")
    .select("created_at, impact")
    .gte("created_at", thirtyDaysAgo);

  const { data: maintenanceStats } = await supabase
    .from("scheduled_maintenances")
    .select("start_time")
    .gte("start_time", thirtyDaysAgo);

  const { data: serviceUptime } = await supabase
    .from("services")
    .select("name, current_status");

  const { data: recentIncidents } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return json({
    incidentStats,
    maintenanceStats,
    serviceUptime,
    recentIncidents,
  });
}

function prepareChartData(incidentStats: any[], maintenanceStats: any[]) {
  const data = Array.from({ length: 30 }, (_, i) => ({
    name: format(subDays(new Date(), i), "MM/dd"),
    incidents: 0,
    maintenances: 0,
  }));

  incidentStats.forEach((incident) => {
    const index = data.findIndex(
      (item) => item.name === format(new Date(incident.created_at), "MM/dd")
    );
    if (index !== -1) {
      data[index].incidents += 1;
    }
  });

  maintenanceStats.forEach((maintenance) => {
    const index = data.findIndex(
      (item) => item.name === format(new Date(maintenance.start_time), "MM/dd")
    );
    if (index !== -1) {
      data[index].maintenances += 1;
    }
  });

  return data.reverse();
}

export default function Analytics() {
  const { incidentStats, maintenanceStats, serviceUptime, recentIncidents } =
    useLoaderData<typeof loader>();

  const chartData = prepareChartData(
    incidentStats || [],
    maintenanceStats || []
  );

  const totalIncidents = incidentStats?.length ?? 0;
  const totalMaintenances = maintenanceStats?.length ?? 0;
  const averageUptime =
    serviceUptime && serviceUptime.length > 0
      ? (serviceUptime.filter(
          (service) => service.current_status === "operational"
        ).length /
          serviceUptime.length) *
        100
      : 0;

  return (
    <div className="px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Overview of your system&apos;s performance and incidents.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Incidents (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalIncidents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Maintenances (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalMaintenances}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{averageUptime.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Incidents and Maintenances (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [value, name]}
                    />
                  }
                />
                <Bar dataKey="incidents" fill="#fbbf24" name="Incidents" />
                <Bar
                  dataKey="maintenances"
                  fill="#60a5fa"
                  name="Maintenances"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recentIncidents?.map((incident: Incident) => (
              <li
                key={incident.id}
                className="flex items-center justify-between"
              >
                <span>{incident.title}</span>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(incident.created_at))} ago
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
