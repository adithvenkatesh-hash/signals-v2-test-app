'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readSessionState, writeSessionState, type BillingCycle } from '@/lib/session-state';

/** Days left in a freshly started annual term. */
const ANNUAL_TERM_DAYS = 214;

export default function AccountPlanPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    setBillingCycle(readSessionState().billingCycle);
  }, []);

  function selectCycle(cycle: BillingCycle) {
    setBillingCycle(cycle);
    writeSessionState({
      billingCycle: cycle,
      prepaidDaysRemaining: cycle === 'annual' ? ANNUAL_TERM_DAYS : 0,
    });
  }

  function handleManageBilling() {
    writeSessionState({
      billingCycle,
      prepaidDaysRemaining: billingCycle === 'annual' ? ANNUAL_TERM_DAYS : 0,
    });
    router.push('/account/billing');
  }

  return (
    <div className="card">
      <p className="step-label">Account · Step 1 of 3</p>
      <h1 id="account-plan-heading">Your plan</h1>
      <p className="lede">Northwind Supply Pro — 12 seats.</p>

      <div className="plan-options">
        <button
          id="account-plan-select-monthly"
          data-testid="account-plan-select-monthly"
          className="plan-option"
          type="button"
          aria-pressed={billingCycle === 'monthly'}
          onClick={() => selectCycle('monthly')}
        >
          <strong>Monthly</strong>
          $49 per seat, billed every month
        </button>
        <button
          id="account-plan-select-annual"
          data-testid="account-plan-select-annual"
          className="plan-option"
          type="button"
          aria-pressed={billingCycle === 'annual'}
          onClick={() => selectCycle('annual')}
        >
          <strong>Annual</strong>
          $39 per seat, billed once a year
        </button>
      </div>

      <div className="summary">
        <dl>
          <dt>Billing cycle</dt>
          <dd data-testid="account-plan-cycle">{billingCycle}</dd>
        </dl>
      </div>

      <div className="button-row">
        <button
          id="account-plan-manage"
          data-testid="account-plan-manage"
          type="button"
          onClick={handleManageBilling}
        >
          Manage billing
        </button>
      </div>
    </div>
  );
}
