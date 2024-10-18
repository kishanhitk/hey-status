import { json, LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { User } from "@supabase/supabase-js";
import { createServerSupabase } from "~/utils/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;

  const { supabase } = createServerSupabase(request, env);

  const { data } = await supabase.from("example_table").select("*");

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

  return json({ user, userProfile, data });
}
