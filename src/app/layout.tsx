import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import PendoInitializer from './PendoInitializer';
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
      <head>
        <Script
          id="pendo-install"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-dev.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('cc891acc-e8b5-4464-8134-86f584e7fe6a');`,
          }}
        />
      </head>
      <body>
        <PendoInitializer />
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
