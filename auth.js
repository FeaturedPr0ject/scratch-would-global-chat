const SESSION_COOKIE="swgc_session";
const SESSION_DAYS=2;
const ENDPOINT="https://script.google.com/macros/s/AKfycbw7x_9kSRpck2bO_iEOC5M13pU07N_q0VVbVa6BaQeAgVfbe_cIs139Vv_7XP6g1pQo/exec";
const form=document.querySelector("#loginForm");
const message=document.querySelector("#authMessage");
const signInTab=document.querySelector("#signInTab");
const logInTab=document.querySelector("#logInTab");
const submitButton=document.querySelector("#authSubmit");
let authMode="signIn";
let pendingFrame=null;
let pendingNonce="";

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

function hasValidSession(){
 return Boolean(getSession());
}

function cleanupFrame(){
 if(pendingFrame){
  pendingFrame.remove();
  pendingFrame=null;
 }
 pendingNonce="";
}

function submitAuth(email,password,turnstileToken){
 cleanupFrame();
 pendingNonce=crypto.randomUUID();
 const iframe=document.createElement("iframe");
 iframe.name="swgc-auth-frame-"+pendingNonce;
 iframe.style.display="none";
 document.body.appendChild(iframe);
 pendingFrame=iframe;
 const authForm=document.createElement("form");
 authForm.method="POST";
 authForm.action=ENDPOINT;
 authForm.target=iframe.name;
 authForm.style.display="none";
 const fields={
  action:authMode,
  email,
  password,
  turnstileToken,
  nonce:pendingNonce
 };
 Object.entries(fields).forEach(([name,value])=>{
  const input=document.createElement("input");
  input.type="hidden";
  input.name=name;
  input.value=value;
  authForm.appendChild(input);
 });
 document.body.appendChild(authForm);
 authForm.submit();
 authForm.remove();
}

window.addEventListener("message",event=>{
 if(!pendingFrame||event.source!==pendingFrame.contentWindow)return;
 const data=event.data||{};
 if(data.type!=="swgc-auth-response")return;
 cleanupFrame();
 submitButton.disabled=false;
 if(!data.ok){
  message.textContent=data.error||"Authentication failed.";
  window.turnstile?.reset?.();
  return;
 }
 saveSession(data.email,data.token);
 message.textContent=authMode==="signIn"?"Account created. Signing you in...":"Login successful. Redirecting...";
 location.replace("./");
});

if(hasValidSession())location.replace("./");

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