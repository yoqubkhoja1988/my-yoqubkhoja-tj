'use client';

import { createContext, useContext } from 'react';

type OrganizationAccess = {
  canEdit: boolean;
  supervisionOnly: boolean;
};

const OrganizationAccessContext = createContext<OrganizationAccess>({
  canEdit: false,
  supervisionOnly: false,
});

export function OrganizationAccessProvider({
  canEdit,
  supervisionOnly,
  children,
}: OrganizationAccess & { children: React.ReactNode }) {
  return (
    <OrganizationAccessContext.Provider value={{ canEdit, supervisionOnly }}>
      {children}
    </OrganizationAccessContext.Provider>
  );
}

export function useOrganizationAccess(): OrganizationAccess {
  return useContext(OrganizationAccessContext);
}
