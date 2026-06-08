import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yoqubkhoja Hub',
  description: 'My projects and developments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
