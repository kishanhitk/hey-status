import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";
import { CheckCircle, AlertTriangle, ExternalLink, Info } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSupabase } from "~/hooks/useSupabase";
import {
  INCIDENT_STATUS_ICONS,
  INCIDENT_STATUS_LABELS,
  IncidentStatus,
  MAINTENANCE_IMPACT_LABELS,
  MaintenanceImpact,
  SERVICE_STATUS_ICONS,
  INCIDENT_STATUS_COLORS,
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_STATUS_LABELS,
  MaintenanceStatus,
  ServiceStatus,
  SERVICE_STATUS_COLORS,
} from "~/lib/constants";
import { formatDateTime, formatLocalDateTime } from "~/utils/dateTime";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { StatusHeatmap } from "./StatusHeatmap";
import { toast } from "~/hooks/use-toast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
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
    .select("*")
    .eq("organization_id", organization.id);

  // Fetch active and resolved incidents (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: incidents, error: incidentsError } = await supabase
    .from("incidents")
    .select(
      `
      *,
      services_incidents(service:services(id, name)),
      incident_updates(id, status, message, created_at)
    `
    )
    .eq("organization_id", organization.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .order("created_at", {
      ascending: false,
      foreignTable: "incident_updates",
    });

  if (incidentsError) {
    console.error(incidentsError);
    throw new Error("Failed to fetch incidents");
  }

  // Fetch scheduled maintenances
  const { data: scheduledMaintenances, error: maintenancesError } =
    await supabase
      .from("scheduled_maintenances")
      .select(
        `
      *,
      services_scheduled_maintenances(services(id, name)),
      maintenance_updates(*)
    `
      )
      .eq("organization_id", organization.id)
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .order("created_at", {
        ascending: false,
        foreignTable: "maintenance_updates",
      });

  if (maintenancesError) {
    console.error(maintenancesError);
    throw new Error("Failed to fetch scheduled maintenances");
  }

  return json({
    organization,
    services: services || [],
    incidents: incidents || [],
    scheduledMaintenances: scheduledMaintenances || [],
  });
}

