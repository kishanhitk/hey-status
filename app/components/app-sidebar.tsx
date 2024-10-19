import * as React from "react";
import { BarChart2, Bell, Calendar, Home, Settings, Users } from "lucide-react";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";
import { useUser } from "~/hooks/useUser";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Analytics", url: "/dashboard/analytics" },
      ],
    },
    {
      title: "Services",
      url: "/dashboard/services",
      icon: BarChart2,

      items: [
        { title: "All Services", url: "/dashboard/services" },
        { title: "Add New Service", url: "/dashboard/services/new" },
      ],
    },
    {
      title: "Incidents",
      url: "/dashboard/incidents",
      icon: Bell,
      items: [
        { title: "Active Incidents", url: "/dashboard/incidents" },
        { title: "Incident History", url: "/dashboard/incidents/history" },
        { title: "Report Incident", url: "/dashboard/incidents/new" },
      ],
    },
    {
      title: "Maintenance",
      url: "/dashboard/maintenance",
      icon: Calendar,
      items: [
        { title: "Scheduled Maintenance", url: "/dashboard/maintenance" },
        { title: "Schedule New", url: "/dashboard/maintenance/new" },
      ],
    },
    {
      title: "Team",
      url: "/dashboard/team",
      icon: Users,
      items: [
        { title: "Team Members", url: "/dashboard/team" },
        { title: "Invite Member", url: "/dashboard/team/invite" },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
      items: [
        { title: "General", url: "/dashboard/settings" },
        { title: "Notifications", url: "/dashboard/settings/notifications" },
        { title: "API", url: "/dashboard/settings/api" },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>Org</SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser
            user={{
              name: user?.profile.full_name ?? "",
              email: user?.email ?? "",
              avatar: user?.profile.avatar_url ?? "",
            }}
          />
        ) : (
          <div>Loading...</div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
