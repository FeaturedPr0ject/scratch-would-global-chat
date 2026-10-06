const SESSION_COOKIE="swgc_session";
const SESSION_DAYS=2;
const form=document.querySelector("#loginForm");
const message=document.querySelector("#authMessage");
const signInTab=document.querySelector("#signInTab");
const logInTab=document.querySelector("#logInTab");
const submitButton=document.querySelector("#authSubmit");
const captchaStatus=document.querySelector("#captchaStatus");
let authMode="signIn";
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
function makeSession(email){
 const session={email,createdAt:Date.now(),expiresAt:Date.now()+SESSION_DAYS*86400000};
 setCookie(SESSION_COOKIE,btoa(unescape(encodeURIComponent(JSON.stringify(session)))),SESSION_DAYS);
 sessionStorage.setItem("swgc-current-user",JSON.stringify(session));
}
function hasValidSession(){
 const raw=getCookie(SESSION_COOKIE);
 if(!raw)return false;
 try{
  const session=JSON.parse(decodeURIComponent(escape(atob(raw))));
  if(!session.expiresAt||Date.now()>=session.expiresAt){
   clearCookie(SESSION_COOKIE);
   return false;
  }
  return true;
 }catch{
  clearCookie(SESSION_COOKIE);
  return false;
 }
}
if(hasValidSession())location.replace("./");
signInTab.addEventListener("click",()=>setAuthMode("signIn"));
logInTab.addEventListener("click",()=>setAuthMode("logIn"));
form.addEventListener("submit",event=>{
 event.preventDefault();
 const email=document.querySelector("#emailInput").value.trim();
 const password=document.querySelector("#passwordInput").value;
 const turnstileToken=window.turnstile?.getResponse?.()||"";
 if(captchaStatus){
  message.textContent="CAPTCHA is not configured yet."; 
  return;
 }
 if(!email||!password){
  message.textContent="Enter your email and password.";
  return;
 }
 if(!turnstileToken){
  message.textContent="Complete the CAPTCHA first.";
  return;
 }
 message.textContent=authMode==="signIn"?"Sign In backend is not configured yet.":"Log In backend is not configured yet.";
});
setAuthMode("signIn");