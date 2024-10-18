import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { User } from "@supabase/supabase-js";
import { useUser } from "~/hooks/useUser";
import { createServerSupabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Database } from "~/types/supabase";

type Service = Database["public"]["Tables"]["services"]["Row"];
type Incident = Database["public"]["Tables"]["incidents"]["Row"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase } = createServerSupabase(request, env);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user as User;

  if (!user) {
    return redirect("/login");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userProfile?.organization_id) {
    return redirect("/create-organization");
  }

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", userProfile.organization_id);

  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .eq("organization_id", userProfile.organization_id)
    .order("created_at", { ascending: false })
    .limit(5);

  return json({ user, userProfile, services, incidents });
}

const DashboardPage = () => {
  const { user, services, incidents } = useLoaderData<typeof loader>();
  const { user: userProfile } = useUser();

  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">
        Welcome to your dashboard, {userProfile?.full_name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Services Overview</CardTitle>
            <CardDescription>Manage your services</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Total Services: {services?.length || 0}</p>
            <Link to="/dashboard/services">
              <Button>Manage Services</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>View and manage incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 mb-4">
              {incidents?.slice(0, 3).map((incident: Incident) => (
                <li key={incident.id}>{incident.title}</li>
              ))}
            </ul>
            <Link to="/dashboard/incidents">
              <Button>View All Incidents</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/team">
              <Button>Manage Team</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/maintenance">
              <Button>View Scheduled Maintenance</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/settings">
              <Button>Manage Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
