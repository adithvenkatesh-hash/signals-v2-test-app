/**
 * Synthetic traffic generator for the Signals V2 test fixture.
 *
 * Drives real Chromium sessions against a locally running copy of the app so an
 * analytics agent (once installed) sees genuine page views and click events.
 * Every session gets its own browser context and its own visitor id, and the
 * per-flow drop-off is deliberately asymmetric so the funnels have something
 * worth finding.
 *
 * Usage:
 *   npm run build && npm start        # serve the app on http://localhost:4300
 *   npm run traffic                   # in a second terminal
 *
 * Overrides (environment variables):
 *   TRAFFIC_BASE_URL     default http://localhost:4300
 *   TRAFFIC_SESSIONS     default 200
 *   TRAFFIC_CONCURRENCY  default 4
 *   TRAFFIC_HEADED       set to 1 to watch the browsers
 *   TRAFFIC_VERIFY_FAIL  'wait-for-expiry' (default) or 'wrong-code'
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.TRAFFIC_BASE_URL ?? 'http://localhost:4300';
const SESSION_COUNT = Number(process.env.TRAFFIC_SESSIONS ?? 200);
const CONCURRENCY = Number(process.env.TRAFFIC_CONCURRENCY ?? 4);
const HEADLESS = process.env.TRAFFIC_HEADED !== '1';

/**
 * localStorage key each session's visitor id is written to, before the first
 * navigation, via a Playwright init script.
 *
 * INTEGRATION POINT: once the analytics install PR lands, confirm that the
 * agent's initialize call identifies the visitor from this key. If it generates
 * its own anonymous id instead, every session in a run still looks like a
 * distinct visitor (fresh browser context per session), but the ids will not
 * match the ones logged here.
 */
const VISITOR_ID_STORAGE_KEY = 's2ta_visitor_id';

/** How much of the traffic goes down each flow. Must sum to 1. */
const FLOW_MIX = {
  checkout: 0.4,
  signup: 0.35,
  account: 0.25,
} as const;

/**
 * Cumulative reach rates, as a fraction of the sessions that START the flow.
 * Each array must be non-increasing — entry `i` is the probability of reaching
 * step `i + 1` of the flow (step 0 is the entry page, always reached).
 */
const CHECKOUT_REACH_RATES = [
  0.95, // /checkout/shipping
  0.85, // /checkout/payment
  0.35, // /checkout/confirmation  <- suppressed by the hidden card error
];

const SIGNUP_REACH_RATES = [
  0.9, // /verify
  0.4, // /profile  <- suppressed by the 15s verification code lifetime
  0.34, // /workspace (~85% of the visitors who got past verification)
];

const ACCOUNT_REACH_RATES = [
  0.7, // /account/billing
  0.45, // /account/cancel
  0.25, // cancellation confirmed <- suppressed by the unexplained disabled button
];

/** Think time between steps, in milliseconds. */
const THINK_TIME_MS = { min: 500, max: 2200 } as const;

/** Card that clears validation, and one that the Luhn check rejects. */
const GOOD_CARD = '4242 4242 4242 4242';
const DECLINED_CARD = '4111 1111 1111 1112';

/**
 * How abandoning sessions fail the verification step.
 *  - 'wait-for-expiry' exercises the real defect: idle past the code lifetime,
 *    then submit the (now dead) code. Costs ~16s per abandoning session.
 *  - 'wrong-code' is the fast approximation for large runs.
 */
const VERIFY_FAIL_MODE: 'wait-for-expiry' | 'wrong-code' =
  process.env.TRAFFIC_VERIFY_FAIL === 'wrong-code' ? 'wrong-code' : 'wait-for-expiry';

/** Must exceed the app's verification code lifetime. */
const VERIFY_EXPIRY_WAIT_MS = 16_000;

const NAV_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Flow definitions
// ---------------------------------------------------------------------------

type FlowName = keyof typeof FLOW_MIX;

const FLOW_STEPS: Record<FlowName, readonly string[]> = {
  checkout: ['/cart', '/checkout/shipping', '/checkout/payment', '/checkout/confirmation'],
  signup: ['/signup', '/verify', '/profile', '/workspace'],
  account: ['/account/plan', '/account/billing', '/account/cancel', 'cancellation confirmed'],
};

