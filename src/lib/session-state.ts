/**
 * Tiny localStorage-backed session state.
 *
 * There is no backend in this app on purpose: every flow has to be drivable by a
 * headless browser with zero setup, so all "server" state lives in the browser.
 */

/**
 * Key that identifies the current synthetic visitor.
 *
 * The traffic generator writes this key into localStorage (via a Playwright init
 * script) before the first navigation of every session, so each browser context
 * is a distinct visitor. Analytics agents installed later are expected to read
 * the same key when they identify the visitor.
 */
export const VISITOR_ID_STORAGE_KEY = 's2ta_visitor_id';

const STATE_STORAGE_KEY = 's2ta_session_state';

export type BillingCycle = 'monthly' | 'annual';

export interface SessionState {
  /** Checkout */
  cartItemCount: number;
  shippingCity: string;
  /** Signup */
  signupEmail: string;
  profileFullName: string;
  /** Account */
  billingCycle: BillingCycle;
  /** Days left in the currently prepaid term. Non-zero on annual plans. */
  prepaidDaysRemaining: number;
}

const DEFAULT_STATE: SessionState = {
  cartItemCount: 2,
  shippingCity: '',
  signupEmail: '',
  profileFullName: '',
  billingCycle: 'monthly',
  prepaidDaysRemaining: 0,
};

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === 'monthly' || value === 'annual';
}

function coerce(raw: unknown): SessionState {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_STATE };
  }
  const record = raw as Record<string, unknown>;
  return {
    cartItemCount:
      typeof record.cartItemCount === 'number' ? record.cartItemCount : DEFAULT_STATE.cartItemCount,
    shippingCity:
      typeof record.shippingCity === 'string' ? record.shippingCity : DEFAULT_STATE.shippingCity,
    signupEmail:
      typeof record.signupEmail === 'string' ? record.signupEmail : DEFAULT_STATE.signupEmail,
    profileFullName:
      typeof record.profileFullName === 'string'
        ? record.profileFullName
        : DEFAULT_STATE.profileFullName,
    billingCycle: isBillingCycle(record.billingCycle)
      ? record.billingCycle
      : DEFAULT_STATE.billingCycle,
    prepaidDaysRemaining:
      typeof record.prepaidDaysRemaining === 'number'
        ? record.prepaidDaysRemaining
        : DEFAULT_STATE.prepaidDaysRemaining,
  };
}

export function readSessionState(): SessionState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = window.localStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }
    return coerce(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeSessionState(patch: Partial<SessionState>): SessionState {
  const next = { ...readSessionState(), ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing / storage disabled: the flows still work, they just forget.
    }
  }
  return next;
}

export function readVisitorId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}
