'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { writeSessionState } from '@/lib/session-state';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleCreateAccount() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Enter a valid work email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    writeSessionState({ signupEmail: email });

    if (typeof pendo !== 'undefined') {
      pendo.track('account_created', {
        emailDomain: email.split('@')[1] ?? '',
      });
    }

    router.push('/verify');
  }

  return (
    <div className="card">
      <p className="step-label">Signup · Step 1 of 4</p>
      <h1 id="signup-heading">Create your account</h1>
      <p className="lede">Start a 14-day trial. No card required.</p>

      <label className="field" htmlFor="signup-email">
        <span>Work email</span>
        <input
          id="signup-email"
          data-testid="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="signup-password">
        <span>Password</span>
        <input
          id="signup-password"
          data-testid="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error ? (
        <p className="form-error" id="signup-error" data-testid="signup-error">
          {error}
        </p>
      ) : null}

      <div className="button-row">
        <button
          id="signup-create-account"
          data-testid="signup-create-account"
          type="button"
          onClick={handleCreateAccount}
        >
          Create account
        </button>
      </div>
    </div>
  );
}
