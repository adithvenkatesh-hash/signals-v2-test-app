import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Northwind Supply',
    template: '%s | Northwind Supply',
  },
  description: 'A small storefront and account console used as an analytics test fixture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" id="site-home-link" data-testid="site-home-link">
            Northwind Supply
          </Link>
          <nav className="site-nav" aria-label="Primary">
            <Link href="/cart" id="site-nav-cart" data-testid="site-nav-cart">
              Cart
            </Link>
            <Link href="/signup" id="site-nav-signup" data-testid="site-nav-signup">
              Create account
            </Link>
            <Link href="/account/plan" id="site-nav-account" data-testid="site-nav-account">
              Account
            </Link>
          </nav>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
