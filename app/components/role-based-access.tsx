import React from "react";

import { useUser } from "~/hooks/useUser";

import { Role } from "~/lib/constants";

interface RoleBasedAccessProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  allowedRoles,
  children,
}) => {
  const { user } = useUser();

  if (!user || !allowedRoles.includes(user?.profile?.role as Role)) {
    return null;
  }

  return <>{children}</>;
};

export default RoleBasedAccess;
