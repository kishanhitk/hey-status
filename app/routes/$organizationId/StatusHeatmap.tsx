import { useParams } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "~/hooks/useSupabase";

type Service = {
  id: string;
  name: string;
  // Add other properties as needed
};

type StatusLog = {
  service_id: string;
  status: string;
  created_at: string;
};

export const StatusHeatmap = ({ services }: { services: Service[] }) => {
  const { organizationId } = useParams();
  const supabase = useSupabase();

  const { data: statusData } = useQuery({
    queryKey: ["statusLogs", organizationId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("service_status_logs")
        .select(
          `
            service_id,
            status,
            created_at,
            services(name, organizations(id,slug))
          `
        )
        .eq("services.organizations.slug", organizationId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching status logs:", error);
        throw error;
      }
      return data as StatusLog[];
    },
  });

  const calculateDailyDowntime = () => {
    const dailyDowntime: Record<string, Record<string, number>> = {};
    const now = new Date();

    services.forEach((service) => {
      dailyDowntime[service.id] = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];
        dailyDowntime[service.id][dateString] = 0; // Initialize with 0 minutes of downtime
      }
    });

    if (statusData) {
      statusData.forEach((log, index) => {
        const startDate = new Date(log.created_at);
        const dateString = startDate.toISOString().split("T")[0];

        if (log.status !== "operational") {
          const endDate =
            index < statusData.length - 1
              ? new Date(statusData[index + 1].created_at)
              : new Date(); // Use current time for the last log

          const downtimeMinutes = Math.floor(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60)
          );
          dailyDowntime[log.service_id][dateString] += downtimeMinutes;
        }
      });
    }

    return dailyDowntime;
  };

  const dailyDowntime = calculateDailyDowntime();

  const getDowntimeColor = (downtimeMinutes: number) => {
    if (downtimeMinutes === 0) return "bg-green-500";
    if (downtimeMinutes < 60) return "bg-green-300"; // Less than 1 hour
    if (downtimeMinutes < 180) return "bg-yellow-300"; // Less than 3 hours
    if (downtimeMinutes < 360) return "bg-orange-300"; // Less than 6 hours
    return "bg-red-500"; // 6 hours or more
  };

  const formatDowntime = (minutes: number) => {
    if (minutes === 0) return "No downtime";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${
      remainingMinutes !== 1 ? "s" : ""
    }`;
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">30-Day Status History</h3>
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="border-b pb-6">
            <div className="text-sm font-medium mb-1">{service.name}</div>
            <div className="grid grid-cols-31 gap-1">
              {Object.entries(dailyDowntime[service.id]).map(
                ([date, downtime]) => (
                  <div
                    key={date}
                    className={`w-6 h-12 rounded-2xl ${getDowntimeColor(
                      downtime
                    )}`}
                    title={`${service.name} - ${date}: ${formatDowntime(
                      downtime
                    )} of downtime`}
                  ></div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
