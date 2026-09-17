import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout — Confirmation',
};

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
