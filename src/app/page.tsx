import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Home',
};

export default function HomePage() {
  return (
    <>
      <h1 id="home-heading">Northwind Supply</h1>
      <p className="lede">
        Three self-contained product areas. Each one is a linear flow with a single primary action
        per step.
      </p>

      <div className="flow-grid">
        <section className="flow-card" aria-labelledby="home-checkout-heading">
          <h2 id="home-checkout-heading">Checkout</h2>
          <ol>
            <li>Cart</li>
            <li>Shipping</li>
            <li>Payment</li>
            <li>Confirmation</li>
          </ol>
          <Link href="/cart">
            <button id="home-start-checkout" data-testid="home-start-checkout" type="button">
              Go to cart
            </button>
          </Link>
        </section>

        <section className="flow-card" aria-labelledby="home-signup-heading">
          <h2 id="home-signup-heading">Signup &amp; onboarding</h2>
          <ol>
            <li>Create account</li>
            <li>Verify email</li>
            <li>Profile</li>
            <li>Workspace</li>
          </ol>
          <Link href="/signup">
            <button id="home-start-signup" data-testid="home-start-signup" type="button">
              Create an account
            </button>
          </Link>
        </section>

        <section className="flow-card" aria-labelledby="home-account-heading">
          <h2 id="home-account-heading">Account &amp; billing</h2>
          <ol>
            <li>Plan</li>
            <li>Billing</li>
            <li>Cancel</li>
          </ol>
          <Link href="/account/plan">
            <button id="home-start-account" data-testid="home-start-account" type="button">
              Manage account
            </button>
          </Link>
        </section>
      </div>
    </>
  );
}
