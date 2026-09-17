'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * How long a transient status message stays on screen before it fades out.
 *
 * This was tuned for the "Card saved" confirmation, which should not linger.
 */
const STATUS_AUTO_DISMISS_MS = 400;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (double) {
      value *= 2;
      if (value > 9) {
        value -= 9;
      }
    }
    sum += value;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

function validateCard(cardNumber: string, expiry: string, cvc: string): string | null {
  const digits = cardNumber.replace(/\s+/g, '');
  if (!/^\d{15,16}$/.test(digits)) {
    return 'Card number must be 15 or 16 digits.';
  }
  if (!passesLuhn(digits)) {
    return 'That card number was declined by the issuer. Check the digits and try again.';
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return 'Expiry must use MM/YY format.';
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    return 'Security code must be 3 or 4 digits.';
  }
  return null;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [status, setStatus] = useState<{ tone: 'error' | 'info'; message: string } | null>(null);

  // KNOWN DEFECT (Checkout / payment): the auto-dismiss timer below was added for
  // the short-lived "Card saved" confirmation, but it runs for every status
  // message, including validation failures. A declined card renders its reason
  // into the DOM and then fades it out ~400ms later, which is faster than most
  // people can read. The shopper sees the page "flicker" and stay put, never
  // learns the card was rejected, retries the same number, and abandons.
  useEffect(() => {
    if (!status) {
      return;
    }
    const timer = window.setTimeout(() => setStatus(null), STATUS_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  function handleSubmit() {
    const validationError = validateCard(cardNumber, expiry, cvc);
    if (validationError) {
      setStatus({ tone: 'error', message: validationError });
      return;
    }
    setStatus({ tone: 'info', message: 'Card saved.' });
    router.push('/checkout/confirmation');
  }

  return (
    <div className="card">
      <p className="step-label">Checkout · Step 3 of 4</p>
      <h1 id="checkout-payment-heading">Payment details</h1>
      <p className="lede">We never store your full card number.</p>

      <label className="field" htmlFor="checkout-payment-card-number">
        <span>Card number</span>
        <input
          id="checkout-payment-card-number"
          data-testid="checkout-payment-card-number"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="checkout-payment-expiry">
        <span>Expiry (MM/YY)</span>
        <input
          id="checkout-payment-expiry"
          data-testid="checkout-payment-expiry"
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="checkout-payment-cvc">
        <span>Security code</span>
        <input
          id="checkout-payment-cvc"
          data-testid="checkout-payment-cvc"
          type="text"
          inputMode="numeric"
          autoComplete="cc-csc"
          value={cvc}
          onChange={(event) => setCvc(event.target.value)}
        />
      </label>

      <p
        id="checkout-payment-status"
        data-testid="checkout-payment-status"
        className={status?.tone === 'error' ? 'form-error' : 'lede'}
        role="status"
        style={{
          minHeight: 20,
          opacity: status ? 1 : 0,
          transition: 'opacity 120ms ease-out',
        }}
      >
        {status?.message ?? ''}
      </p>

      <div className="button-row">
        <button
          id="checkout-payment-submit"
          data-testid="checkout-payment-submit"
          type="button"
          onClick={handleSubmit}
        >
          Place order
        </button>
      </div>
    </div>
  );
}
