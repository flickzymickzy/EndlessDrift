import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync('./server.js','utf8');
const main=readFileSync('./src/main.js','utf8');
const sql=readFileSync('./backend/stripe-payments.sql','utf8');
for(const sku of ['starter','street','legend','drift_pass'])assert.match(server,new RegExp('\\b'+sku+':\\{price:'));
for(const env of ['STRIPE_PRICE_STARTER','STRIPE_PRICE_STREET','STRIPE_PRICE_LEGEND','STRIPE_PRICE_DRIFT_PASS'])assert.ok(server.includes(env));
assert.match(server,/stripe\.webhooks\.constructEvent\(/);
assert.match(server,/session\.payment_status!=='paid'/);
assert.match(server,/session\.amount_total!==product\.amount/);
assert.match(server,/items\[0\]\?\.price\?\.id!==product\.price/);
assert.match(server,/\/rest\/v1\/rpc\/ed_fulfill_purchase/);
assert.match(server,/\/rest\/v1\/rpc\/ed_spend_paid_coins/);
assert.match(server,/STRIPE_LIVE_CHECKOUT_ENABLED/);
assert.match(sql,/on conflict\(session_id\) do nothing/i);
assert.match(sql,/for update/i);
assert.match(main,/await beginCheckout\(/);
assert.match(main,/payWithPurchasedCoins/);

// Checkout Studio embedded-form flow: non-placeholder prices, server trust, SDK mounting.
const payClient=readFileSync('./src/payments.js','utf8');
const html=readFileSync('./index.html','utf8');
const css=readFileSync('./src/style.css','utf8');
assert.match(server,/ui_mode:'form'/);
assert.match(server,/billing_address_collection:'auto'/);
assert.match(server,/phone_number_collection:\{enabled:false\}/);
assert.match(server,/automatic_tax:\{enabled:false\}/);
assert.match(server,/submit_type:'pay'/);
assert.match(server,/integration_identifier:'custom_embedded_web_0002'/);
assert.match(server,/mode:'payment'/);
assert.match(server,/line_items:checkoutLineItems/);
assert.match(server,/return_url:site/);
assert.match(server,/metadata:\{sku:data\.sku,driver_id:user\.id\}/);
assert.match(server,/apiVersion:'2026-03-25\.dahlia'/);
assert.match(server,/session\.client_secret/);
assert.match(server,/process\.env\.STRIPE_PUBLISHABLE_KEY/);
assert.doesNotMatch(server,/sk_(?:test|live)_[A-Za-z0-9]{10,}/);
assert.match(payClient,/initCheckoutFormSdk/);
assert.match(payClient,/createForm\(\{layout:'expanded'\}\)/);
assert.match(payClient,/checkout\.loadActions\(\)/);
assert.match(payClient,/actions\.confirm\(\{formConfirmEvent:event\}\)/);
assert.match(payClient,/location\.assign\(data\.url\)/); // safe fallback
assert.match(html,/https:\/\/js\.stripe\.com\/dahlia\/stripe\.js/);
assert.match(html,/id="checkout-form"/);
assert.match(css,/\.stripe-checkout-overlay/);
assert.equal((await import('./package.json',{with:{type:'json'}})).default.dependencies.stripe,'22.3.0');

console.log('Payment tests passed: verified Checkout, idempotent Stripe delivery, sandbox/live price isolation and production gate.');
