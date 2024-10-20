import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { useTypedRouteLoaderData } from "./useTypedRouteLoaderData";
import { Database } from "~/types/supabase";

export const useSupabase = () => {
  const { env } = useTypedRouteLoaderData("root");
  const [supabase] = useState(
    createBrowserClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  return supabase;
};