export default function PublicStatusPage() {
  const initialData = useLoaderData<typeof loader>();
  const [organization] = useState(initialData.organization);
  const [services, setServices] = useState(initialData.services);
  const [incidents, setIncidents] = useState(initialData.incidents);
  const [scheduledMaintenances, setScheduledMaintenances] = useState(
    initialData.scheduledMaintenances
  );
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const supabase = useSupabase();

  // Enable Realtime updates
  useEffect(() => {
    const updateLastUpdated = () => setLastUpdated(new Date());

    const showUpdateToast = (message: string) => {
      toast({
        title: "Status Update",
        description: message,
      });
    };

    const servicesSubscription = supabase
      .channel("public:services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        (payload) => {
          setServices((currentServices) => {
            const updatedServices = [...currentServices];
            const index = updatedServices.findIndex(
              (s) => s.id === payload.new.id
            );
            if (index !== -1) {
              updatedServices[index] = {
                ...updatedServices[index],
                ...payload.new,
              };
              showUpdateToast(`Service "${payload.new.name}" status updated.`);
            } else {
              updatedServices.push(payload.new as any);
              showUpdateToast(`New service "${payload.new.name}" added.`);
            }
            return updatedServices;
          });
          updateLastUpdated();
        }
      )
      .subscribe();

    const incidentsSubscription = supabase
      .channel("public:incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        async (payload) => {
          const { data: updatedIncident, error } = await supabase
            .from("incidents")
            .select(
              `
              *,
              services_incidents(service:services(id, name)),
              incident_updates(id, status, message, created_at)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (error) {
            console.error("Error fetching updated incident:", error);
            return;
          }

          setIncidents((currentIncidents) => {
            const updatedIncidents = [...currentIncidents];
            const index = updatedIncidents.findIndex(
              (i) => i.id === updatedIncident.id
            );
            if (index !== -1) {
              updatedIncidents[index] = updatedIncident;
              showUpdateToast(`Incident "${updatedIncident.title}" updated.`);
            } else {
              updatedIncidents.unshift(updatedIncident);
              showUpdateToast(
                `New incident "${updatedIncident.title}" reported.`
              );
            }
            return updatedIncidents;
          });
          updateLastUpdated();
        }
      )
      .subscribe();

    const incidentUpdatesSubscription = supabase
      .channel("public:incident_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incident_updates" },
        async (payload) => {
          const { data: updatedIncident, error } = await supabase
            .from("incidents")
            .select(
              `
              *,
              services_incidents(service:services(id, name)),
              incident_updates(id, status, message, created_at)
            `
            )
            .eq("id", payload.new.incident_id)
            .single();

          if (error) {
            console.error("Error fetching updated incident:", error);
            return;
          }

          setIncidents((currentIncidents) => {
            const updatedIncidents = currentIncidents.map((incident) =>
              incident.id === updatedIncident.id ? updatedIncident : incident
            );
            showUpdateToast(
              `New update for incident "${updatedIncident.title}".`
            );
            return updatedIncidents;
          });
          updateLastUpdated();
        }
      )
      .subscribe();

    const scheduledMaintenancesSubscription = supabase
      .channel("public:scheduled_maintenances")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_maintenances" },
        async (payload) => {
          const { data: updatedMaintenance, error } = await supabase
            .from("scheduled_maintenances")
            .select(
              `
              *,
              services_scheduled_maintenances(services(id, name)),
              maintenance_updates(*)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (error) {
            console.error("Error fetching updated maintenance:", error);
            return;
          }

          setScheduledMaintenances((currentMaintenances) => {
            const updatedMaintenances = [...currentMaintenances];
            const index = updatedMaintenances.findIndex(
              (m) => m.id === updatedMaintenance.id
            );
            if (index !== -1) {
              updatedMaintenances[index] = updatedMaintenance;
              showUpdateToast(
                `Scheduled maintenance "${updatedMaintenance.title}" updated.`
              );
            } else {
              updatedMaintenances.push(updatedMaintenance);
              showUpdateToast(
                `New scheduled maintenance "${updatedMaintenance.title}" added.`
              );
            }
            return updatedMaintenances;
          });
          updateLastUpdated();
        }
      )
      .subscribe();

    return () => {
      servicesSubscription.unsubscribe();
      incidentsSubscription.unsubscribe();
      incidentUpdatesSubscription.unsubscribe();
      scheduledMaintenancesSubscription.unsubscribe();
    };
  }, [supabase, toast]);

  const allOperational = services.every(
    (service) => service.current_status === "operational"
  );

  const getMaintenanceStatus = (maintenance: any): MaintenanceStatus => {
    const now = new Date();
    const startTime = new Date(maintenance.start_time);
    const endTime = new Date(maintenance.end_time);

    if (now < startTime) {
      return MAINTENANCE_STATUS.SCHEDULED;
    } else if (now >= startTime && now < endTime) {
      return MAINTENANCE_STATUS.IN_PROGRESS;
    } else {
      return MAINTENANCE_STATUS.COMPLETED;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="h-8 w-8 text-blue-500"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            <span className="ml-2 text-xl font-bold text-gray-900">
              {organization.name} Status
            </span>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Current Status
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {allOperational ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                )}
                <span className="ml-2 text-xl font-medium text-gray-900">
                  {allOperational
                    ? "All systems operational"
                    : "Some systems are experiencing issues"}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {formatLocalDateTime(lastUpdated.toISOString())}
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Services</h2>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  className={`flex items-center justify-between ${
                    index !== services.length - 1 ? "border-b pb-2" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-lg text-gray-900">
                      {service.name}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 ml-2 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{service.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center">
                    {React.createElement(
                      SERVICE_STATUS_ICONS[
                        service.current_status as ServiceStatus
                      ],
                      {
                        className: `h-5 w-5 ${
                          SERVICE_STATUS_COLORS[
                            service.current_status as ServiceStatus
                          ]
                        }`,
                      }
                    )}
                    <span
                      className={`ml-2 text-sm capitalize ${
                        SERVICE_STATUS_COLORS[
                          service.current_status as ServiceStatus
                        ]
                      }`}
                    >
                      {service.current_status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <StatusHeatmap services={services} />
          {scheduledMaintenances.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Scheduled Maintenance
              </h2>
              <div className="space-y-8">
                {scheduledMaintenances.map((maintenance) => {
                  const status = getMaintenanceStatus(maintenance);
                  return (
                    <div key={maintenance.id} className="border-b pb-6">
                      <h3
                        className={`text-xl font-semibold mb-2 ${MAINTENANCE_STATUS_COLORS[status]}`}
                      >
                        {maintenance.title}
                      </h3>
                      <div className="space-y-2 mb-4">
                        <p className="text-gray-600">
                          Status:{" "}
                          {
                            MAINTENANCE_STATUS_LABELS[
                              status as MaintenanceStatus
                            ]
                          }
                        </p>
                        <p className="text-gray-600">
                          Impact:{" "}
                          {
                            MAINTENANCE_IMPACT_LABELS[
                              maintenance.impact as MaintenanceImpact
                            ]
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          Scheduled: {formatDateTime(maintenance.start_time)} -{" "}
                          {formatDateTime(maintenance.end_time)}
                        </p>
                        <p className="text-gray-600">
                          Affected Services:{" "}
                          {maintenance.services_scheduled_maintenances
                            .map((ssm) => ssm.services?.name)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="space-y-4">
                        {maintenance.maintenance_updates.map((update) => (
                          <div key={update.id}>
                            <div className="text-sm text-gray-500">
                              {formatDateTime(update.created_at)}
                            </div>
                            <p className="text-gray-700">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Incident History
            </h2>
            <div className="space-y-8">
              {incidents.map((incident, index) => (
                <div
                  key={incident.id}
                  className={`${
                    index !== incidents.length - 1 ? "border-b pb-6" : ""
                  }`}
                >
                  <h3
                    className={`text-xl font-semibold mb-2 ${
                      INCIDENT_STATUS_COLORS[
                        incident.incident_updates[0]?.status as IncidentStatus
                      ]
                    }`}
                  >
                    {incident.title}
                  </h3>
                  <div className="space-y-2 mb-4">
                    <p className="text-gray-600">Impact: {incident.impact}</p>
                    <p className="text-gray-600">
                      Affected Services:{" "}
                      {incident.services_incidents
                        .map((si) => si.service?.name)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {incident.incident_updates.map((update) => (
                      <div key={update.id}>
                        <div className="flex items-center">
                          {React.createElement(
                            INCIDENT_STATUS_ICONS[
                              update.status as IncidentStatus
                            ],
                            { className: "h-5 w-5 mr-2" }
                          )}
                          <span className="font-semibold">
                            {
                              INCIDENT_STATUS_LABELS[
                                update.status as IncidentStatus
                              ]
                            }
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(update.created_at)}
                        </div>
                        <p className="text-gray-700">{update.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-gray-500">
            © 2024 {organization.name}. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <a
              className="text-gray-500 hover:text-gray-900 flex items-center"
              href="https://hey-status.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered by HeyStatus <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
