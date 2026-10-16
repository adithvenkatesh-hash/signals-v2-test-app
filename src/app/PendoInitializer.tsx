'use client';

import { useEffect } from 'react';
import { readVisitorId } from '@/lib/session-state';

export default function PendoInitializer() {
  useEffect(() => {
    // The traffic generator writes a per-session id to localStorage before any
    // page script runs, so prefer it when present. Falling back to '' leaves the
    // agent's own anonymous id in place for ordinary browsing.
    pendo.initialize({
      visitor: {
        id: readVisitorId() ?? '',
      },
    });
  }, []);

  return null;
}
