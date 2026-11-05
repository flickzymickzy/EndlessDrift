> **V19 archive.** V20 BETA disables new real-money checkout and sells Drift Pass for 15,000 earned DC. See README-V20-BETA.md.

# ENDLESS DRIFT V19: release guide

Your game can be shared immediately at https://endlessdrift.onrender.com once the deployment is Live.
**Render "Live" is GOOD — it means the web app is published.**
You do not need to get out of Render Live mode.

## V19 improvements
- Fast-acceleration camera follow capped to prevent runaway zoom.
- Touch-friendly phone and iPad controls: steering, gas, brake, drift, camera, pause, recover, bank & exit.
- On mobile/tablet, Safari/Chrome needs the first user tap to unlock sound.
- Unique procedural engine timbres per car, with separate stronger exhaust snaps and music channel.
- Admin can gift 1–500,000 **game-earned** Drift Coins to a public username. Recipients receive them at next player-status sync (normally ~14 seconds). Audit is server-only in Supabase.
- Paid Stripe coins and Drift Pass are not modified by admin gifts.

## Stripe Sandbox vs real payments
Until the business is fully verified and the entire purchase, refund, dispute and restoration flow is tested, **do not enable real charges**.
Our current connector is linked only to "Endless Drift sandbox"; a Live Stripe account must be activated and connected separately.

1. Finish Stripe business activation in the [Stripe Dashboard](https://dashboard.stripe.com). This may require business identification, licensing and bank verification.
2. In Live Stripe mode, create FOUR one-time prices using the same products/amounts/currency:
   - STARTER: AED 9.99 (1,500 DC)
   - STREET: AED 24.99 (5,000 DC)
   - LEGEND: AED 49.99 (12,000 DC)
   - DRIFT PASS: AED 34.99 (one-time access)
3. In Stripe Workbench > Webhooks (LIVE mode), create a separate live endpoint at
   https://endlessdrift.onrender.com/api/stripe/webhook
   with events:
   checkout.session.completed and checkout.session.async_payment_succeeded.
   Copy this LIVE endpoint's **unique signing secret**.
4. In Render > EndlessDrift > Environment, update *private environment variables*:
   - STRIPE_SECRET_KEY = your LIVE server secret, begins sk_live_
   - STRIPE_WEBHOOK_SECRET = LIVE whsec_... (different from sandbox)
   - STRIPE_PRICE_STARTER = LIVE price ID
   - STRIPE_PRICE_STREET = LIVE price ID
   - STRIPE_PRICE_LEGEND = LIVE price ID
   - STRIPE_PRICE_DRIFT_PASS = LIVE price ID
   - STRIPE_LIVE_CHECKOUT_ENABLED = true (ONLY after full testing and regulatory approval)
5. Redeploy. The server blocks live Checkout if required live price IDs or the explicit gate are missing. Payment status:
   https://endlessdrift.onrender.com/api/payment-status (returns *configuration status only*, no secret values).
6. Test with a real low-value purchase, verify webhook delivery, actual Supabase entitlement, refund flows and dispute responses. Get appropriate tax, privacy, refund and consumer-protection information published.
**Do not expose any Stripe or Supabase secret in client files, public GitHub, screenshots or chat.**

### Known important launch limitations
- Browser-based gameplay scores are not authoritative anti-cheat evidence even when server rate-limited.
- Real payment entitlement recovery, refunds/disputes and chargeback reversal require more hardening before charging customers.
- Audio is procedural Web Audio synthesis, not licensed recordings of real car engines.
- Touch controls have static and syntax CI checks but need real iPhone/iPad hands-on testing.
- Render Live is already a publicly reachable web app; Stripe Live is a separate payment environment.
