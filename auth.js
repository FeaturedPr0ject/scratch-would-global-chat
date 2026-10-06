const SESSION_COOKIE="swg_session";
const SESSION_DAYS=2;
const form=document.querySelector("#loginForm");
const message=document.querySelector("#authMessage");

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
 sessionStorage.setItem("swg-current-user",JSON.stringify(session));
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
 message.textContent="Authentication backend is not configured yet.";
});
