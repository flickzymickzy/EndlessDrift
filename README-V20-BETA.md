# DRIFT ENDLESSLY V20 BETA

**Website:** https://endlessdrift.onrender.com (existing hostname retained to avoid breaking player links).

## Changes
- UI: Drift Endlessly. Browser tab title: **Just Drift Endlessly**.
- BETA appears in the top menu; supplied logo is used for tab icon, manifest, and loading screen.
- New credit-card/Stripe checkout disabled in the game and server.
- Drift Pass costs **15,000 earned Drift Coins**. Level-gated premium rewards still unlock at normal levels.
- Existing accounts retain original save keys so XP, wallets, garages, usernames, and cars do not reset.
- Existing paid coin balances and premium passes are still recognized where available.

## Test and deploy
The main branch deploys through your existing Render configuration.
1. Confirm the build completes on Render.
2. Hard refresh the game page and inspect tab, logo and BETA label.
3. Log in, earn 15,000 DC, buy the Pass, refresh, and check ownership persists.
4. The original hosted URL stays unchanged. No Stripe setup is needed for new purchases.

## Beta limitation
The earned wallet is not yet anti-cheat authoritative. Never treat Drift Coins as redeemable cash or valuable items.
