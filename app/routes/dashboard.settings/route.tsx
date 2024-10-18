import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: settings } = await supabase
    .from("organizations")
    .select("*")
    .single();
  return json({ settings });
}

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Application Settings</h1>
      {/* Add settings management UI here */}
    </div>
  );
}
