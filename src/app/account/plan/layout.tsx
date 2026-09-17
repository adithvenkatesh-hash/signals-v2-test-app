import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account — Plan',
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
