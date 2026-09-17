'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readSessionState } from '@/lib/session-state';

function buildOrderNumber(): string {
  return `NW-${Math.floor(100000 + Math.random() * 899999)}`;
}

export default function CheckoutConfirmationPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [shippingCity, setShippingCity] = useState('');

  useEffect(() => {
    setOrderNumber(buildOrderNumber());
    setShippingCity(readSessionState().shippingCity);
  }, []);

  return (
    <div className="card">
      <p className="step-label">Checkout · Step 4 of 4</p>
      <div className="success-banner">Payment accepted.</div>
      <h1 id="checkout-confirmation-heading">Order confirmed</h1>
      <p className="lede">A receipt is on its way to your inbox.</p>

      <div className="summary">
        <dl>
          <dt>Order number</dt>
          <dd data-testid="checkout-confirmation-order-number">{orderNumber || '—'}</dd>
          <dt>Shipping to</dt>
          <dd>{shippingCity || '—'}</dd>
        </dl>
      </div>

      <div className="button-row">
        <button
          id="checkout-confirmation-done"
          data-testid="checkout-confirmation-done"
          type="button"
          onClick={() => router.push('/')}
        >
          Back to store
        </button>
      </div>
    </div>
  );
}
