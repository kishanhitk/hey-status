import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { Env } from "load-context";
import { Database } from "~/types/supabase";

export const createServerSupabase = (request: Request, env: Env) => {
  const headers = new Headers();

  const supabase = createServerClient<Database>(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            )
          );
        },
      },
    }
  );

  return {
    supabase,
    headers,
  };
};
