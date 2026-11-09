// DRIFT ENDLESSLY: website + Stripe Checkout + verified webhook. Server-only credentials go in Render Environment.
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Stripe from 'stripe';
import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT)||5173;
const site=(process.env.SITE_URL||'https://endlessdrift.onrender.com').replace(/\/$/,'');
const sb=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const publicKey=process.env.SUPABASE_PUBLISHABLE_KEY||'';
const secretKey=process.env.SUPABASE_SECRET_KEY||'';
const stripeSecret=process.env.STRIPE_SECRET_KEY||'';
const liveStripe= stripeSecret.startsWith('sk_live_');
const checkoutPrice=(key,sandbox)=>process.env['STRIPE_PRICE_'+key]||(liveStripe?'':sandbox);
const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET||'';
const adminUserId=process.env.ADMIN_USER_ID||''; // Optional account UUID.
const inviteCode=process.env.ED_ADMIN_ACTIVATION_CODE||'';
const inviteAnswer=process.env.ED_ADMIN_CHALLENGE_ANSWER||'';
const inviteQuestion=process.env.ED_ADMIN_CHALLENGE_QUESTION||'Account verification';
const adminPending=new Map(),adminAttempts=new Map();
const MAX_ADMIN_GRANT=Number.MAX_SAFE_INTEGER;

const stripe=stripeSecret?new Stripe(stripeSecret,{apiVersion:'2026-03-25.dahlia'}):null;
const products={
 starter:{price:checkoutPrice('STARTER','price_1UY6jRAWFsqe6FrwLwaZRtsw'),amount:999,coins:1500},
 street:{price:checkoutPrice('STREET','price_1UY6ojAWFsqe6FrwRHZXoJmQ'),amount:2499,coins:5000},
 legend:{price:checkoutPrice('LEGEND','price_1UY6miAWFsqe6FrwQI19MxEW'),amount:4999,coins:12000},
 drift_pass:{price:checkoutPrice('DRIFT_PASS','price_1UY6qwAWFsqe6FrwBIrhFnWB'),amount:3499,coins:0}
};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
async function body(req,limit=16000){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>limit)throw new Error('Request body is too large');chunks.push(c);}return Buffer.concat(chunks);}
const bad=(res,e,status=400)=>json(res,status,{error:String(e.message||e).slice(0,200)});
function requireConfig(){if(!stripe||!webhookSecret||!sb||!publicKey||!secretKey)throw new Error('Payment server is not fully configured in Render Environment');if(liveStripe&&process.env.STRIPE_LIVE_CHECKOUT_ENABLED!=='true')throw new Error('Live Stripe Checkout is disabled until launch verification is complete');if(Object.values(products).some(p=>!p.price))throw new Error('Missing live Stripe price IDs in Render Environment');}
async function supabase(resource,{method='GET',payload,admin=true,token}={}){
 const headers={'apikey':admin?secretKey:publicKey,'Accept':'application/json'};
 if(token)headers.Authorization=`Bearer ${token}`;
 if(payload)headers['Content-Type']='application/json';
 if(method==='POST'&&resource.includes('on_conflict='))headers.Prefer='resolution=merge-duplicates,return=minimal';
 const result=await fetch(sb+resource,{method,headers,...(payload?{body:JSON.stringify(payload)}:{})});
 const text=await result.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 if(!result.ok)throw new Error(`Supabase ${result.status}: ${String(typeof data==='object'?data?.message||data?.error||text:text).slice(0,160)}`);
 return data;
}
async function userFromRequest(req){
 const match=/^Bearer ([\w.-]+)$/.exec(req.headers.authorization||'');
 if(!match)throw new Error('Log in to your DRIFT ENDLESSLY account first');
 const user=await supabase('/auth/v1/user',{admin:false,token:match[1]});
 if(!/^[0-9a-f-]{36}$/.test(user?.id||''))throw new Error('Invalid account session');
 return user;
}
async function walletForUser(userId){
 const rows=await supabase(`/rest/v1/ed_paid_wallets?user_id=eq.${encodeURIComponent(userId)}&select=coins,drift_pass`);
 return {coins:Number(rows?.[0]?.coins||0),driftPass:rows?.[0]?.drift_pass===true};
}
async function fulfillSession(sessionId){
 const session=await stripe.checkout.sessions.retrieve(sessionId,{expand:['line_items']});
 const sku=session.metadata?.sku,uid=session.metadata?.driver_id;
 const product=products[sku];
 if(!product||session.payment_status!=='paid'||session.mode!=='payment'||session.currency!=='aed'||session.amount_total!==product.amount||session.client_reference_id!==uid)throw new Error('Checkout verification failed');
 const items=session.line_items?.data||[];
 if(items.length!==1||items[0]?.price?.id!==product.price||items[0]?.quantity!==1)throw new Error('Wrong checkout price');
 if(!/^[0-9a-f-]{36}$/.test(uid||''))throw new Error('Invalid checkout account');
 return supabase('/rest/v1/rpc/ed_fulfill_purchase',{method:'POST',payload:{p_session_id:session.id,p_user_id:uid,p_sku:sku,p_amount_aed_fils:product.amount}});
}

