const SESSION_COOKIE="swgc_session";
const ENDPOINT="https://script.google.com/macros/s/AKfycbw7x_9kSRpck2bO_iEOC5M13pU07N_q0VVbVa6BaQeAgVfbe_cIs139Vv_7XP6g1pQo/exec";
const raw=document.cookie.split("; ").find(item=>item.startsWith(SESSION_COOKIE+"="))?.split("=").slice(1).join("=")||"";
let session=null;
if(raw){
 try{
  session=JSON.parse(decodeURIComponent(escape(atob(raw))));
  if(!session.expiresAt||Date.now()>=session.expiresAt||!session.email||!session.token)session=null;
 }catch{
  session=null;
 }
}
function redirectToLogin(){
 document.cookie=SESSION_COOKIE+"=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
 location.replace("./login.html");
}
function validateSession(){
 if(!session){
  redirectToLogin();
  return;
 }
 const callbackName="swgcGate_"+crypto.randomUUID().replaceAll("-","");
 const script=document.createElement("script");
 let finished=false;
 const finish=valid=>{
  if(finished)return;
  finished=true;
  script.remove();
  delete window[callbackName];
  if(!valid)redirectToLogin();
 };
 window[callbackName]=data=>{
  if(data?.type!=="swgc-session-response")return;
  finish(Boolean(data.ok&&data.email===session.email));
 };
 script.onerror=()=>finish(false);
 const query=new URLSearchParams({
  action:"validate",
  token:session.token,
  callback:callbackName,
  cacheBust:Date.now()
 });
 script.src=ENDPOINT+"?"+query.toString();
 document.head.appendChild(script);
 setTimeout(()=>finish(false),10000);
}
validateSession();