// Preserve historical online balances and pass entitlements. New checkout is disabled.
import {cloudAccessToken} from './cloud.js';
export const purchased={coins:0,driftPass:false,loaded:false};
export function clearPurchased(){purchased.coins=0;purchased.driftPass=false;purchased.loaded=false;}
async function api(route,method='GET',payload){
 const access=await cloudAccessToken();if(!access)throw Error('Log in under ACCOUNT first');
 const response=await fetch(route,{method,headers:{Authorization:`Bearer ${access}`,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 let data={};try{data=await response.json();}catch{}
 if(!response.ok)throw Error(String(data.error||`Wallet server HTTP ${response.status}`).slice(0,220));
 return data;
}
export async function refreshPurchased(){
 if(!(await cloudAccessToken())){clearPurchased();return purchased;}
 const data=await api('/api/purchases/me');
 purchased.coins=Math.max(0,Number(data.coins)||0);purchased.driftPass=data.driftPass===true;purchased.loaded=true;
 return purchased;
}
export async function spendPurchased(amount){
 if(!Number.isInteger(amount)||amount<1||amount>1000000)throw Error('Invalid legacy coin amount');
 const data=await api('/api/purchases/spend','POST',{amount,requestId:crypto.randomUUID()});
 purchased.coins=Math.max(0,Number(data.coins)||0);return purchased.coins;
}
