import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
  json,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetchers,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useLocation,
} from "@remix-run/react";

import styles from "./tailwind.css?url";
import NProgress from "nprogress";
import nProgressStyles from "./nprogress.css?url";
import { createServerSupabase } from "./utils/supabase.server";
import { useEffect, useMemo } from "react";
import { useSupabase } from "./hooks/useSupabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "~/components/ui/toaster";
import { ThemeProvider } from "./components/theme-provider";

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
  { rel: "stylesheet", href: nProgressStyles },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // 1 minute
    },
  },
});

export default function App() {
  const { session } = useLoaderData<typeof loader>();
  const supabase = useSupabase();
  const revalidator = useRevalidator();
  const location = useLocation();

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

  const transition = useNavigation();

  const fetchers = useFetchers();
  /**
   * This gets the state of every fetcher active on the app and combine it with
   * the state of the global transition (Link and Form), then use them to
   * determine if the app is idle or if it's loading.
   * Here we consider both loading and submitting as loading.
   */
  const state = useMemo<"idle" | "loading">(
    function getGlobalState() {
      const states = [
        transition.state,
        ...fetchers.map((fetcher) => fetcher.state),
      ];
      if (states.every((state) => state === "idle")) return "idle";
      return "loading";
    },
    [transition.state, fetchers]
  );
  useEffect(() => {
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    if (state === "loading") NProgress.start();
    // when the state is idle then we can to complete the progress bar
    if (state === "idle") NProgress.done();
  }, [state, transition.state]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster />
        <Outlet />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
