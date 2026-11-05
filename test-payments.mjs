import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync('./server.js','utf8');
const main=readFileSync('./src/main.js','utf8');
const store=readFileSync('./src/store.js','utf8');
const payments=readFileSync('./src/payments.js','utf8');
const html=readFileSync('./index.html','utf8');
const manifest=readFileSync('./site.webmanifest','utf8');
assert.match(main,/const DRIFT_PASS_COST=15000/);
assert.match(main,/state\.driftPassOwned=true;save\(\)/);
assert.match(main,/await payWithPurchasedCoins\(DRIFT_PASS_COST\)/);
assert.match(main,/data-buy-drift-pass/);
assert.match(main,/data-confirm-drift-pass/);
assert.match(main,/function openDriftPassPurchase\(\)/);
assert.match(main,/state\.wallet\+purchased\.coins/);
assert.match(store,/driftPassOwned:false/);
assert.match(store,/s\.driftPassOwned=input\?\.driftPassOwned===true/);
assert.match(store,/endless-drift-account-v16:/); // stable user saves
assert.match(store,/\['DRIFT ENDLESSLY','ENDLESS DRIFT'\]/); // old backups import
assert.doesNotMatch(main,/beginCheckout|data-coins-guide|AED 34\.99/);
assert.doesNotMatch(payments,/beginCheckout|initCheckoutFormSdk/);
assert.doesNotMatch(html,/stripeCheckoutOverlay|js\.stripe\.com/);
assert.match(server,/if\(route==='\/api\/checkout'\)return json\(res,410/);
assert.match(server,/stripe\.webhooks\.constructEvent\(/); // legacy purchase restore
assert.match(server,/\/rest\/v1\/rpc\/ed_spend_paid_coins/);
assert.match(html,/<title>Just Drift Endlessly<\/title>/);
assert.match(html,/drift-endlessly-logo\.png/);
assert.match(manifest,/Drift Endlessly/);
assert.match(main,/class="beta-label">BETA/);
console.log('V20 BETA checks passed: earned-DC pass, no checkout, new brand, legacy saves.');

// The separate coin-buying page is removed, while earned Drift Coins and Drift Pass remain.
assert.doesNotMatch(main,/renderCoins|data-page="coins"|page==='coins'|mode==='coins'/);
assert.match(main,/data-buy-drift-pass/);
assert.match(main,/data-confirm-drift-pass/);
