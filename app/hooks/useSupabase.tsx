import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { useTypedRouteLoaderData } from "./useTypedRouteLoaderData";

export const useSupabase = () => {
  const { env } = useTypedRouteLoaderData("root");
  const [supabase] = useState(
    createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  return supabase;
};
