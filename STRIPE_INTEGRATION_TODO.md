# Stripe Checkout Studio integration — ENDLESS DRIFT

## Current status

Embedded Stripe Checkout is implemented in the [server](server.js) and [browser payment handler](src/payments.js).
**It switches to the embedded form only when `STRIPE_PUBLISHABLE_KEY` is available in Render.**
Until then, it safely keeps the original Stripe-hosted Checkout page so players can still use the existing sandbox integration.
**No real-money payment has been enabled or verified by this code change.**

## Values to Replace

No `sample_only` placeholders remain in the Checkout Session request:

| Field | Current value | Action |
| --- | --- | --- |
| `mode` | `payment` | Already correct for one-time Drift Coin packs and the Drift Pass. |
| `line_items[0].price` | `products[data.sku].price` | Already points at real sandbox Price IDs; the four live prices are separately read from Render environment variables. |
| `line_items[0].quantity` | `1` | Already configured. |

### Required Render setting to enable embedded form

In [Render > EndlessDrift > Environment](https://dashboard.render.com/web/srv-dblm7agae00c73carm10), add:

- `STRIPE_PUBLISHABLE_KEY`: the **publishable key** from **the same Stripe account/mode** as `STRIPE_SECRET_KEY`. In sandbox, it begins `pk_test_`. In a live account, it begins `pk_live_`.

This key is safe to send to Stripe.js in the browser. Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `SUPABASE_SECRET_KEY`. Server-side secret credentials remain in Render.

**Without this setting, checkout intentionally falls back to Stripe's hosted page.** Do not put a fake value in Render to force the embedded form.

## Configured parameters

Configured in [server.js](server.js), in the existing `POST /api/checkout` Session creation call.

| Parameter | Value |
| --- | --- |
| `ui_mode` | `form` (when public key configured) |
| `mode` | `payment` |
| `billing_address_collection` | `auto` |
| `phone_number_collection` | `{enabled:false}` |
| `automatic_tax` | `{enabled:false}` |
| `submit_type` | `pay` |
| `integration_identifier` | `custom_embedded_web_0002` |
| `payment_method_collection` | omitted because these are **one-time payments**, per Checkout Studio instructions |
| `line_items` | existing dynamically selected real product price ID and quantity 1 |

Required security/operation fields **preserved**: `client_reference_id`, `metadata.sku`, `metadata.driver_id`, and `return_url`. Removing these would break webhook verification or Stripe's post-payment return behavior.

## Browser integration

The [index.html](index.html) includes `https://js.stripe.com/dahlia/stripe.js`, loaded directly from Stripe's domain. Payment form markup is present as `#checkout-form`.

The [src/payments.js](src/payments.js) handler:
1. Authenticates the current Supabase user.
2. Requests the Session through `POST /api/checkout`.
3. Uses `session.client_secret` and `STRIPE_PUBLISHABLE_KEY` through the Stripe.js `initCheckoutFormSdk`.
4. Creates the `expanded` form, mounts it, and confirms through `checkout.loadActions().actions.confirm({formConfirmEvent:event})`.
5. Shows errors without granting coins. The **existing verified webhook**, not the browser redirect, delivers purchased Drift Coins and the Drift Pass.

Appearance uses the Checkout Studio's supplied theme, labels, inputs and color values. Server uses Stripe Node SDK v22.3.0 with Stripe API version `2026-03-25.dahlia`.

## Test steps — Sandbox first

1. With sandbox `sk_test_` and matching `pk_test_` on Render, open ENDLESS DRIFT, log in and select any coin pack.
2. Verify an embedded Stripe form appears, rather than a redirect to checkout.stripe.com. If not, check the Stripe account's embedded-form availability and the browser console.
3. For a successful test payment, use `4242 4242 4242 4242`, a future expiry, any CVC, and any valid postal code.
4. Try 3DS authentication with `4000 0025 0000 3155`, and a declined card `4000 0000 0000 9995`.
5. In Stripe **Sandbox**, check Checkout Sessions and delivered webhook `checkout.session.completed`, and verify the correct signed-in user's Drift Coin wallet in Supabase. Repeat to check idempotency and prevent duplicate credits.
6. Test cancel/close, mobile layouts and a simulated failed webhook.
7. Confirm `/api/payment-status` reports sandbox mode and relevant configuration without revealing any credentials.

## Live launch is separate

The currently connected Stripe context is **Endless Drift sandbox**, not an activated live payment account.
Live requires business and identity verification (and may require a parent/guardian or responsible adult if the account holder is under the provider's minimum age), real Prices for all four products, a separate live webhook with correct signing secret, and live environment variables:

- `STRIPE_SECRET_KEY` (live secret)
- `STRIPE_WEBHOOK_SECRET` (live webhook signing secret)
- `STRIPE_PUBLISHABLE_KEY` (matching live publishable key)
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_STREET`, `STRIPE_PRICE_LEGEND`, `STRIPE_PRICE_DRIFT_PASS` (real live Price IDs)
- `STRIPE_LIVE_CHECKOUT_ENABLED=true` **only after verification and end-to-end payment testing**

Review refunds, disputes, fulfillment reversal, tax, disclosure and consumer-protection obligations before real charges. Turning Render "Live" only publishes the website; it does **not** activate Stripe Live payments.

## Project changes

- [server.js](server.js): embedded form parameters plus optional hosted fallback. Existing Stripe webhook and database crediting preserved.
- [src/payments.js](src/payments.js): embed, mount, confirm and surface errors.
- [index.html](index.html): Stripe.js and payment container.
- [src/style.css](src/style.css): checkout overlay layout.
- [package.json](package.json): Dahlia-compatible Stripe SDK.
- [test-payments.mjs](test-payments.mjs): regression coverage.

Resources: [Stripe Checkout form quickstart](https://docs.stripe.com/checkout/form/quickstart), [Stripe support](https://support.stripe.com), [Stripe MCP](https://docs.stripe.com/mcp).
