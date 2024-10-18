import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: incidents } = await supabase.from("incidents").select("*");
  return json({ incidents });
}

export default function Incidents() {
  const { incidents } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Incidents</h1>
      {/* Add incident management UI here */}
    </div>
  );
}
