import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { json, Outlet } from "@remix-run/react";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
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
