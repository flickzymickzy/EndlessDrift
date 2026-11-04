ENDLESS DRIFT V12 — COMPLETE MAC GAME
====================================

QUICK START

1. Keep your existing EndlessDrift folder as a backup.
2. Stop previous server in Terminal: Control + C.
3. Download and unzip the V12 COMPLETE GAME archive.
4. Move the extracted EndlessDrift folder to Desktop.
5. Open Terminal and run:

   cd ~/Desktop/EndlessDrift
   node server.js

6. Open http://localhost:5173 in Safari or Chrome.

No npm install is required. Requires Node.js 18+.

If port 5173 is already in use, stop the old server first. Do not switch
ports casually, as local browser saves are separate per origin.

KEEP YOUR SAVE DATA

V12 preserves the previous save key: endless-drift-save-v3.
If using the same browser profile and localhost:5173 your cars, coins, XP,
shop cosmetics, and Drift Pass remain available. Export your save first via
SETTINGS > DOWNLOAD SAVE BACKUP. Import if you change browser or domain.

V12 NEW FEATURES

- Owned-car tuning: TUNE opens Performance upgrades by default.
- Clearly visible VIEW STATS and BUY for each upgrade.
- Wheel rims visibly sit on the tires and rotate with the wheels.
- Drift XP UI is shown nearer the TOP of the play view.
- Smoother left/right transitions and easier controlled slides.
- Cops trigger at 100 KM/H, not 100 MPH.
- New COINS page (demo pack catalogue; checkout not active yet).
- ACCOUNT page for optional Supabase auth when configured.
- RANKS page that reads secure online verified data when configured.

HOW TO MAKE ACCOUNTS + LEADERBOARDS

Read ACCOUNT-LEADERBOARDS-SETUP.txt. Create a Supabase project, run the SQL
in backend/supabase-setup.sql, set the public URL/key in cloud-config.js.
This enables signup/login and viewing verified ranks, but NOT submitting
unverified local XP or syncing local saves. This is intentional security.

HOW TO ACCEPT REAL MONEY FOR COINS

Read DRIFT-COIN-PAYMENTS-SETUP.txt and PAYMENT-SETUP.txt.
You need a real verified merchant account, hosted checkout, a trusted backend,
webhook verification, and authoritative coin balances. Do not put live secret
keys into front-end files. The V12 shop does not charge anyone yet.

OFFICIAL WEBSITE / DOMAIN

Read DEPLOY-CLOUDFLARE-PAGES.txt. Register your desired domain separately,
then connect it in Cloudflare Pages > Custom domains. The name
'endless-drift.com' is only an example; availability is NOT guaranteed.

LIMITATIONS

This is still a procedural-3D browser prototype. It has not been fully
verified visually on your Mac and is not photorealistic. True secure
multiplayer profiles, cloud saves, anti-cheat, validated rankings and live
payments need production backend work.