const FLOW_REACH_RATES: Record<FlowName, readonly number[]> = {
  checkout: CHECKOUT_REACH_RATES,
  signup: SIGNUP_REACH_RATES,
  account: ACCOUNT_REACH_RATES,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function think(): Promise<void> {
  return sleep(randomInt(THINK_TIME_MS.min, THINK_TIME_MS.max));
}

function pickFlow(): FlowName {
  const draw = Math.random();
  let cumulative = 0;
  for (const [flow, share] of Object.entries(FLOW_MIX) as [FlowName, number][]) {
    cumulative += share;
    if (draw < cumulative) {
      return flow;
    }
  }
  return 'account';
}

/**
 * Returns the index of the furthest step this session will reach, given
 * non-increasing cumulative reach rates. Index 0 means "entry page only".
 */
function drawFurthestStepIndex(reachRates: readonly number[]): number {
  const draw = Math.random();
  let furthest = 0;
  for (let index = 0; index < reachRates.length; index += 1) {
    if (draw < reachRates[index]) {
      furthest = index + 1;
    } else {
      break;
    }
  }
  return furthest;
}

function randomEmail(sessionIndex: number): string {
  return `visitor${sessionIndex}@northwind-${randomInt(100, 999)}.example`;
}

async function goto(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
}

async function clickAndWait(page: Page, id: string, expectedPath: string): Promise<void> {
  await page.click(`#${id}`);
  await page.waitForURL(`**${expectedPath}`, { timeout: NAV_TIMEOUT_MS });
}

/**
 * The verification code is generated in an effect after hydration, so the
 * placeholder is on screen for a moment. Wait for the real six digits rather
 * than racing it.
 */
async function readIssuedCode(page: Page): Promise<string> {
  const code = page.locator('[data-testid="verify-issued-code"]');
  await code.filter({ hasText: /^\d{6}$/ }).waitFor({ timeout: NAV_TIMEOUT_MS });
  return ((await code.textContent()) ?? '').trim();
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

async function runCheckoutFlow(page: Page, furthest: number): Promise<number> {
  await goto(page, '/cart');
  await think();
  if (furthest < 1) {
    return 0;
  }

  await clickAndWait(page, 'cart-checkout-start', '/checkout/shipping');
  await page.fill('#checkout-shipping-name', 'Dana Whitfield');
  await page.fill('#checkout-shipping-street', `${randomInt(10, 990)} Harbour Road`);
  await page.fill('#checkout-shipping-city', 'Raleigh');
  await page.fill('#checkout-shipping-postal-code', String(randomInt(27601, 27699)));
  await think();
  if (furthest < 2) {
    return 1;
  }

  await clickAndWait(page, 'checkout-shipping-continue', '/checkout/payment');
  await think();

  if (furthest < 3) {
    // Abandoning at payment: the card is declined, the reason flashes out of the
    // DOM before it can be read, so the shopper retries the same number once and
    // then leaves.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.fill('#checkout-payment-card-number', DECLINED_CARD);
      await page.fill('#checkout-payment-expiry', '09/28');
      await page.fill('#checkout-payment-cvc', String(randomInt(100, 999)));
      await page.click('#checkout-payment-submit');
      await sleep(randomInt(900, 2400));
    }
    return 2;
  }

  await page.fill('#checkout-payment-card-number', GOOD_CARD);
  await page.fill('#checkout-payment-expiry', '09/28');
  await page.fill('#checkout-payment-cvc', String(randomInt(100, 999)));
  await clickAndWait(page, 'checkout-payment-submit', '/checkout/confirmation');
  await think();
  await page.click('#checkout-confirmation-done');
  return 3;
}

async function runSignupFlow(page: Page, furthest: number, sessionIndex: number): Promise<number> {
  await goto(page, '/signup');
  await page.fill('#signup-email', randomEmail(sessionIndex));
  await page.fill('#signup-password', 'correct-horse-battery');
  await think();
  if (furthest < 1) {
    return 0;
  }

  await clickAndWait(page, 'signup-create-account', '/verify');

  if (furthest < 2) {
    // Abandoning at verification: the code dies 15 seconds after render, so the
    // visitor who goes to their inbox and comes back is always too late.
    if (VERIFY_FAIL_MODE === 'wait-for-expiry') {
      const issuedCode = await readIssuedCode(page);
      await sleep(VERIFY_EXPIRY_WAIT_MS);
      await page.fill('#signup-verify-code', issuedCode);
    } else {
      await think();
      await page.fill('#signup-verify-code', String(randomInt(100000, 999999)));
    }
    await page.click('#signup-verify-submit');
    await sleep(randomInt(900, 2000));
    await page.click('#signup-verify-resend');
    await sleep(randomInt(900, 2000));
    return 1;
  }

  const issuedCode = await readIssuedCode(page);
  await page.fill('#signup-verify-code', issuedCode);
  await clickAndWait(page, 'signup-verify-submit', '/profile');
  await page.fill('#signup-profile-name', 'Dana Whitfield');
  await think();
  if (furthest < 3) {
    return 2;
  }

  await clickAndWait(page, 'signup-profile-continue', '/workspace');
  await think();
  await page.click('#signup-workspace-finish');
  return 3;
}

async function runAccountFlow(page: Page, furthest: number): Promise<number> {
  await goto(page, '/account/plan');

  // Sessions that will not complete the cancellation are the ones on an annual
  // term — that is exactly the state where the confirm button is disabled with
  // no explanation.
  const willComplete = furthest >= 3;
  await page.click(willComplete ? '#account-plan-select-monthly' : '#account-plan-select-annual');
  await think();
  if (furthest < 1) {
    return 0;
  }

  await clickAndWait(page, 'account-plan-manage', '/account/billing');
  await think();
  if (furthest < 2) {
    return 1;
  }

  await clickAndWait(page, 'account-billing-cancel-plan', '/account/cancel');
  await page.selectOption('#account-cancel-reason', { index: randomInt(0, 3) });
  await think();
  if (furthest < 3) {
    // Dead end: the only button on the page is greyed out and nothing says why.
    await page.hover('#account-cancel-confirm').catch(() => undefined);
    await sleep(randomInt(1200, 3000));
    return 2;
  }

  await page.click('#account-cancel-confirm');
  await page.waitForSelector('[data-testid="account-cancel-success"]', {
    timeout: NAV_TIMEOUT_MS,
  });
  return 3;
}

// ---------------------------------------------------------------------------
// Session driver
// ---------------------------------------------------------------------------

interface SessionResult {
  flow: FlowName;
  visitorId: string;
  intendedStep: number;
  reachedStep: number;
  error?: string;
}

async function runSession(browser: Browser, sessionIndex: number): Promise<SessionResult> {
  const flow = pickFlow();
  const furthest = drawFurthestStepIndex(FLOW_REACH_RATES[flow]);
  const visitorId = `s2ta-${Date.now().toString(36)}-${sessionIndex}-${randomInt(1000, 9999)}`;

  let context: BrowserContext | undefined;
  try {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(
      ([key, value]: [string, string]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // Storage unavailable: the session still runs, it is just anonymous.
        }
      },
      [VISITOR_ID_STORAGE_KEY, visitorId] as [string, string],
    );

    const page = await context.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);

    let reached: number;
    if (flow === 'checkout') {
      reached = await runCheckoutFlow(page, furthest);
    } else if (flow === 'signup') {
      reached = await runSignupFlow(page, furthest, sessionIndex);
    } else {
      reached = await runAccountFlow(page, furthest);
    }

    return { flow, visitorId, intendedStep: furthest, reachedStep: reached };
  } catch (error) {
    return {
      flow,
      visitorId,
      intendedStep: furthest,
      reachedStep: -1,
      error: error instanceof Error ? error.message.split('\n')[0] : String(error),
    };
  } finally {
    await context?.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printSummary(results: SessionResult[]): void {
  console.log('\n=== Traffic summary ===');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Sessions: ${results.length} (concurrency ${CONCURRENCY})`);

  const failures = results.filter((result) => result.error);
  if (failures.length > 0) {
    console.log(`\nErrored sessions: ${failures.length}`);
    const byMessage = new Map<string, number>();
    for (const failure of failures) {
      const key = failure.error ?? 'unknown';
      byMessage.set(key, (byMessage.get(key) ?? 0) + 1);
    }
    for (const [message, count] of byMessage) {
      console.log(`  ${count.toString().padStart(4)}  ${message}`);
    }
  }

  for (const flow of Object.keys(FLOW_STEPS) as FlowName[]) {
    const flowResults = results.filter((result) => result.flow === flow && !result.error);
    const started = flowResults.length;
    console.log(`\n--- ${flow} (${started} sessions) ---`);
    if (started === 0) {
      continue;
    }
    FLOW_STEPS[flow].forEach((stepName, index) => {
      const reached = flowResults.filter((result) => result.reachedStep >= index).length;
      const share = ((reached / started) * 100).toFixed(1);
      console.log(
        `  ${String(index + 1).padStart(2)}. ${stepName.padEnd(28)} ${String(reached).padStart(4)}  ${share.padStart(5)}%`,
      );
    });
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!Number.isFinite(SESSION_COUNT) || SESSION_COUNT < 1) {
    throw new Error(`TRAFFIC_SESSIONS must be a positive number, got "${SESSION_COUNT}"`);
  }
  if (!Number.isFinite(CONCURRENCY) || CONCURRENCY < 1) {
    throw new Error(`TRAFFIC_CONCURRENCY must be a positive number, got "${CONCURRENCY}"`);
  }

  console.log(`Starting ${SESSION_COUNT} sessions against ${BASE_URL}`);
  console.log(`Concurrency ${CONCURRENCY}, headless ${HEADLESS}, verify-fail ${VERIFY_FAIL_MODE}`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const results: SessionResult[] = [];
  let nextIndex = 0;
  let completed = 0;
  const startedAt = Date.now();

  async function worker(): Promise<void> {
    for (;;) {
      const sessionIndex = nextIndex;
      nextIndex += 1;
      if (sessionIndex >= SESSION_COUNT) {
        return;
      }
      const result = await runSession(browser, sessionIndex);
      results.push(result);
      completed += 1;
      if (completed % 10 === 0 || completed === SESSION_COUNT) {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
        console.log(`  ${completed}/${SESSION_COUNT} sessions done (${elapsed}s elapsed)`);
      }
      if (result.error) {
        console.warn(`  ! session ${sessionIndex} (${result.flow}) failed: ${result.error}`);
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, SESSION_COUNT) }, () => worker()),
    );
  } finally {
    await browser.close().catch(() => undefined);
  }

  printSummary(results);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
