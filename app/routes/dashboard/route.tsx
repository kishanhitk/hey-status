import {
  LoaderFunctionArgs,
  redirect,
  MetaFunction,
} from "@remix-run/cloudflare";
import { json, Outlet } from "@remix-run/react";
import { AppSidebar } from "~/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "~/components/ui/sidebar";
import { createServerSupabase } from "~/utils/supabase.server";
import { metaGenerator } from "~/utils/metaGenerator";
import { Button } from "~/components/ui/button";
import { Menu } from "lucide-react";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Dashboard",
    description: "Manage your services, incidents, and maintenance schedules.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  return json({});
}

function DashboardHeader() {
  const { toggleSidebar, isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mr-2"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <h1 className="text-lg font-semibold">HeyStatus Dashboard</h1>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