function safeSecretMatch(userValue,expected){
 if(typeof userValue!=='string'||!expected||userValue.length>128)return false;
 const provided=createHash('sha256').update(userValue.trim()).digest();
 const actual=createHash('sha256').update(expected.trim()).digest();
 return timingSafeEqual(provided,actual);
}
function allowAttempt(userId,req){
 const key=userId+':'+String(req.socket.remoteAddress||'');
 const now=Date.now(),old=adminAttempts.get(key)||{count:0,until:now+1200000};
 if(now>old.until){old.count=0;old.until=now+1200000;}
 old.count+=1;adminAttempts.set(key,old);return old.count<=14;
}
async function adminRole(userId){
 if(adminUserId===userId)return {source:'owner'};
 const roles=await supabase('/rest/v1/ed_admin_roles?user_id=eq.'+encodeURIComponent(userId)+'&select=source&limit=1');
 return roles?.[0]||null;
}
async function hasAdmin(userId){
 if(adminUserId && userId===adminUserId)return true;
 const roles=await supabase('/rest/v1/ed_admin_roles?user_id=eq.'+encodeURIComponent(userId)+'&select=user_id&limit=1');
 return Array.isArray(roles)&&roles.length>0;
}
async function adminApi(req,res,route){
 if(!sb||!publicKey||!secretKey)return json(res,503,{error:'Admin server not configured'});
 if(req.headers.origin && req.headers.origin!==site)return json(res,403,{error:'Origin not allowed'});
 const user=await userFromRequest(req);
 const isAdmin=await hasAdmin(user.id);
 if(route==='/api/admin/me'&&req.method==='GET'){
  const role=isAdmin?await adminRole(user.id):null;
  return json(res,isAdmin?200:403,{admin:isAdmin,owner:role?.source==='owner'});
 }
 if(route==='/api/admin/redeem'&&req.method==='POST'){
  // Already-verified admins can edit usernames normally; no invite interception.
  if(isAdmin)return json(res,200,{candidate:false,admin:true});
  if(!allowAttempt(user.id,req))return json(res,429,{error:'Too many attempts'});
  const data=JSON.parse((await body(req,3000)).toString()||'{}');
  if(data.step==='begin'){
   if(!inviteCode||!inviteAnswer||!safeSecretMatch(data.value,inviteCode))return json(res,200,{candidate:false});
   adminPending.set(user.id,{until:Date.now()+300000});
   return json(res,200,{candidate:true,question:inviteQuestion});
  }
  if(data.step==='finish'){
   const pending=adminPending.get(user.id);
   if(!pending||Date.now()>pending.until)return json(res,403,{error:'Verification expired'});
   if(!safeSecretMatch(data.value,inviteAnswer))return json(res,403,{error:'Incorrect answer'});
   adminPending.delete(user.id);
   await supabase('/rest/v1/ed_admin_roles?on_conflict=user_id',{method:'POST',payload:{user_id:user.id,source:'verified_invite'}});
   return json(res,200,{admin:true,activated:true});
  }
  return json(res,400,{error:'Invalid verification step'});
 }
 if(!isAdmin)return json(res,403,{error:'Admin permission required'});
 if(route==='/api/admin/moderate'||route==='/api/admin/watch')return await adminModerationApi(req,res,route,user);
 if(route==='/api/admin/overview'&&req.method==='GET'){
  const [drivers,purchases,announcements]=await Promise.all([
   supabase('/rest/v1/driver_profiles?select=id&limit=1000'),
   supabase('/rest/v1/ed_stripe_purchases?select=sku,amount_aed_fils&order=created_at.desc&limit=1000'),
   supabase('/rest/v1/ed_announcements?select=id,message,created_at,is_active&order=created_at.desc&limit=12')
  ]);
  return json(res,200,{drivers:drivers.length,purchases:purchases.length,
   totalFils:purchases.reduce((sum,p)=>sum+Math.max(0,Number(p.amount_aed_fils)||0),0),recent:purchases.slice(0,12),announcements});
 }
 if(route==='/api/admin/announce'&&req.method==='POST'){
  const data=JSON.parse((await body(req,3000)).toString()||'{}');
  const message=String(data.message||'').trim().replace(/[\x00-\x1f\x7f]/g,' ');
  if(message.length<1||message.length>180)return json(res,400,{error:'Message must be 1 to 180 characters'});
  await supabase('/rest/v1/ed_announcements',{method:'POST',payload:{message,created_by:user.id}});
  return json(res,200,{sent:true});
 }
 if(route==='/api/admin/announcement/hide'&&req.method==='POST'){
  const data=JSON.parse((await body(req,3000)).toString()||'{}');
  if(!Number.isSafeInteger(data.id)||data.id<1)return json(res,400,{error:'Invalid announcement'});
  await supabase('/rest/v1/ed_announcements?id=eq.'+data.id,{method:'PATCH',payload:{is_active:false}});
  return json(res,200,{hidden:true});
 }
 if(route==='/api/admin/refill'&&req.method==='POST'){
  const rows=await supabase('/rest/v1/ed_game_saves?user_id=eq.'+encodeURIComponent(user.id)+'&select=save&limit=1');
  const current=rows?.[0]?.save && typeof rows[0].save==='object'?rows[0].save:{};
  const wallet=1000000000;
  await supabase('/rest/v1/ed_game_saves?on_conflict=user_id',{method:'POST',payload:{user_id:user.id,save:{...current,wallet},updated_at:new Date().toISOString()}});
  return json(res,200,{wallet});
 }
 return json(res,404,{error:'Unknown admin command'});
}

