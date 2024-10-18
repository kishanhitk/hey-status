import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
  json,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
} from "@remix-run/react";

import "./tailwind.css";
import { createServerSupabase } from "./utils/supabase.server";
import { User } from "@supabase/supabase-js";
import { useEffect } from "react";
import { useSupabase } from "./hooks/useSupabase";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;

  const { supabase, headers } = createServerSupabase(request, env);

  const { data } = await supabase.from("example_table").select("*");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user as User;

  return json(
    {
      user,
      session,
      data,
      env: {
        SUPABASE_URL: env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
      },
    },
    {
      headers,
    }
  );
}

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { session } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const revalidator = useRevalidator();

  const serverAccessToken = session?.access_token;
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("session", session);
      console.log("serverAccessToken", serverAccessToken);
      if (session?.access_token !== serverAccessToken) {
        // server and client are out of sync.
        // Remix recalls active loaders after actions complete
        revalidator.revalidate();
        window.location.reload();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverAccessToken, supabase]);

  return <Outlet />;
}
