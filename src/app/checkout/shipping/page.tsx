'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { writeSessionState } from '@/lib/session-state';

export default function CheckoutShippingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState('');

  function handleContinue() {
    if (!fullName.trim() || !street.trim() || !city.trim() || !postalCode.trim()) {
      setError('Fill in every field before continuing.');
      return;
    }
    setError('');
    writeSessionState({ shippingCity: city.trim() });

    if (typeof pendo !== 'undefined') {
      pendo.track('shipping_address_submitted', {
        shippingCity: city.trim(),
      });
    }

    router.push('/checkout/payment');
  }

  return (
    <div className="card">
      <p className="step-label">Checkout · Step 2 of 4</p>
      <h1 id="checkout-shipping-heading">Shipping address</h1>
      <p className="lede">Where should this order go?</p>

      <label className="field" htmlFor="checkout-shipping-name">
        <span>Full name</span>
        <input
          id="checkout-shipping-name"
          data-testid="checkout-shipping-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="checkout-shipping-street">
        <span>Street address</span>
        <input
          id="checkout-shipping-street"
          data-testid="checkout-shipping-street"
          type="text"
          value={street}
          onChange={(event) => setStreet(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="checkout-shipping-city">
        <span>City</span>
        <input
          id="checkout-shipping-city"
          data-testid="checkout-shipping-city"
          type="text"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="checkout-shipping-postal-code">
        <span>Postal code</span>
        <input
          id="checkout-shipping-postal-code"
          data-testid="checkout-shipping-postal-code"
          type="text"
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
        />
      </label>

      {error ? (
        <p className="form-error" id="checkout-shipping-error" data-testid="checkout-shipping-error">
          {error}
        </p>
      ) : null}

      <div className="button-row">
        <button
          id="checkout-shipping-continue"
          data-testid="checkout-shipping-continue"
          type="button"
          onClick={handleContinue}
        >
          Continue to payment
        </button>
      </div>
    </div>
  );
}
