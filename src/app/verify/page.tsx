'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { readSessionState } from '@/lib/session-state';

// KNOWN DEFECT (Signup / verify): this was specified as a 15 minute code
// lifetime, but the value is expressed in milliseconds, so the code actually
// dies 15 seconds after the page renders. Nothing on screen counts down, so a
// user who reads the email, switches back and types the code is almost always
// too late. They get a generic "expired" message, request another code, race
// the same 15 seconds, and give up.
/** How long an emailed verification code stays valid — 15 minutes. */
const VERIFICATION_CODE_TTL_MS = 15 * 1000;

function issueCode(): string {
  return String(Math.floor(100000 + Math.random() * 899999));
}

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [issuedCode, setIssuedCode] = useState('');
  const [issuedAt, setIssuedAt] = useState(0);
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');

  const sendCode = useCallback(() => {
    setIssuedCode(issueCode());
    setIssuedAt(Date.now());
    setEntered('');
    setError('');
  }, []);

  useEffect(() => {
    setEmail(readSessionState().signupEmail);
    sendCode();
  }, [sendCode]);

  function handleSubmit() {
    const timeSinceCodeIssued = Date.now() - issuedAt;

    if (timeSinceCodeIssued > VERIFICATION_CODE_TTL_MS) {
      if (typeof pendo !== 'undefined') {
        pendo.track('email_verification_failed', {
          failureReason: 'expired',
          timeSinceCodeIssued,
        });
      }

      setError('That code has expired. Request a new one.');
      return;
    }
    if (entered.trim() !== issuedCode) {
      if (typeof pendo !== 'undefined') {
        pendo.track('email_verification_failed', {
          failureReason: 'incorrect',
          timeSinceCodeIssued,
        });
      }

      setError('That code is incorrect.');
      return;
    }

    if (typeof pendo !== 'undefined') {
      pendo.track('email_verified', {
        timeSinceCodeIssued,
      });
    }

    setError('');
    router.push('/profile');
  }

  return (
    <div className="card">
      <p className="step-label">Signup · Step 2 of 4</p>
      <h1 id="verify-heading">Verify your email</h1>
      <p className="lede">
        We sent a 6-digit code to <strong>{email || 'your inbox'}</strong>.
      </p>

      <p className="code-hint" data-testid="verify-code-hint">
        Non-production build — mail delivery is disabled. Your code is{' '}
        <strong data-testid="verify-issued-code">{issuedCode || '······'}</strong>
      </p>

      <label className="field" htmlFor="signup-verify-code">
        <span>Verification code</span>
        <input
          id="signup-verify-code"
          data-testid="signup-verify-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={entered}
          onChange={(event) => setEntered(event.target.value)}
        />
      </label>

      {error ? (
        <p className="form-error" id="signup-verify-error" data-testid="signup-verify-error">
          {error}
        </p>
      ) : null}

      <div className="button-row">
        <button
          id="signup-verify-submit"
          data-testid="signup-verify-submit"
          type="button"
          onClick={handleSubmit}
        >
          Verify email
        </button>
        <button
          id="signup-verify-resend"
          data-testid="signup-verify-resend"
          className="secondary"
          type="button"
          onClick={sendCode}
        >
          Send a new code
        </button>
      </div>
    </div>
  );
}
