'use client';

import AppFooter from './AppFooter';
import GovPortalHeader from './GovPortalHeader';

export default function UserRoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <GovPortalHeader />
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}
