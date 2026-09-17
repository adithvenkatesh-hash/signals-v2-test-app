'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readSessionState } from '@/lib/session-state';

/** Module-level guard: onboarding is a one-time milestone per session. */
const trackedOnboarding = new Set<string>();

export default function WorkspacePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    const state = readSessionState();
    setFullName(state.profileFullName);
    const domain = state.signupEmail.split('@')[1] ?? '';
    const wsName = domain ? domain.split('.')[0] : 'my-workspace';
    setWorkspaceName(wsName);

    if (!trackedOnboarding.has(wsName) && typeof pendo !== 'undefined') {
      trackedOnboarding.add(wsName);
      pendo.track('onboarding_completed', {
        workspaceName: wsName,
        emailDomain: domain,
      });
    }
  }, []);

  return (
    <div className="card">
      <p className="step-label">Signup · Step 4 of 4</p>
      <div className="success-banner">Your workspace is ready.</div>
      <h1 id="workspace-heading">Welcome to your workspace</h1>
      <p className="lede">
        {fullName ? `${fullName}, you` : 'You'} can start inviting teammates whenever you like.
      </p>

      <div className="summary">
        <dl>
          <dt>Workspace</dt>
          <dd data-testid="workspace-name">{workspaceName || '—'}</dd>
          <dt>Plan</dt>
          <dd>Trial — 14 days left</dd>
        </dl>
      </div>

      <div className="button-row">
        <button
          id="signup-workspace-finish"
          data-testid="signup-workspace-finish"
          type="button"
          onClick={() => router.push('/')}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
