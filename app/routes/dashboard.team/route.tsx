import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: team } = await supabase.from("users").select("*");
  return json({ team });
}

export default function Team() {
  const { team } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Team Management</h1>
      {/* Add team management UI here */}
    </div>
  );
}
