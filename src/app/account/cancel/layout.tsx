import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account — Cancel subscription',
};

export default function CancelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
