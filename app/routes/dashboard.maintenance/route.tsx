import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: maintenances } = await supabase
    .from("scheduled_maintenances")
    .select("*");
  return json({ maintenances });
}

export default function Maintenance() {
  const { maintenances } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Scheduled Maintenance</h1>
      {/* Add maintenance management UI here */}
    </div>
  );
}
