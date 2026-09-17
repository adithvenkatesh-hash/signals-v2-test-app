# signals-v2-test-app

A deliberately small frontend app ("Northwind Supply") built as a **test fixture for Pendo/Novus
Signals V2**. It exists to produce funnel drop-off with *known ground truth*: three product areas,
each a short linear flow, each containing exactly one planted defect that suppresses conversion at a
specific step.

Because the ground truth is known, the output of Signals V2 can be graded: did it surface the right
three problems, at the right steps, for the right reasons?

## Deliberately not instrumented

**There is no analytics snippet in this repository, on purpose.** No `pendo.initialize`, no agent
package, no API key, nothing. Novus's onboarding workflow (`InstallPendoWebStep`) opens a pull
request against this repo that installs the snippet itself, and exercising that path is part of what
this fixture is for. Do not pre-install it — you would be testing a different thing.

## Requirements

- Node.js 20 or newer (developed against Node 22)
- npm

## Install and run

```bash
npm install
npm run dev          # http://localhost:4300
```

For traffic generation, prefer the production build — the dev server recompiles per route and makes
the session timings noisy:

```bash
npm run build
npm start            # http://localhost:4300
```

The port is **4300** and is set in `package.json`. Other useful scripts:

| Script                    | What it does                                     |
| ------------------------- | ------------------------------------------------ |
| `npm run dev`             | Next dev server on port 4300                     |
| `npm run build`           | Production build (also type-checks)              |
| `npm start`               | Serve the production build on port 4300          |
| `npm run typecheck`       | `tsc --noEmit` across app and scripts            |
| `npm run traffic:install` | One-time: download the Playwright Chromium build |
| `npm run traffic`         | Drive synthetic sessions against a running app   |

## Traffic generator

`scripts/generate-traffic.ts` drives **real Chromium sessions** against a running copy of the app —
real navigations, real clicks, real JS execution — so that once the analytics agent is installed it
records genuine page views and feature clicks.

```bash
npm run traffic:install    # first time only
npm start                  # terminal 1
npm run traffic            # terminal 2
```

Overrides:

```bash
TRAFFIC_SESSIONS=500 TRAFFIC_CONCURRENCY=6 npm run traffic
TRAFFIC_BASE_URL=https://my-deployed-copy.example npm run traffic
TRAFFIC_HEADED=1 TRAFFIC_SESSIONS=3 npm run traffic       # watch it work
TRAFFIC_VERIFY_FAIL=wrong-code npm run traffic            # fast mode, see below
```

| Variable              | Default                 | Meaning                                    |
| --------------------- | ----------------------- | ------------------------------------------ |
| `TRAFFIC_BASE_URL`    | `http://localhost:4300` | Where the app is served                    |
| `TRAFFIC_SESSIONS`    | `200`                   | Number of sessions                         |
| `TRAFFIC_CONCURRENCY` | `4`                     | Sessions in flight at once                 |
| `TRAFFIC_HEADED`      | unset                   | `1` to show browser windows                |
| `TRAFFIC_VERIFY_FAIL` | `wait-for-expiry`       | or `wrong-code` to skip the 16 second idle |

Behaviour:

- **One browser context per session**, so cookies and storage never leak between visitors.
- **Distinct visitor identity per session.** Before the first navigation, a Playwright init script
  writes a unique id into `localStorage` under the key **`s2ta_visitor_id`**. The app reads the same
  key via `readVisitorId()` in `src/lib/session-state.ts`.
- **Randomised think time** (0.5–2.2s) between steps.
- **Asymmetric, configurable drop-off.** The rates live as constants at the top of the script
  (`CHECKOUT_REACH_RATES`, `SIGNUP_REACH_RATES`, `ACCOUNT_REACH_RATES`). They are *cumulative*
  fractions of the sessions that start that flow, and each array must be non-increasing. The flow
  mix itself (`FLOW_MIX`) is 40% checkout / 35% signup / 25% account.
- **Abandoning sessions abandon for the planted reason.** A session that will not complete checkout
  types a card that the Luhn check rejects and retries it; a session that will not pass verification
  idles past the code lifetime; a session that will not complete cancellation is the one that
  selected the annual plan. The synthetic drop-off and the real defect are the same event.
- Progress is logged every 10 sessions, and a per-flow step table is printed at the end.

### The one integration point to verify after the install PR lands

> Once Novus's install PR is merged, **check how the agent's `initialize` call identifies the
> visitor.** The generator writes the visitor id to `localStorage['s2ta_visitor_id']` before any page
> script runs, so the snippet can read it — but a stock install will typically fall back to its own
> anonymous id instead. Sessions will still be counted as distinct visitors (each one is a fresh
> browser context), but the ids will not match the ones the generator logs, which makes
> visitor-level reconciliation impossible. Wiring `visitorId` to that key is a one-line change in the
> installed snippet, and it is the only thing in this repo that the install PR is expected to need
> follow-up on.

## Pipeline: order of operations

1. **Run or deploy the app.** `npm run build && npm start`, or deploy a copy somewhere reachable.
2. **Onboard the repository in Novus.** Point it at this repo. The setup workflow reads the source
   and discovers pages, features, and track events; a model then infers funnel definitions from
   them.
3. **Merge the install PR that Novus opens.** This is the step people forget. Novus's
   `InstallPendoWebStep` raises a pull request that adds the snippet. Nothing is collected until it
   is merged.
