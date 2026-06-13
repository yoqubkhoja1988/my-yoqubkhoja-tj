import PublicSiteShell from '@/components/PublicSiteShell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicSiteShell>{children}</PublicSiteShell>;
}
