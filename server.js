// ENDLESS DRIFT: website + Stripe Checkout + verified webhook. Server-only credentials go in Render Environment.
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
const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET||'';
const adminUserId=process.env.ADMIN_USER_ID||''; // Optional account UUID.
const inviteCode=process.env.ED_ADMIN_ACTIVATION_CODE||'';
const inviteAnswer=process.env.ED_ADMIN_CHALLENGE_ANSWER||'';
const inviteQuestion=process.env.ED_ADMIN_CHALLENGE_QUESTION||'Account verification';
const adminPending=new Map(),adminAttempts=new Map();

const stripe=stripeSecret?new Stripe(stripeSecret):null;
const products={
 starter:{price:'price_1UY6jRAWFsqe6FrwLwaZRtsw',amount:999,coins:1500},
 street:{price:'price_1UY6ojAWFsqe6FrwRHZXoJmQ',amount:2499,coins:5000},
 legend:{price:'price_1UY6miAWFsqe6FrwQI19MxEW',amount:4999,coins:12000},
 drift_pass:{price:'price_1UY6qwAWFsqe6FrwBIrhFnWB',amount:3499,coins:0}
};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
async function body(req,limit=16000){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>limit)throw new Error('Request body is too large');chunks.push(c);}return Buffer.concat(chunks);}
const bad=(res,e,status=400)=>json(res,status,{error:String(e.message||e).slice(0,200)});
function requireConfig(){if(!stripe||!webhookSecret||!sb||!publicKey||!secretKey)throw new Error('Payment server is not fully configured in Render Environment');}
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
 if(!match)throw new Error('Log in to your ENDLESS DRIFT account first');
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
 if(route==='/api/admin/me'&&req.method==='GET')return json(res,isAdmin?200:403,{admin:isAdmin});
 if(route==='/api/admin/redeem'&&req.method==='POST'){
  if(isAdmin)return json(res,200,{admin:true,activated:true});
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
async function publicAnnouncements(res){
 if(!sb||!secretKey)return json(res,503,{error:'Announcements unavailable'});
 const cutoff=new Date(Date.now()-86400000).toISOString();
 const rows=await supabase('/rest/v1/ed_announcements?select=id,message,created_at&is_active=eq.true&created_at=gt.'+encodeURIComponent(cutoff)+'&order=created_at.desc&limit=5');
 return json(res,200,{announcements:rows});
}

async function api(req,res,route){
 try{
  // Public, read-only configuration check: never returns credential values.
  if(route==='/api/payment-status'&&req.method==='GET'){
   const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SITE_URL'];
   const missing=required.filter(name=>!process.env[name]);
   return json(res,missing.length?503:200,{paymentServer:'v17',status:missing.length?'configuration_missing':'ready',missing});
  }
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
   const session=await stripe.checkout.sessions.create({
    mode:'payment',payment_method_types:['card'],line_items:[{price:product.price,quantity:1}],
    client_reference_id:user.id,metadata:{sku:data.sku,driver_id:user.id},
    success_url:site+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url:site+'/?checkout=cancel',
    customer_email:user.email||undefined,
   },{idempotencyKey:randomUUID()});
   return json(res,200,{url:session.url});
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
}).listen(port,'0.0.0.0',()=>console.log(`ENDLESS DRIFT website listening on port ${port}; payment config ${stripeSecret?'set':'not set'}`));
