'use client';

import { useEffect } from 'react';
import PublicPortalFooter from './PublicPortalFooter';
import PublicPortalHeader from './PublicPortalHeader';

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('theme-gov');
    return () => {
      document.documentElement.classList.remove('theme-gov');
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicPortalHeader />
      <div className="flex-1">{children}</div>
      <PublicPortalFooter />
    </div>
  );
}
