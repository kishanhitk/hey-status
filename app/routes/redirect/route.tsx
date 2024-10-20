import {
  LoaderFunctionArgs,
  redirect,
  MetaFunction,
} from "@remix-run/cloudflare";
import { createServerSupabase } from "~/utils/supabase.server";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Redirecting",
    description: "Please wait while we redirect you to the appropriate page.",
  });
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;

  const { supabase } = createServerSupabase(request, env);

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return redirect("/dashboard");
}
