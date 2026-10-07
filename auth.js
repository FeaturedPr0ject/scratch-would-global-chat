const SESSION_COOKIE="swgc_session";
const SESSION_DAYS=2;
const ENDPOINT="https://script.google.com/macros/s/AKfycbw7x_9kSRpck2bO_iEOC5M13pU07N_q0VVbVa6BaQeAgVfbe_cIs139Vv_7XP6g1pQo/exec";
const form=document.querySelector("#loginForm");
const message=document.querySelector("#authMessage");
const signInTab=document.querySelector("#signInTab");
const logInTab=document.querySelector("#logInTab");
const submitButton=document.querySelector("#authSubmit");
let authMode="signIn";
let pendingNonce="";
let pendingTimer=null;

function setAuthMode(mode){
 authMode=mode;
 const signIn=mode==="signIn";
 signInTab.classList.toggle("active",signIn);
 logInTab.classList.toggle("active",!signIn);
 signInTab.setAttribute("aria-selected",String(signIn));
 logInTab.setAttribute("aria-selected",String(!signIn));
 submitButton.textContent=signIn?"Sign In":"Log In";
 message.textContent="";
}

function setCookie(name,value,days){
 const expires=new Date(Date.now()+days*86400000).toUTCString();
 document.cookie=name+"="+encodeURIComponent(value)+"; expires="+expires+"; path=/; SameSite=Lax; Secure";
}

function getCookie(name){
 return document.cookie.split("; ").find(item=>item.startsWith(name+"="))?.split("=").slice(1).join("=")||"";
}

function clearCookie(name){
 document.cookie=name+"=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
}

function saveSession(email,token){
 const session={email,token,createdAt:Date.now(),expiresAt:Date.now()+SESSION_DAYS*86400000};
 setCookie(SESSION_COOKIE,btoa(unescape(encodeURIComponent(JSON.stringify(session)))),SESSION_DAYS);
 sessionStorage.setItem("swgc-current-user",JSON.stringify(session));
}

function getSession(){
 const raw=getCookie(SESSION_COOKIE);
 if(!raw)return null;
 try{
  const session=JSON.parse(decodeURIComponent(escape(atob(raw))));
  if(!session.expiresAt||Date.now()>=session.expiresAt||!session.email||!session.token){
   clearCookie(SESSION_COOKIE);
   return null;
  }
  return session;
 }catch{
  clearCookie(SESSION_COOKIE);
  return null;
 }
}

function stopPolling(){
 if(pendingTimer){
  clearTimeout(pendingTimer);
  pendingTimer=null;
 }
 pendingNonce="";
}

function showAuthNotReachable(){
 stopPolling();
 submitButton.disabled=false;
 message.innerHTML='Auth not reachable. <a href="./troubleshoot.html?reason=Account%20or%20login&error=AUTH_NOT_REACHABLE">Open Troubleshoot</a>';
 window.turnstile?.reset?.();
}

function pollAuth(nonce,startedAt){
 if(nonce!==pendingNonce)return;
 if(Date.now()-startedAt>=10000){
  showAuthNotReachable();
  return;
 }
 const callbackName="swgcAuth_"+crypto.randomUUID().replaceAll("-","");
 const script=document.createElement("script");
 let finished=false;
 const finish=callback=>{
  if(finished)return;
  finished=true;
  script.remove();
  delete window[callbackName];
  callback();
 };
 window[callbackName]=data=>{
  if(data?.pending){
   finish(()=>{});
   if(Date.now()-startedAt<10000){
    pendingTimer=setTimeout(()=>pollAuth(nonce,startedAt),300);
    return;
   }
   showAuthNotReachable();
   return;
  }
  finish(()=>{});
  stopPolling();
  submitButton.disabled=false;
  if(!data?.ok){
   message.textContent=data?.error||"Authentication failed.";
   window.turnstile?.reset?.();
   return;
  }
  saveSession(data.email,data.token);
  message.textContent=authMode==="signIn"?"Account created. Signing you in...":"Login successful. Redirecting...";
  location.replace("./");
 };
 script.onerror=()=>{
  finish(()=>{});
  if(Date.now()-startedAt<10000){
   pendingTimer=setTimeout(()=>pollAuth(nonce,startedAt),300);
   return;
  }
  showAuthNotReachable();
 };
 const query=new URLSearchParams({
  action:"poll",
  nonce,
  callback:callbackName,
  cacheBust:Date.now()
 });
 script.src=ENDPOINT+"?"+query.toString();
 document.head.appendChild(script);
}

function submitAuth(email,password,turnstileToken){
 stopPolling();
 pendingNonce=crypto.randomUUID();
 const nonce=pendingNonce;
 const body=new URLSearchParams({
  action:authMode,
  email,
  password,
  turnstileToken,
  nonce
 });
 const startedAt=Date.now();
 fetch(ENDPOINT,{
  method:"POST",
  mode:"no-cors",
  body
 }).then(()=>{
  pollAuth(nonce,startedAt);
 }).catch(()=>{
  stopPolling();
  submitButton.disabled=false;
  message.textContent="The authentication request could not be sent.";
  window.turnstile?.reset?.();
 });
}

if(getSession())location.replace("./");

signInTab.addEventListener("click",()=>setAuthMode("signIn"));
logInTab.addEventListener("click",()=>setAuthMode("logIn"));

form.addEventListener("submit",event=>{
 event.preventDefault();
 const email=document.querySelector("#emailInput").value.trim();
 const password=document.querySelector("#passwordInput").value;
 const turnstileToken=window.turnstile?.getResponse?.()||"";
 if(!email||!password){
  message.textContent="Enter your email and password.";
  return;
 }
 if(!turnstileToken){
  message.textContent="Complete the CAPTCHA first.";
  return;
 }
 submitButton.disabled=true;
 message.textContent="Signing in...";
 submitAuth(email,password,turnstileToken);
});

setAuthMode("signIn");