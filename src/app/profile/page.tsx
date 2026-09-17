'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { writeSessionState } from '@/lib/session-state';

const ROLES = ['Operations', 'Engineering', 'Finance', 'Support'];

export default function ProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [error, setError] = useState('');

  function handleContinue() {
    if (!fullName.trim()) {
      setError('Tell us what to call you.');
      return;
    }
    setError('');
    writeSessionState({ profileFullName: fullName.trim() });
    router.push('/workspace');
  }

  return (
    <div className="card">
      <p className="step-label">Signup · Step 3 of 4</p>
      <h1 id="profile-heading">Set up your profile</h1>
      <p className="lede">This is how teammates will see you.</p>

      <label className="field" htmlFor="signup-profile-name">
        <span>Full name</span>
        <input
          id="signup-profile-name"
          data-testid="signup-profile-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </label>

      <label className="field" htmlFor="signup-profile-role">
        <span>Role</span>
        <select
          id="signup-profile-role"
          data-testid="signup-profile-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="form-error" id="signup-profile-error" data-testid="signup-profile-error">
          {error}
        </p>
      ) : null}

      <div className="button-row">
        <button
          id="signup-profile-continue"
          data-testid="signup-profile-continue"
          type="button"
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
