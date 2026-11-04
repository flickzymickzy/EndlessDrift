// Optional Supabase Auth and READ-ONLY public leaderboards.
// No client-side score submissions; games running in a browser cannot provide
// a trustworthy proof that XP or purchases were earned legitimately.
import {CLOUD_CONFIG} from '../cloud-config.js';

const STORAGE='endless-drift-cloud-session-v1';
const root=(CLOUD_CONFIG.url||'').replace(/\/$/,'');
export const cloudConfigured=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(root)&&CLOUD_CONFIG.publishableKey.length>=20;
let session=null;
try{session=JSON.parse(sessionStorage.getItem(STORAGE)||'null');}catch{}
// Supabase's browser OAuth flow returns short-lived credentials in the URL fragment.
// Import them into the existing auth session, then immediately clear the URL.
export let googleOAuthReturned=false;
try{
  if(typeof window==='undefined')throw new Error('Browser-only OAuth return check');
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if(hash.get('access_token') && hash.get('refresh_token')){
    const lifetime=Math.max(60,Number(hash.get('expires_in'))||3600);
    session={
      access_token:hash.get('access_token'),
      refresh_token:hash.get('refresh_token'),
      token_type:hash.get('token_type')||'bearer',
      expires_in:lifetime,
      expires_at:Math.floor(Date.now()/1000)+lifetime
    };
    sessionStorage.setItem(STORAGE,JSON.stringify(session));
    googleOAuthReturned=true;
    history.replaceState(null,'',window.location.pathname);
  } else if(new URLSearchParams(window.location.search).get('auth')==='google'){
    googleOAuthReturned=true;
    history.replaceState(null,'',window.location.pathname);
  }
}catch(err){if(typeof window!=='undefined')console.warn('OAuth return could not be processed',err);}
const basic=()=>({'apikey':CLOUD_CONFIG.publishableKey,'Content-Type':'application/json'});
async function request(path,{method='GET',body,token}={}){
  if(!cloudConfigured())throw new Error('Add your Supabase URL and publishable key to cloud-config.js');
  const res=await fetch(`${root}${path}`,{method,headers:{...basic(),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let data={};try{data=await res.json();}catch{}
  if(!res.ok)throw new Error(String(data.msg||data.error_description||data.message||data.error||`HTTP ${res.status}`).slice(0,280));
  return data;
}
function remember(next){session=next||null;try{if(session)sessionStorage.setItem(STORAGE,JSON.stringify(session));else sessionStorage.removeItem(STORAGE);}catch{}}
async function token(){
 if(!session)return null;
 if(!session.expires_at||Date.now()/1000<session.expires_at-60)return session.access_token;
 if(!session.refresh_token){remember(null);return null;}
 try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});remember(data);return data.access_token;}catch{remember(null);return null;}
}
// Google OAuth is deliberately initiated by a user click, never automatically.
// The Supabase callback handles the provider secret on the server side.
export function cloudSignInGoogle(){
 if(!cloudConfigured())throw new Error('Connect your Supabase Project URL and publishable key in cloud-config.js first');
 const redirectTo=window.location.origin+'/?auth=google';
 const authorize=new URL(`${root}/auth/v1/authorize`);
 authorize.searchParams.set('provider','google');
 authorize.searchParams.set('redirect_to',redirectTo);
 window.location.assign(authorize.toString());
}
export async function cloudSignUp(email,password,username){
 if(!/^[a-zA-Z0-9_]{3,24}$/.test(username))throw new Error('Username must have 3–24 letters, numbers or underscores');
 const data=await request(`/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin)}`,{method:'POST',body:{email,password,data:{username}}});
 if(data.access_token)remember(data);return data;
}
export async function cloudSignIn(email,password){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});remember(data);return data;}
export async function cloudSignOut(){const access=await token();try{if(access)await request('/auth/v1/logout',{method:'POST',token:access});}catch{}remember(null);}
export async function cloudUser(){const access=await token();if(!access)return null;try{return await request('/auth/v1/user',{token:access});}catch{remember(null);return null;}}
export async function cloudBoard(key='lifetime_xp'){
 const col=key==='coins_spent'?'coins_spent':'lifetime_xp';
 const rows=await request(`/rest/v1/leaderboard_public?select=username,lifetime_xp,coins_spent&order=${col}.desc&limit=100`);
 if(!Array.isArray(rows))throw new Error('Invalid leaderboard response');return rows;
}
