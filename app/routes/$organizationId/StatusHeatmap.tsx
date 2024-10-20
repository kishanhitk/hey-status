import { useParams } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "~/hooks/useSupabase";

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
      console.log(data);
      return data;
    },
  });

  const calculateDailyStatus = () => {
    const dailyStatus: Record<string, Record<string, number>> = {};
    const now = new Date();

    services.forEach((service) => {
      dailyStatus[service.id] = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];
        dailyStatus[service.id][dateString] = 100; // Assume 100% uptime by default
      }
    });

    statusData?.forEach((log) => {
      const date = new Date(log.created_at);
      const dateString = date.toISOString().split("T")[0];
      if (dailyStatus[log.service_id][dateString] !== undefined) {
        if (log.status !== "operational") {
          dailyStatus[log.service_id][dateString] -= 25; // Reduce uptime by 25% for each non-operational status
        }
      }
    });

    return dailyStatus;
  };

  const dailyStatus = calculateDailyStatus();

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">30-Day Status History</h3>
      <div className=" gap-1">
        {services.map((service) => (
          <div key={service.id} className="row-span-1 border-b pb-6">
            <div className="text-sm font-medium mb-1">{service.name}</div>
            <div className="grid grid-cols-31 w-full justify-between">
              {Object.entries(dailyStatus[service.id]).map(([date, uptime]) => (
                <div
                  key={date}
                  className={`w-6 h-12 rounded-2xl ${getUptimeColor(uptime)}`}
                  title={`${service.name} - ${date}: ${uptime}% uptime`}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getUptimeColor = (uptime: number) => {
  if (uptime >= 99) return "bg-green-500";
  if (uptime >= 95) return "bg-green-300";
  if (uptime >= 90) return "bg-yellow-300";
  if (uptime >= 80) return "bg-orange-300";
  return "bg-red-500";
};