const liveRate=new Map(),bankRate=new Map();
const emptyControls=()=>({banned:false,frozen:false,kick_version:0,god_mode:false,speed_multiplier:1,jump_multiplier:1,shape:'car',xp_grant_total:0,coins_grant_total:0,respawn_version:0,repair_version:0,clear_wanted_version:0});
async function playerControls(userId){
 const rows=await supabase('/rest/v1/ed_player_controls?user_id=eq.'+encodeURIComponent(userId)+'&select=banned,frozen,kick_version,god_mode,speed_multiplier,jump_multiplier,shape,morph_expires_at,xp_grant_total,coins_grant_total,respawn_version,repair_version,clear_wanted_version&limit=1');
 const row={...emptyControls(),...(rows?.[0]||{})};
 if(row.shape!=='car'&&row.morph_expires_at&&Date.now()>Date.parse(row.morph_expires_at))row.shape='car';
 return row;
}
async function playerStatusApi(req,res,route){
 if(!sb||!secretKey||!publicKey)return json(res,503,{error:'Player service unavailable'});
 if(req.headers.origin&&req.headers.origin!==site)return json(res,403,{error:'Invalid origin'});
 const user=await userFromRequest(req);
 if(route==='/api/player/status'&&req.method==='GET'){
  const status=await playerControls(user.id);
  return json(res,200,{status});
 }
 if(route==='/api/player/telemetry'&&req.method==='POST'){
  const now=Date.now();
  if(now-(liveRate.get(user.id)||0)<7000)return json(res,200,{ok:true,throttled:true});
  const status=await playerControls(user.id);
  if(status.banned)return json(res,403,{error:'Your account is banned from the game'});
  const data=JSON.parse((await body(req,1500)).toString()||'{}');
  const vals=[data.x,data.z,data.speed,data.wanted];
  if(!vals.every(Number.isFinite)||Math.abs(data.x)>100000||Math.abs(data.z)>50000000||data.speed<0||data.speed>600||data.wanted<0||data.wanted>5)return json(res,400,{error:'Invalid game telemetry'});
  liveRate.set(user.id,now);
  await supabase('/rest/v1/ed_player_telemetry?on_conflict=user_id',{method:'POST',payload:{user_id:user.id,position_x:Math.round(data.x*100)/100,position_z:Math.round(data.z*100)/100,speed_kph:Math.round(data.speed*100)/100,wanted:Math.floor(data.wanted),active:data.active===true,last_seen:new Date(now).toISOString()}});
  return json(res,200,{ok:true});
 }
 if(route==='/api/runs/bank'&&req.method==='POST'){
  const status=await playerControls(user.id);
  if(status.banned)return json(res,403,{error:'Banned accounts cannot submit ranked XP'});
  const data=JSON.parse((await body(req,1800)).toString()||'{}');
  const xp=Number(data.xp),seconds=Number(data.seconds);
  if(!Number.isSafeInteger(xp)||xp<1||xp>5000||!Number.isFinite(seconds)||seconds<1||seconds>7200||xp>Math.max(350,seconds*550)||typeof data.eventId!=='string'||!/^[a-f0-9-]{36}$/i.test(data.eventId))return json(res,400,{error:'Run score outside safety limits'});
  const now=Date.now(),last=bankRate.get(user.id)||0;
  if(now-last<1600)return json(res,429,{error:'Please wait before submitting another run'});
  bankRate.set(user.id,now);
  const total=await supabase('/rest/v1/rpc/ed_record_ranked_xp',{method:'POST',payload:{p_user:user.id,p_event:data.eventId,p_xp:xp}});
  return json(res,200,{lifetime_xp:Number(total||0),provisional:true});
 }
 return json(res,404,{error:'Unknown player endpoint'});
}
async function adminModerationApi(req,res,route,user){
 if(route==='/api/admin/watch'&&req.method==='GET'){
  const name=String(new URL(req.url,'http://localhost').searchParams.get('username')||'').trim();
  if(!/^[A-Za-z0-9_]{3,24}$/.test(name))return json(res,400,{error:'Enter a valid player username'});
  const matches=await supabase('/rest/v1/driver_profiles?username=ilike.'+encodeURIComponent(name)+'&select=id,username&limit=1');
  const profile=matches?.[0];
  if(!profile)return json(res,404,{error:'Player not found'});
  const rows=await supabase('/rest/v1/ed_player_telemetry?user_id=eq.'+encodeURIComponent(profile.id)+'&select=position_x,position_z,speed_kph,wanted,active,last_seen&limit=1');
  const data=rows?.[0]||null;
  return json(res,200,{username:profile.username,telemetry:data,online:!!(data?.active&&Date.now()-Date.parse(data.last_seen)<45000)});
 }
 if(route!=='/api/admin/moderate'||req.method!=='POST')return json(res,404,{error:'Unknown admin command'});
 const data=JSON.parse((await body(req,3000)).toString()||'{}');
 const command=String(data.command||'').replace(/^\//,'').toLowerCase(),name=String(data.username||'').trim();
 if(!/^[A-Za-z0-9_]{3,24}$/.test(name))return json(res,400,{error:'Target username required'});
 const profiles=await supabase('/rest/v1/driver_profiles?username=ilike.'+encodeURIComponent(name)+'&select=id,username&limit=1');
 const target=profiles?.[0];if(!target)return json(res,404,{error:'Target player not found'});
 const ownerRole=await adminRole(target.id);
 const destructive=['kick','ban','freeze','unfreeze'];
 if(destructive.includes(command)&&(target.id===user.id||ownerRole?.source==='owner'))return json(res,403,{error:'Cannot moderate yourself or the owner'});
 const before=await playerControls(target.id);const patch={updated_at:new Date().toISOString()};
 switch(command){
  case 'kick':patch.kick_version=Number(before.kick_version||0)+1;break;
  case 'ban':patch.banned=true;break;
  case 'unban':patch.banned=false;break;
  case 'freeze':patch.frozen=true;break;
  case 'unfreeze':patch.frozen=false;break;
  case 'god':patch.god_mode=data.value===true||data.value==='on';break;
  case 'speed':{const n=Number(data.value);if(!Number.isFinite(n)||n<.5||n>3)return json(res,400,{error:'Speed must be 0.5–3'});patch.speed_multiplier=n;break;}
  case 'jump':{const n=Number(data.value);if(!Number.isFinite(n)||n<.5||n>3)return json(res,400,{error:'Jump must be 0.5–3'});patch.jump_multiplier=n;break;}
  case 'morph':{const shape=String(data.value||'').toLowerCase();if(!['car','tetris','arcade','toilet'].includes(shape))return json(res,400,{error:'Invalid transformation'});patch.shape=shape;patch.morph_expires_at=shape==='car'?null:new Date(Date.now()+90000).toISOString();break;}
  case 'repair':patch.repair_version=Number(before.repair_version||0)+1;break;
  case 'respawn':patch.respawn_version=Number(before.respawn_version||0)+1;break;
  case 'clearwanted':patch.clear_wanted_version=Number(before.clear_wanted_version||0)+1;break;
  case 'boost':patch.speed_multiplier=1.75;break;
  case 'slow':patch.speed_multiplier=.5;break;
  case 'resetpowers':{
   patch.frozen=false;patch.god_mode=false;patch.speed_multiplier=1;
   patch.jump_multiplier=1;patch.shape='car';patch.morph_expires_at=null;
   break;
  }
  case 'xp':{
   const amount=Number(data.value),existing=Number(before.xp_grant_total||0);
   if(!Number.isSafeInteger(amount)||amount<1||amount>MAX_ADMIN_GRANT)return json(res,400,{error:'Use a positive whole XP amount'});
   if(!Number.isSafeInteger(existing+amount))return json(res,400,{error:'Combined XP exceeds safe integer range'});
   // Gift XP to the player's garage, never to competitive ranked scores.
   patch.xp_grant_total=existing+amount;
   break;
  }
  case 'coins':{
   const amount=Number(data.value),existing=Number(before.coins_grant_total||0);
   if(!Number.isSafeInteger(amount)||amount<1||amount>MAX_ADMIN_GRANT)return json(res,400,{error:'Use a positive whole Drift Coin amount'});
   if(!Number.isSafeInteger(existing+amount))return json(res,400,{error:'Combined DC exceeds safe integer range'});
   patch.coins_grant_total=existing+amount;
   break;
  }
  default:return json(res,400,{error:'Unknown command. Use kick ban unban freeze unfreeze god speed jump morph repair respawn clearwanted boost slow resetpowers xp coins'});
 }
 await supabase('/rest/v1/ed_player_controls?on_conflict=user_id',{method:'POST',payload:{user_id:target.id,...patch}});
 if(command==='coins'){
  await supabase('/rest/v1/ed_admin_coin_grants',{method:'POST',payload:{actor_id:user.id,recipient_id:target.id,amount:Number(data.value)}});
 }
 return json(res,200,{ok:true,command,username:target.username});
}

async function leaderboardApi(res,sort='lifetime_xp'){
 if(!sb||!secretKey)return json(res,503,{error:'Leaderboard is not configured'});
 const order=sort==='coins_spent'?'coins_spent':'lifetime_xp';
 const [rows,admins]=await Promise.all([
  supabase('/rest/v1/leaderboard_public?select=username,lifetime_xp,coins_spent&order='+order+'.desc&limit=150'),
  supabase('/rest/v1/ed_admin_roles?source=eq.owner&select=user_id&limit=100')
 ]);
 let owners=new Set(),ownerRows=[];
 if(admins.length){
  const profiles=await supabase('/rest/v1/driver_profiles?select=id,username&id=in.('+admins.map(a=>a.user_id).join(',')+')');
  owners=new Set(profiles.map(p=>p.username));
  // Load owners outside the ranked top 150 too.
  const featured=await Promise.all(profiles.map(p=>supabase('/rest/v1/leaderboard_public?select=username,lifetime_xp,coins_spent&username=eq.'+encodeURIComponent(p.username)+'&limit=1')));
  ownerRows=featured.flat().filter(Boolean);
 }
 const competitive=rows.filter(row=>!owners.has(row.username)).slice(0,100);
 if(!ownerRows.length)ownerRows=rows.filter(row=>owners.has(row.username));
 return json(res,200,{rows:[...competitive,...ownerRows].map(row=>({
  username:String(row.username||'DRIVER').slice(0,24),
  lifetime_xp:Math.max(0,Number(row.lifetime_xp)||0),
  coins_spent:Math.max(0,Number(row.coins_spent)||0),
  owner:owners.has(row.username)
 }))});
}

async function publicAnnouncements(res){
 if(!sb||!secretKey)return json(res,503,{error:'Announcements unavailable'});
 const cutoff=new Date(Date.now()-86400000).toISOString();
 const rows=await supabase('/rest/v1/ed_announcements?select=id,message,created_at&is_active=eq.true&created_at=gt.'+encodeURIComponent(cutoff)+'&order=created_at.desc&limit=5');
 return json(res,200,{announcements:rows});
}

async function api(req,res,route){
 try{
  // Public, read-only configuration check: never returns credential values.
   // Free-to-play beta: all new real-money checkout sessions are disabled.
   if(route==='/api/checkout')return json(res,410,{error:'Real-money purchases are disabled. Earn Drift Coins by playing.'});
   if(route==='/api/payment-status'&&req.method==='GET')return json(res,200,{paymentServer:'disabled',mode:'game-only',status:'checkout_disabled'});
  if(route.startsWith('/api/player/')||route.startsWith('/api/runs/'))return await playerStatusApi(req,res,route);
  if(route==='/api/leaderboard'&&req.method==='GET')return await leaderboardApi(res,new URL(req.url,'http://localhost').searchParams.get('sort'));
  if(route==='/api/announcements'&&req.method==='GET')return await publicAnnouncements(res);
  if(route.startsWith('/api/admin/'))return await adminApi(req,res,route);
  requireConfig();
  if(route==='/api/stripe/webhook'){
   if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
   const raw=await body(req,512000);
   const event=stripe.webhooks.constructEvent(raw,req.headers['stripe-signature'],webhookSecret);
   if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
    if(event.data.object.payment_status==='paid')await fulfillSession(event.data.object.id);
   }
   return json(res,200,{received:true});
  }
  if(req.headers.origin && req.headers.origin!==site)return json(res,403,{error:'Origin not allowed'});
  const user=await userFromRequest(req);
  if(route==='/api/purchases/me'&&req.method==='GET')return json(res,200,await walletForUser(user.id));
  if(route==='/api/checkout'&&req.method==='POST'){
   const data=JSON.parse((await body(req)).toString()||'{}');const product=products[data.sku];
   if(!product)return json(res,400,{error:'Invalid product'});
   if(data.sku==='drift_pass'&&(await walletForUser(user.id)).driftPass)return json(res,400,{error:'You already own the Drift Pass'});
   // Keep hosted checkout as a safe fallback until Render has the public pk_test/pk_live key.
   // No payment details ever pass through this server or game frontend.
   const publishableKey=process.env.STRIPE_PUBLISHABLE_KEY||'';
   const matchingKeys=publishableKey.startsWith(liveStripe?'pk_live_':'pk_test_');
   const embedded=matchingKeys;
   const checkoutLineItems=[{price:product.price,quantity:1}];
   const session=await stripe.checkout.sessions.create(embedded?{
    ui_mode:'form',
    mode:'payment',
    line_items:checkoutLineItems,
    billing_address_collection:'auto',
    phone_number_collection:{enabled:false},
    automatic_tax:{enabled:false},
    submit_type:'pay',
    integration_identifier:'custom_embedded_web_0002',
    // Required for server-verified digital-goods fulfillment; never trust the browser's sku/user.
    client_reference_id:user.id,metadata:{sku:data.sku,driver_id:user.id},
    return_url:site+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}'
   }:{
    // Existing, already-working hosted Checkout remains available while the public key is unset.
    mode:'payment',payment_method_types:['card'],line_items:checkoutLineItems,
    client_reference_id:user.id,metadata:{sku:data.sku,driver_id:user.id},
    success_url:site+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url:site+'/?checkout=cancel',
    customer_email:user.email||undefined
   },{idempotencyKey:randomUUID()});
   if(embedded){
    if(!session.client_secret)throw new Error('Embedded Checkout did not return a client secret');
    return json(res,200,{client_secret:session.client_secret,publishable_key:publishableKey,ui_mode:'form'});
   }
   return json(res,200,{url:session.url,ui_mode:'hosted'});
  }
  if(route==='/api/purchases/spend'&&req.method==='POST'){
   const data=JSON.parse((await body(req)).toString()||'{}');
   if(!Number.isInteger(data.amount)||data.amount<1||data.amount>1000000||typeof data.requestId!=='string'||!/^[0-9a-f-]{36}$/.test(data.requestId))return json(res,400,{error:'Invalid spend request'});
   const coins=await supabase('/rest/v1/rpc/ed_spend_paid_coins',{method:'POST',payload:{p_user_id:user.id,p_amount:data.amount,p_request_id:data.requestId}});
   return json(res,200,{coins:Number(coins)});
  }
  return json(res,404,{error:'Unknown endpoint'});
 }catch(e){console.error('Payment API:',e.message);return bad(res,e,e.message?.includes('Log in')?401:400);}
}
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/'))return await api(req,res,url.pathname);
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
  const requestPath=decodeURIComponent(url.pathname);
  const target=path.resolve(root,'.'+requestPath,requestPath.endsWith('/')?'index.html':'');
  if(target!==root&&!target.startsWith(root+path.sep))return json(res,403,{error:'Forbidden'});
  const relative=path.relative(root,target).replaceAll('\\','/');
  if(/(^|\/)\.|(^|\/)(backend|server\.js|package(?:-lock)?\.json|test-[^/]*|cloud-config\.example\.js|STRIPE-[^/]*)($|\/)/i.test(relative))return json(res,404,{error:'Not found'});
  const details=await stat(target);if(!details.isFile())throw Error('Not a file');
  const file=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();return res.end(file);
 }catch(e){return json(res,404,{error:'File not found'});}
}).listen(port,'0.0.0.0',()=>console.log(`DRIFT ENDLESSLY website listening on port ${port}; payment config ${stripeSecret?'set':'not set'}`));
