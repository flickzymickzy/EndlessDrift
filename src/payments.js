// Server verified purchases; no paid entitlement is ever granted from URL/localStorage.
import {cloudAccessToken} from './cloud.js';
export const purchased={coins:0,driftPass:false,loaded:false};
export function clearPurchased(){purchased.coins=0;purchased.driftPass=false;purchased.loaded=false;}
async function api(route,method='GET',payload){
 const access=await cloudAccessToken();
 if(!access)throw Error('Log in under ACCOUNT first, then try again');
 const response=await fetch(route,{method,headers:{'Authorization':`Bearer ${access}`,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 let data={};try{data=await response.json();}catch{}
 if(!response.ok)throw Error(String(data.error||`Payment server HTTP ${response.status}`).slice(0,220));
 return data;
}
export async function refreshPurchased(){
 if(!(await cloudAccessToken())){clearPurchased();return purchased;}
 const data=await api('/api/purchases/me');
 purchased.coins=Math.max(0,Number(data.coins)||0);
 purchased.driftPass=data.driftPass===true;
 purchased.loaded=true;
 return purchased;
}
let checkoutForm=null;
let checkoutInProgress=false;
function checkoutElements(){
 const overlay=document.getElementById('stripeCheckoutOverlay');
 const content=document.getElementById('checkout-form');
 const status=document.getElementById('stripeCheckoutStatus');
 const close=document.getElementById('stripeCheckoutClose');
 if(!overlay||!content||!status||!close)throw Error('Checkout form markup is missing');
 return {overlay,content,status,close};
}
function closeCheckoutForm(){
 if(checkoutInProgress)return;
 const {overlay,content}=checkoutElements();
 try{checkoutForm?.unmount?.();}catch{}
 checkoutForm=null;overlay.hidden=true;content.replaceChildren();
 document.body.classList.remove('stripe-checkout-open');
}
async function openCheckoutForm(data){
 if(!data.client_secret||!/^pk_(test|live)_[A-Za-z0-9]+$/.test(data.publishable_key||''))
  throw Error('Stripe public key is missing or invalid');
 if(typeof window.Stripe!=='function')throw Error('Stripe.js could not load. Check your connection and reload.');
 const {overlay,content,status,close}=checkoutElements();
 checkoutInProgress=false;
 close.onclick=closeCheckoutForm;
 overlay.hidden=false;
 document.body.classList.add('stripe-checkout-open');
 content.replaceChildren();status.textContent='Loading secure Stripe payment form…';
 try{
  const stripe=window.Stripe(data.publishable_key);
  const appearance={
   theme:'night',labels:'above',inputs:'condensed',
   variables:{
    borderRadius:'4px',colorBackground:'#ffffff',colorDanger:'#df1b41',
    colorPrimary:'#0570de',colorSuccess:'#00c853',colorText:'#30313d',
    fontFamily:'default',fontSizeBase:'16px',spacingUnit:'4px'
   }
  };
  const checkout=stripe.initCheckoutFormSdk({
   clientSecret:Promise.resolve(data.client_secret),appearance
  });
  checkoutForm=checkout.createForm({layout:'expanded'});
  checkoutForm.mount('#checkout-form');
  const result=await checkout.loadActions();
  if(result.type!=='success')throw Error(result.error?.message||'Unable to load payment actions');
  status.textContent='Secure payment powered by Stripe. Your Drift Coins are credited only after payment is verified.';
  checkoutForm.on('confirm',async event=>{
   checkoutInProgress=true;close.disabled=true;
   status.textContent='Confirming your payment securely…';
   try{
    await result.actions.confirm({formConfirmEvent:event});
    status.textContent='Waiting for confirmation. Keep this page open.';
   }catch(err){
    checkoutInProgress=false;close.disabled=false;
    status.textContent='Payment confirmation error: '+String(err?.message||err).slice(0,160);
   }
  });
 }catch(err){
  checkoutInProgress=false;close.disabled=false;
  status.textContent='Could not open checkout: '+String(err?.message||err).slice(0,180);
  throw err;
 }
}
export async function beginCheckout(sku){
 if(!['starter','street','legend','drift_pass'].includes(sku))throw Error('Unknown product');
 const data=await api('/api/checkout','POST',{sku});
 if(data.url){
  // Existing hosted Checkout remains enabled until the publishable key is set in Render.
  const checkoutUrl=new URL(data.url);
  if(checkoutUrl.protocol!=='https:'||checkoutUrl.hostname!=='checkout.stripe.com')
   throw Error('Invalid Stripe checkout URL');
  location.assign(data.url);
  return;
 }
 await openCheckoutForm(data);
}
export async function spendPurchased(amount){
 if(!Number.isInteger(amount)||amount<1||amount>1000000)throw Error('Invalid paid coin amount');
 const data=await api('/api/purchases/spend','POST',{amount,requestId:crypto.randomUUID()});
 purchased.coins=Number(data.coins)||0;
 return purchased.coins;
}
