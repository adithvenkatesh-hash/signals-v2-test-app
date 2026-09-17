import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout — Shipping',
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
