import { Outlet } from "@remix-run/react";
import { MetaFunction } from "@remix-run/cloudflare";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Incidents",
    description: "Manage and track incidents affecting your services.",
  });
};

export default function IncidentsLayout() {
  return <Outlet />;
}
