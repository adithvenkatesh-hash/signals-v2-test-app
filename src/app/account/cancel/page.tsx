'use client';

import { useEffect, useState } from 'react';
import { readSessionState, writeSessionState, type SessionState } from '@/lib/session-state';

/**
 * Feature flag for the self-serve cancellation explainer copy. Switched off for
 * the billing migration so the old and new billing systems could not disagree
 * about what to tell the customer.
 */
const SHOW_CANCELLATION_BLOCK_REASON = false;

const CANCELLATION_REASONS = [
  'Too expensive',
  'Missing features we need',
  'Switching to another tool',
  'No longer needed',
];

/**
 * Accounts that have already paid for a term cannot be cancelled self-serve —
 * the refund has to be worked out by billing support first.
 */
function cancellationBlockReason(state: SessionState): string | null {
  if (state.billingCycle === 'annual' && state.prepaidDaysRemaining > 0) {
    return `This subscription is prepaid for another ${state.prepaidDaysRemaining} days. Contact billing support to cancel and arrange a refund.`;
  }
  return null;
}

export default function AccountCancelPage() {
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    setBlockReason(cancellationBlockReason(readSessionState()));
  }, []);

  function handleConfirm() {
    writeSessionState({ billingCycle: 'monthly', prepaidDaysRemaining: 0 });
    setCancelled(true);
  }

  if (cancelled) {
    return (
      <div className="card">
        <p className="step-label">Account · Step 3 of 3</p>
        <div className="success-banner" data-testid="account-cancel-success">
          Your subscription has been cancelled.
        </div>
        <h1 id="account-cancel-heading">Subscription cancelled</h1>
        <p className="lede">You keep access until the end of the current billing period.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="step-label">Account · Step 3 of 3</p>
      <h1 id="account-cancel-heading">Cancel your subscription</h1>
      <p className="lede">
        Cancelling stops the next invoice. Your data stays available for 30 days.
      </p>

      <label className="field" htmlFor="account-cancel-reason">
        <span>Why are you leaving?</span>
        <select
          id="account-cancel-reason"
          data-testid="account-cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {CANCELLATION_REASONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {/*
        KNOWN DEFECT (Account / cancel): when `blockReason` is set the confirm
        button below goes `disabled`, but the explanation is only rendered behind
        `SHOW_CANCELLATION_BLOCK_REASON`, which has been off since the billing
        migration. Annual customers mid-term therefore land on a page whose only
        button is greyed out with nothing saying why or what to do instead — a
        dead end. They click at it, then leave.
      */}
      {SHOW_CANCELLATION_BLOCK_REASON && blockReason ? (
        <p className="form-error" data-testid="account-cancel-block-reason">
          {blockReason}
        </p>
      ) : null}

      <div className="button-row">
        <button
          id="account-cancel-confirm"
          data-testid="account-cancel-confirm"
          type="button"
          disabled={blockReason !== null}
          onClick={handleConfirm}
        >
          Confirm cancellation
        </button>
      </div>
    </div>
  );
}
