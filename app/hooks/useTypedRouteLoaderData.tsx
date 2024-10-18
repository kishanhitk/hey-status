import { useRouteLoaderData } from "@remix-run/react";
import type { SerializeFrom } from "@remix-run/cloudflare";
import type { loader as RootLoader } from "~/root";

type Loaders = {
  root: typeof RootLoader;
};

export function useTypedRouteLoaderData<T extends keyof Loaders>(route: T) {
  return useRouteLoaderData(route) as SerializeFrom<Loaders[T]>;
}
