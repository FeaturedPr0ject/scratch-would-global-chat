const SESSION_COOKIE="swgc_session";
const ENDPOINT="https://script.google.com/macros/s/AKfycbw7x_9kSRpck2bO_iEOC5M13pU07N_q0VVbVa6BaQeAgVfbe_cIs139Vv_7XP6g1pQo/exec";
const raw=document.cookie.split("; ").find(item=>item.startsWith(SESSION_COOKIE+"="))?.split("=").slice(1).join("=")||"";
let session=null;
if(raw){
 try{
  session=JSON.parse(decodeURIComponent(escape(atob(raw))));
  if(!session.expiresAt||Date.now()>=session.expiresAt||!session.email||!session.token){
   session=null;
  }
 }catch{
  session=null;
 }
}
if(!session){
 location.replace("./login.html");
}else{
 const iframe=document.createElement("iframe");
 iframe.style.display="none";
 document.documentElement.appendChild(iframe);
 const cleanup=()=>{
  window.removeEventListener("message",handleMessage);
  iframe.remove();
 };
 const handleMessage=event=>{
  if(event.source!==iframe.contentWindow)return;
  const data=event.data||{};
  if(data.type!=="swgc-session-response")return;
  cleanup();
  if(!data.ok||data.email!==session.email){
   document.cookie=SESSION_COOKIE+"=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
   location.replace("./login.html");
  }
 };
 window.addEventListener("message",handleMessage);
 iframe.src=ENDPOINT+"?action=validate&token="+encodeURIComponent(session.token);
 setTimeout(()=>{
  if(document.documentElement.contains(iframe)){
   cleanup();
   document.cookie=SESSION_COOKIE+"=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
   location.replace("./login.html");
  }
 },10000);
}