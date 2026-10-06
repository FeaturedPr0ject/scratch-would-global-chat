const SESSION_COOKIE="swgc_session";
const raw=document.cookie.split("; ").find(item=>item.startsWith(SESSION_COOKIE+"="))?.split("=").slice(1).join("=")||"";
let valid=false;
if(raw){
 try{
  const session=JSON.parse(decodeURIComponent(escape(atob(raw))));
  valid=Boolean(session.expiresAt&&Date.now()<session.expiresAt&&session.email);
 }catch{}
}
if(!valid)location.replace("./login.html");