import * as React from "react";
import {
  BarChart2,
  Bell,
  Calendar,
  ExternalLink,
  Globe,
  Home,
  Server,
  Settings,
  Users,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import { useUser } from "~/hooks/useUser";
import { NavUser } from "./nav-user";
import { Link } from "@remix-run/react";
import { ROLES } from "~/lib/constants";
import RoleBasedAccess from "./role-based-access";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();

  const navGroups = [
    {
      label: "Overview",
      allowedRoles: [ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER],
      items: [
        { title: "Home", url: "/dashboard", icon: Home },
        { title: "Analytics", url: "/dashboard/analytics", icon: BarChart2 },
      ],
    },
    {
      allowedRoles: [ROLES.ADMIN, ROLES.EDITOR],
      label: "Management",
      items: [
        { title: "Services", url: "/dashboard/services", icon: Server },
        { title: "Incidents", url: "/dashboard/incidents", icon: Bell },
        { title: "Maintenance", url: "/dashboard/maintenance", icon: Calendar },
      ],
    },
    {
      label: "Administration",
      allowedRoles: [ROLES.ADMIN],
      items: [
        { title: "Team", url: "/dashboard/team", icon: Users },
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {user?.profile?.organization?.name?.charAt(0) || "O"}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user?.profile?.organization?.name || "Organization"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <RoleBasedAccess
            allowedRoles={group.allowedRoles ?? []}
            key={group.label}
          >
            <SidebarGroup>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url} prefetch="intent">
                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </RoleBasedAccess>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Public</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a
                  href={`/${user?.profile?.organization?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center"
                >
                  <Globe />
                  <span>Public Status Page</span>
                  <ExternalLink className="ml-auto size-4" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
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
