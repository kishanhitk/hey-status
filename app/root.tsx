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

import styles from "./tailwind.css?url";
import { createServerSupabase } from "./utils/supabase.server";
import { useEffect } from "react";
import { useSupabase } from "./hooks/useSupabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;

  const { supabase, headers } = createServerSupabase(request, env);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return json(
    {
      user,
      session,
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
  { rel: "stylesheet", href: styles },
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

const queryClient = new QueryClient();

export default function App() {
  const { session } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const revalidator = useRevalidator();

  const serverAccessToken = session?.access_token;
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token !== serverAccessToken) {
        // server and client are out of sync.
        // Remix recalls active loaders after actions complete
        // if this is a logout, we need to reload the page
        revalidator.revalidate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverAccessToken, supabase]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
