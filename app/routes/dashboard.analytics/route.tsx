import { LoaderFunctionArgs, json, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Database } from "~/types/supabase";
import { formatDistanceToNow, subDays, format, startOfDay } from "date-fns";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "~/components/ui/chart";
import { metaGenerator } from "~/utils/metaGenerator";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Analytics",
    description:
      "View analytics and insights about your services and incidents.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase } = createServerSupabase(request, env);

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  const todayStart = startOfDay(new Date()).toISOString();

  const { data: incidentStats } = await supabase
    .from("incidents")
    .select("created_at, impact")
    .gte("created_at", thirtyDaysAgo);

  const { data: maintenanceStats } = await supabase
    .from("scheduled_maintenances")
    .select("start_time")
    .gte("start_time", thirtyDaysAgo);

  const { data: statusLogs } = await supabase
    .from("service_status_logs")
    .select("service_id, status, created_at")
    .gte("created_at", todayStart)
    .order("created_at", { ascending: true });

  const { data: recentIncidents } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return json({
    incidentStats,
    maintenanceStats,
    statusLogs,
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

function calculateTodayDowntime(statusLogs: any[]) {
  const downtimeByService: Record<string, number> = {};
  const now = new Date();

  statusLogs.forEach((log, index) => {
    if (log.status !== "operational") {
      const startDate = new Date(log.created_at);
      const endDate =
        index < statusLogs.length - 1
          ? new Date(statusLogs[index + 1].created_at)
          : now;

      const downtimeMinutes = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60)
      );

      if (!downtimeByService[log.service_id]) {
        downtimeByService[log.service_id] = 0;
      }
      downtimeByService[log.service_id] += downtimeMinutes;
    }
  });

  const totalDowntime = Object.values(downtimeByService).reduce(
    (sum, value) => sum + value,
    0
  );

  return totalDowntime;
}

function formatDowntime(minutes: number) {
  if (minutes === 0) return "No downtime";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${
    remainingMinutes !== 1 ? "s" : ""
  }`;
}

export default function Analytics() {
  const { incidentStats, maintenanceStats, statusLogs, recentIncidents } =
    useLoaderData<typeof loader>();

  const chartData = prepareChartData(
    incidentStats || [],
    maintenanceStats || []
  );

  const totalIncidents = incidentStats?.length ?? 0;
  const totalMaintenances = maintenanceStats?.length ?? 0;
  const todayDowntime = calculateTodayDowntime(statusLogs || []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            Overview of your system&apos;s performance and incidents.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle>Today&apos;s Downtime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatDowntime(todayDowntime)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 sm:mt-8">
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

      <Card className="mt-6 sm:mt-8">
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
