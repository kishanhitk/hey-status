import { Outlet } from "react-router-dom";
import { MetaFunction } from "@remix-run/cloudflare";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Maintenance",
    description: "Manage scheduled maintenance for your services.",
  });
};

const MaintenanceLayout = () => {
  return <Outlet />;
};

export default MaintenanceLayout;