4. **Pull that branch locally** (or redeploy from it) so the copy you are about to drive is the
   instrumented one.
5. **Run the app** from the instrumented build.
6. **Run the traffic generator** against it: `npm run traffic`. Use a large enough
   `TRAFFIC_SESSIONS` that each funnel step has a usable denominator — 200 is the default, 500+ is
   better if you have the time.
7. **Wait for Pendo aggregation.** Page and feature events have to land and be rolled up before
   funnels report anything. See the limitations section — the latency for a brand-new app is not
   something this repo can promise.
8. **Trigger Signals V2 generation** in Novus and compare what it finds against the ground truth
   table below.

Signals V2 derives findings only from funnel drop-off and journey analytics over a rolling 30-day
window, so everything above has to happen inside that window and the funnels must actually be
synced.

## Product areas, funnels, and ground truth

| Product area            | Funnel steps (routes)                                                     | Planted defect                                                                                                                                              | Where                                        | Expected signal                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Checkout**            | `/cart` → `/checkout/shipping` → `/checkout/payment` → `/checkout/confirmation` | Card decline messages are auto-dismissed after 400ms by a timer meant for the "Card saved" toast, so the reason is rendered but never readable.                | `src/app/checkout/payment/page.tsx`          | Large drop at **payment → confirmation** (~85% → ~35%); users who click "Place order" repeatedly and never advance.     |
| **Signup & onboarding** | `/signup` → `/verify` → `/profile` → `/workspace`                          | Verification code lifetime was specified as 15 minutes but written as `15 * 1000` milliseconds, so codes die after 15 seconds. Nothing on screen counts down. | `src/app/verify/page.tsx`                    | Large drop at **verify → profile** (~90% → ~40%); repeated "Send a new code" clicks on the verify page.                |
| **Account & billing**   | `/account/plan` → `/account/billing` → `/account/cancel`                   | For prepaid annual accounts the confirm button is `disabled`, but the explanation is behind `SHOW_CANCELLATION_BLOCK_REASON`, a flag left off after a migration. | `src/app/account/cancel/page.tsx`            | Large drop at **cancel page → cancellation confirmed** (~45% → ~25%); sessions that reach `/account/cancel` and dead-end. |

Each defect is marked with a `// KNOWN DEFECT:` comment in the source so a human can find it
quickly. They are written as ordinary mistakes — a reused timer, a unit error, a stale feature flag —
rather than obvious stubs, so that a code investigation has something realistic to find.

The intended drop-off rates the generator produces:

| Flow     | Step 1 | Step 2 | Step 3 | Step 4 |
| -------- | ------ | ------ | ------ | ------ |
| Checkout | 100%   | 95%    | 85%    | **35%** |
| Signup   | 100%   | 90%    | **40%** | 34%    |
| Account  | 100%   | 70%    | 45%    | **25%** |

## App design notes

Each funnel step is a **real, distinct URL path** with its own `<h1>` and its own page title, and a
single primary advance action rendered as a `<button>` carrying both a stable `id` and a matching
`data-testid` (for example `id="checkout-payment-submit"`). This matters: page rules key off URLs,
feature rules key off selectors, and funnel steps are resolved back to page and feature artifacts by
event identifier. A step that cannot be resolved becomes an empty sentinel, the funnel never syncs,
and an unsynced funnel is skipped entirely by the analytics query — so the flows are kept
unambiguous and one-action-per-page on purpose.

There is **no backend, no database, and no authentication**. All flow state lives in `localStorage`
behind `src/lib/session-state.ts`, so the whole app runs with zero setup.

## Known limitations / things to verify

- **Page rules key off URLs, and this is the most likely thing you will have to fix.** If Novus
  generates page rules against a deployed origin (`https://something/checkout/payment`) and you then
  run the app at `http://localhost:4300/checkout/payment`, the rules will not match and you will
  collect nothing while everything appears to be working. Check the generated page rules first
  whenever traffic runs cleanly but no data shows up, and adjust them to match the origin you are
  actually driving. Running the traffic generator against the *same* origin the app was onboarded
  from avoids the problem entirely (`TRAFFIC_BASE_URL=...`).
- **Pendo path aggregation latency for a brand-new application is unknown.** A newly created app has
  no historical aggregates, and the first roll-up of page/feature data may take substantially longer
  than the steady-state latency for an established app. Signals may not appear immediately after a
  traffic run, and an empty result shortly afterwards is not evidence that the pipeline is broken.
  Re-check later before concluding anything.
- **Funnels must sync before they count.** If a funnel's steps did not resolve to page/feature
  artifacts, it never syncs to Pendo and the Signals V2 analytics query skips it silently. Verify the
  inferred funnels exist and are synced before blaming the traffic.
- **The 30-day window is real.** Traffic generated more than 30 days before signal generation
  contributes nothing.
- **Visitor identity**: see the integration-point callout above.
- **Sample size**: the drop-off rates are probabilistic draws. At 200 sessions a flow that only
  receives 25% of the mix has ~50 sessions, so per-step percentages will wobble by several points.
  Raise `TRAFFIC_SESSIONS` if you need the observed rates to sit close to the configured ones.
- The `wait-for-expiry` verification failure mode idles 16 seconds per abandoning signup session,
  which is the honest reproduction of the defect but slows large runs. `TRAFFIC_VERIFY_FAIL=wrong-code`
  trades fidelity for speed.
