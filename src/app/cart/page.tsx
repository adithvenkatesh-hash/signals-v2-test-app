'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readSessionState, writeSessionState } from '@/lib/session-state';

const LINE_ITEMS = [
  { sku: 'NW-1041', name: 'Recycled kraft mailer, 100 ct', unitPrice: 24.0 },
  { sku: 'NW-2219', name: 'Thermal label roll, 500 ct', unitPrice: 31.5 },
];

export default function CartPage() {
  const router = useRouter();
  const [itemCount, setItemCount] = useState(LINE_ITEMS.length);

  useEffect(() => {
    setItemCount(readSessionState().cartItemCount || LINE_ITEMS.length);
  }, []);

  const subtotal = LINE_ITEMS.reduce((total, item) => total + item.unitPrice, 0);

  function handleCheckout() {
    writeSessionState({ cartItemCount: itemCount });
    router.push('/checkout/shipping');
  }

  return (
    <div className="card">
      <p className="step-label">Checkout · Step 1 of 4</p>
      <h1 id="cart-heading">Your cart</h1>
      <p className="lede">{itemCount} items ready to ship.</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: 8 }}>Item</th>
            <th style={{ textAlign: 'right', paddingBottom: 8 }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {LINE_ITEMS.map((item) => (
            <tr key={item.sku}>
              <td style={{ padding: '6px 0' }}>
                {item.name}
                <br />
                <span style={{ color: 'var(--muted)' }}>{item.sku}</span>
              </td>
              <td style={{ padding: '6px 0', textAlign: 'right' }}>${item.unitPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary">
        <dl>
          <dt>Subtotal</dt>
          <dd>${subtotal.toFixed(2)}</dd>
        </dl>
      </div>

      <div className="button-row">
        <button
          id="cart-checkout-start"
          data-testid="cart-checkout-start"
          type="button"
          onClick={handleCheckout}
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}
