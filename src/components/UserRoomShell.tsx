'use client';

import { useEffect } from 'react';
import AppFooter from './AppFooter';
import GovPortalHeader from './GovPortalHeader';

export default function UserRoomShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('theme-gov');
    return () => {
      document.documentElement.classList.remove('theme-gov');
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <GovPortalHeader />
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}
