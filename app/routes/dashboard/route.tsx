import {
  LoaderFunctionArgs,
  redirect,
  MetaFunction,
} from "@remix-run/cloudflare";
import { json, Outlet } from "@remix-run/react";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { createServerSupabase } from "~/utils/supabase.server";
import { metaGenerator } from "~/utils/metaGenerator";

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

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
