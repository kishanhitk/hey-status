import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabase(request, context.cloudflare.env);
  const { data: services } = await supabase.from("services").select("*");
  return json({ services });
}

export default function Services() {
  const { services } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Services</h1>
      {/* Add service management UI here */}
    </div>
  );
}
