'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readSessionState, type BillingCycle } from '@/lib/session-state';

const SEATS = 12;
const SEAT_PRICE = { monthly: 49, annual: 39 } as const;

export default function AccountBillingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [prepaidDaysRemaining, setPrepaidDaysRemaining] = useState(0);

  useEffect(() => {
    const state = readSessionState();
    setBillingCycle(state.billingCycle);
    setPrepaidDaysRemaining(state.prepaidDaysRemaining);
  }, []);

  const total = SEATS * SEAT_PRICE[billingCycle] * (billingCycle === 'annual' ? 12 : 1);

  return (
    <div className="card">
      <p className="step-label">Account · Step 2 of 3</p>
      <h1 id="account-billing-heading">Billing</h1>
      <p className="lede">Invoices and payment method for this workspace.</p>

      <div className="summary" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
        <dl>
          <dt>Billing cycle</dt>
          <dd data-testid="account-billing-cycle">{billingCycle}</dd>
          <dt>Seats</dt>
          <dd>{SEATS}</dd>
          <dt>Next invoice</dt>
          <dd data-testid="account-billing-total">${total.toLocaleString()}</dd>
          <dt>Term remaining</dt>
          <dd data-testid="account-billing-days-remaining">
            {prepaidDaysRemaining > 0 ? `${prepaidDaysRemaining} days` : 'None — renews monthly'}
          </dd>
        </dl>
      </div>

      <h2>Payment method</h2>
      <p className="lede">Visa ending 4242, expires 09/28.</p>

      <div className="button-row">
        <button
          id="account-billing-cancel-plan"
          data-testid="account-billing-cancel-plan"
          type="button"
          onClick={() => router.push('/account/cancel')}
        >
          Cancel subscription
        </button>
        <button
          id="account-billing-back"
          data-testid="account-billing-back"
          className="secondary"
          type="button"
          onClick={() => router.push('/account/plan')}
        >
          Back to plan
        </button>
      </div>
    </div>
  );
}
