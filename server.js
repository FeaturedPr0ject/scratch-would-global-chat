import http from "node:http";
import {createClient} from "@supabase/supabase-js";
import {promises as fs} from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {writeCHC,readCHC,hasCHC,deleteCHC,CHC_CACHE_TYPES} from "./cache/chc.js";

const PORT=Number(process.env.PORT||3000);
const DEFAULT_FRONTEND_ORIGINS=[
 "https://scratch-would-global-chat.vercel.app",
 "https://featuredpr0ject.github.io"
];
const FRONTEND_ORIGINS=[...new Set([
 ...DEFAULT_FRONTEND_ORIGINS,
 ...(process.env.FRONTEND_ORIGINS||"").split(",").map(value=>value.trim()).filter(Boolean)
])];
const SUPABASE_URL=process.env.SUPABASE_URL||"";
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||"";
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const OWNER_LOGIN_CODE=process.env.OWNER_LOGIN_CODE||"";
const ownerLoginAttempts=new Map();
const emailRecoverySendAttempts=new Map();
const emailRecoveryVerifyAttempts=new Map();
const CACHE_ROOT=path.resolve(process.env.CHC_CACHE_DIR||path.join(process.cwd(),"cache"));
let cacheReady=false;
let cacheError="Cache initialization has not run.";

async function initializeCache(){
 try{
  await fs.mkdir(CACHE_ROOT,{recursive:true});
  for(const type of CHC_CACHE_TYPES)await fs.mkdir(path.join(CACHE_ROOT,type),{recursive:true});
  process.stdout.write("CHC cache folders created: "+CHC_CACHE_TYPES.map(type=>path.join(CACHE_ROOT,type)).join(", ")+"\\n");
  if(!process.env.CHC_CACHE_KEY){
   cacheReady=false;
   cacheError="CHC_CACHE_KEY is missing.";
   process.stderr.write(cacheError+"\\n");
   return;
  }
  const exists=await hasCHC("configserver","config");
  if(exists){
   try{
    await readCHC("configserver","config");
   }catch(error){
    process.stderr.write("Existing config.chc could not be read; recreating config cache: "+error.message+"\\n");
    await deleteCHC("configserver","config");
    await writeCHC("configserver","config",{format:"CHC2",version:1,cacheEnabled:true,createdAt:new Date().toISOString()});
    await readCHC("configserver","config");
   }
  }else{
   await writeCHC("configserver","config",{format:"CHC2",version:1,cacheEnabled:true,createdAt:new Date().toISOString()});
   await readCHC("configserver","config");
  }
  cacheReady=true;
  cacheError="";
  process.stdout.write("CHC cache initialized and encrypted.\\n");
 }catch(error){
  cacheReady=false;
  cacheError=error instanceof Error?error.message:"Unknown cache initialization error.";
  process.stderr.write("CHC cache initialization failed: "+cacheError+"\\n");
 }

}



function send(response,status,payload){
 response.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
 response.end(JSON.stringify(payload));
}

function setCors(request,response){
 const origin=request.headers.origin||"";
 const allowed=FRONTEND_ORIGINS.length===0||FRONTEND_ORIGINS.includes(origin);
 if(allowed&&origin)response.setHeader("Access-Control-Allow-Origin",origin);
 response.setHeader("Vary","Origin");
 response.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
 response.setHeader("Access-Control-Allow-Methods","GET, POST, DELETE, OPTIONS");
}

async function readBody(request){
 let body="";
 for await(const chunk of request){
  body+=chunk;
  if(body.length>7500000)throw Object.assign(new Error("Request body is too large."),{status:413});
 }
 if(!body)return {};
 try{return JSON.parse(body)}catch{throw Object.assign(new Error("Invalid JSON."),{status:400});}
}

function clean(value,max=500){
 return String(value??"").trim().replace(/\s+/g," ").slice(0,max);
}

function createUserClient(token){
 return createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{headers:{Authorization:"Bearer "+token}}
 });
}

function createAdminClient(){
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)throw Object.assign(new Error("Account recovery is not configured on the server."),{status:503});
 return createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

function safeEqual(left,right){
 const a=Buffer.from(String(left||""));
 const b=Buffer.from(String(right||""));
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

function accountPassword(seed,userId){
 return crypto.createHmac("sha256",seed).update("swgc-account-session:"+userId).digest("base64url")+"!Aa7";
}

function accountEmail(user){
 return user.email||("swgc-"+user.id+"@accounts.swgc.invalid");
}

async function createAccountSession(userId,seed){
 const admin=createAdminClient();
 const found=await admin.auth.admin.getUserById(userId);
 if(found.error||!found.data.user)throw Object.assign(new Error("Account not found."),{status:404});
 const user=found.data.user;
 const email=accountEmail(user);
 const password=accountPassword(seed,userId);
 const update=await admin.auth.admin.updateUserById(userId,{email,password,email_confirm:true});
 if(update.error)throw Object.assign(new Error("Could not prepare account sign-in."),{status:500});
 const publicClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const signedIn=await publicClient.auth.signInWithPassword({email,password});
 if(signedIn.error||!signedIn.data.session)throw Object.assign(new Error("Could not create a Supabase session."),{status:500});
 return signedIn.data.session;
}

async function handleOwnerLogin(request,response,body){
 if(!OWNER_LOGIN_CODE||!SUPABASE_SERVICE_ROLE_KEY)throw Object.assign(new Error("Owner Keys are not configured on the server."),{status:503});
 const submitted=String(body.code||"").trim();
 if(!submitted)throw Object.assign(new Error("Enter the Owner Key."),{status:400});
 const clientKey=requesterAddress(request);
 enforceRateLimit(ownerLoginAttempts,clientKey,5,15*60*1000);
 if(!safeEqual(submitted,OWNER_LOGIN_CODE))throw Object.assign(new Error("Invalid Owner Key."),{status:401});
 ownerLoginAttempts.delete(clientKey);
 const admin=createAdminClient();
 const result=await admin.from("profiles").select("id,username,username_key").eq("username_key","01").maybeSingle();
 if(result.error)throw Object.assign(new Error("Could not locate the Owner profile."),{status:500});
 if(!result.data||String(result.data.username||"").toLowerCase()!=="01")throw Object.assign(new Error("The Owner profile username 01 has not been created yet."),{status:404});
 const session=await createAccountSession(result.data.id,"owner:"+OWNER_LOGIN_CODE);
 send(response,200,{ok:true,session,username:"01"});
}

function requesterAddress(request){
 const values=String(request.headers["x-forwarded-for"]||"").split(",").map(value=>value.trim()).filter(Boolean);
 return values[0]||request.socket.remoteAddress||"unknown";
}
function enforceRateLimit(map,key,limit,windowMs,cooldownMs=0){
 const now=Date.now();let item=map.get(key)||{count:0,windowStart:now,lastAt:0,blockedUntil:0};
 if(item.blockedUntil>now)throw Object.assign(new Error("Too many attempts. Please try again later."),{status:429});
 if(now-item.windowStart>=windowMs)item={count:0,windowStart:now,lastAt:0,blockedUntil:0};
 if(cooldownMs>0&&now-item.lastAt<cooldownMs)throw Object.assign(new Error("Please wait before trying again."),{status:429});
 item.count++;item.lastAt=now;
 if(item.count>limit){item.blockedUntil=now+windowMs;map.set(key,item);throw Object.assign(new Error("Too many attempts. Please try again later."),{status:429});}
 map.set(key,item);
}
function normalizeEmail(value){
 const email=String(value||"").trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Object.assign(new Error("Enter a valid email address."),{status:400});
 return email;
}
function isManagedAccount(user){return Boolean(user&&(user.is_anonymous||user.email==="swgc-"+user.id+"@accounts.swgc.invalid"));}
function requireManagedAccount(user){if(!isManagedAccount(user))throw Object.assign(new Error("This account uses an external sign-in method. Manage recovery through that sign-in provider."),{status:409});}
async function updateUserMetadata(admin,user,metadata){
 const result=await admin.auth.admin.updateUserById(user.id,{app_metadata:metadata});
 if(result.error)throw Object.assign(new Error("Could not save account recovery settings."),{status:500});
 return result.data.user;
}
async function findUserByRecoveryEmail(admin,email){
 for(let page=1;page<=20;page++){
  const result=await admin.auth.admin.listUsers({page,perPage:1000});
  if(result.error)throw Object.assign(new Error("Could not look up recovery email."),{status:500});
  const users=result.data?.users||[];
  const match=users.find(item=>String(item.app_metadata?.swgc_recovery_email||"").trim().toLowerCase()===email);
  if(match)return match;if(users.length<1000)break;
 }
 return null;
}
function requireMailtrapConfiguration(){
 const missing=[];if(!process.env.MAILTRAP_API_KEY)missing.push("MAILTRAP_API_KEY");if(!process.env.MAILTRAP_FROM)missing.push("MAILTRAP_FROM");
 if(missing.length)throw Object.assign(new Error("Email sending is not configured. Missing Render environment setting: "+missing.join(", ")),{status:503});
}
function parseMailtrapSender(value){
 const input=String(value||"").trim(),match=input.match(/^(.*?)\\s*<([^<>]+)>$/);
 if(match)return {name:match[1].trim()||"SWGC Room Chats",email:match[2].trim()};
 return {name:"SWGC Room Chats",email:input};
}
async function sendTransactionalEmail({to,subject,text,html}){
 requireMailtrapConfiguration();
 const payload={from:parseMailtrapSender(process.env.MAILTRAP_FROM),to:[{email:to}],subject,text};
 if(html)payload.html=html;
 const upstream=await fetch("https://send.api.mailtrap.io/api/send",{method:"POST",headers:{"Api-Token":process.env.MAILTRAP_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const result=await upstream.json().catch(()=>({}));
 if(!upstream.ok)throw Object.assign(new Error(typeof result.message==="string"?result.message:typeof result.errors?.[0]==="string"?result.errors[0]:"Mailtrap could not send the email. Check the sending domain and API token."),{status:502});
 return result;
}
async function sendRecoveryVerification(admin,user,email,purpose,request){
 requireMailtrapConfiguration();
 enforceRateLimit(emailRecoverySendAttempts,requesterAddress(request)+":"+purpose+":"+email,5,60*60*1000,60*1000);
 requireManagedAccount(user);
 const fresh=await admin.auth.admin.getUserById(user.id);
 if(fresh.error||!fresh.data.user)throw Object.assign(new Error("Account not found."),{status:404});
 const current=fresh.data.user,metadata={...(current.app_metadata||{})};
 const sentField=purpose==="setup"?"swgc_email_setup_sent_at":"swgc_email_login_sent_at";
 const lastSent=Number(metadata[sentField]||0);
 if(lastSent&&Date.now()-lastSent<60000)throw Object.assign(new Error("Wait 60 seconds before requesting another email code."),{status:429});
 const code=String(crypto.randomInt(100000,1000000)),expiresAt=Date.now()+10*60*1000;
 const hash=crypto.createHash("sha256").update(user.id+":"+purpose+":"+email+":"+code).digest("hex");
 if(purpose==="setup"){
  metadata.swgc_pending_recovery_email=email;metadata.swgc_pending_email_code_hash=hash;metadata.swgc_pending_email_code_expires_at=expiresAt;metadata.swgc_pending_email_code_attempts=0;
 }else{
  metadata.swgc_email_login_code_hash=hash;metadata.swgc_email_login_code_expires_at=expiresAt;metadata.swgc_email_login_code_attempts=0;
 }
 metadata[sentField]=Date.now();await updateUserMetadata(admin,current,metadata);
 const textBody=["Your SWGC Room Chats verification code is: "+code,"","This code expires in 10 minutes and can only be used once.","If you did not request this code, you can ignore this email."].join("\n");
 await sendTransactionalEmail({to:email,subject:purpose==="setup"?"Verify your SWGC recovery email":"Your SWGC account recovery code",text:textBody});
 return {expiresAt};
}
async function handleAccountRecovery(request,response,body,mode){
 const admin=createAdminClient();
 if(mode==="create"){
  const identity=await getIdentity(request);requireManagedAccount(identity.user);
  const found=await admin.auth.admin.getUserById(identity.user.id);
  if(found.error||!found.data.user)throw Object.assign(new Error("Account not found."),{status:404});
  const user=found.data.user,now=Date.now(),metadata={...(user.app_metadata||{})};
  const last=Number(metadata.swgc_recovery_last_generated_at||0);
  const recent=Array.isArray(metadata.swgc_recovery_generation_times)?metadata.swgc_recovery_generation_times.filter(value=>Number(value)>now-3600000):[];
  if(last&&now-last<60000)throw Object.assign(new Error("Wait 60 seconds before generating another recovery key."),{status:429});
  if(recent.length>=3)throw Object.assign(new Error("Recovery key limit reached. You can generate up to 3 keys per hour."),{status:429});
  const secret=crypto.randomBytes(24).toString("base64url"),code="SWGC1."+user.id+"."+secret;
  metadata.swgc_recovery_hash=crypto.createHash("sha256").update(secret).digest("hex");
  metadata.swgc_recovery_expires_at=now+3600000;metadata.swgc_recovery_last_generated_at=now;
  metadata.swgc_recovery_generation_times=[...recent,now];delete metadata.swgc_recovery_used_at;
  await updateUserMetadata(admin,user,metadata);send(response,200,{ok:true,code,expiresAt:metadata.swgc_recovery_expires_at});return;
 }
 const code=String(body.code||"").trim(),match=code.match(/^SWGC1\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{30,50})$/i);
 if(!match)throw Object.assign(new Error("Invalid recovery key."),{status:400});
 const userId=match[1],secret=match[2],found=await admin.auth.admin.getUserById(userId);
 if(found.error||!found.data.user)throw Object.assign(new Error("Account not found."),{status:404});
 const user=found.data.user,metadata={...(user.app_metadata||{})};
 const stored=String(metadata.swgc_recovery_hash||""),expiresAt=Number(metadata.swgc_recovery_expires_at||0);
 if(!expiresAt||expiresAt<=Date.now()){
  delete metadata.swgc_recovery_hash;delete metadata.swgc_recovery_expires_at;await updateUserMetadata(admin,user,metadata);
  throw Object.assign(new Error("Recovery key expired. Generate a new key while signed in."),{status:410});
 }
 if(!safeEqual(stored,crypto.createHash("sha256").update(secret).digest("hex")))throw Object.assign(new Error("Recovery key is invalid or has been replaced."),{status:401});
 requireManagedAccount(user);delete metadata.swgc_recovery_hash;delete metadata.swgc_recovery_expires_at;metadata.swgc_recovery_used_at=Date.now();
 await updateUserMetadata(admin,user,metadata);
 const session=await createAccountSession(userId,"recovery:"+secret);send(response,200,{ok:true,session});
}
async function handleRecoveryEmailSettings(request,response,body,mode){
 const identity=await getIdentity(request),admin=createAdminClient();
 const found=await admin.auth.admin.getUserById(identity.user.id);
 if(found.error||!found.data.user)throw Object.assign(new Error("Account not found."),{status:404});
 const user=found.data.user;requireManagedAccount(user);
 if(mode==="status"){send(response,200,{ok:true,email:String(user.app_metadata?.swgc_recovery_email||""),verified:Boolean(user.app_metadata?.swgc_recovery_email)});return;}
 if(mode==="start"){
  const email=normalizeEmail(body.email),existing=await findUserByRecoveryEmail(admin,email);
  if(existing&&existing.id!==user.id)throw Object.assign(new Error("This email is already connected to another SWGC account."),{status:409});
  await sendRecoveryVerification(admin,user,email,"setup",request);
  send(response,200,{ok:true,message:"Verification code sent. Check your inbox and spam folder."});return;
 }
 const email=normalizeEmail(body.email),code=String(body.code||"").replace(/\s+/g,"");
 const current=await admin.auth.admin.getUserById(user.id);
 if(current.error||!current.data.user)throw Object.assign(new Error("Account not found."),{status:404});
 const latest=current.data.user,metadata={...(latest.app_metadata||{})};
 const pending=String(metadata.swgc_pending_recovery_email||"").toLowerCase(),expires=Number(metadata.swgc_pending_email_code_expires_at||0),expected=String(metadata.swgc_pending_email_code_hash||"");
 if(!expected||expires<=Date.now()||email!==pending){
  delete metadata.swgc_pending_recovery_email;delete metadata.swgc_pending_email_code_hash;delete metadata.swgc_pending_email_code_expires_at;
  await updateUserMetadata(admin,latest,metadata);throw Object.assign(new Error("Verification code expired. Request a new code."),{status:410});
 }
 const attempts=Number(metadata.swgc_pending_email_code_attempts||0);
 if(attempts>=5)throw Object.assign(new Error("Too many incorrect codes. Request a new code later."),{status:429});
 const actual=crypto.createHash("sha256").update(user.id+":setup:"+email+":"+code).digest("hex");
 if(!safeEqual(expected,actual)){
  metadata.swgc_pending_email_code_attempts=attempts+1;
  if(attempts+1>=5){delete metadata.swgc_pending_recovery_email;delete metadata.swgc_pending_email_code_hash;delete metadata.swgc_pending_email_code_expires_at;}
  await updateUserMetadata(admin,latest,metadata);throw Object.assign(new Error("The verification code is incorrect."),{status:401});
 }
 metadata.swgc_recovery_email=email;delete metadata.swgc_pending_recovery_email;delete metadata.swgc_pending_email_code_hash;delete metadata.swgc_pending_email_code_expires_at;delete metadata.swgc_pending_email_code_attempts;
 await updateUserMetadata(admin,latest,metadata);send(response,200,{ok:true,email});
}
async function handleEmailAccountRecovery(request,response,body,mode){
 const admin=createAdminClient();requireResendConfiguration();const email=normalizeEmail(body.email);
 if(mode==="start"){
  enforceRateLimit(emailRecoverySendAttempts,requesterAddress(request)+":lookup:"+email,5,3600000,60000);
  const user=await findUserByRecoveryEmail(admin,email);
  if(user&&isManagedAccount(user)){
   const last=Number(user.app_metadata?.swgc_email_login_sent_at||0);
   if(!last||Date.now()-last>=60000)await sendRecoveryVerification(admin,user,email,"login",request);
  }
  send(response,200,{ok:true,message:"If this email is linked to a SWGC account, a recovery code has been sent."});return;
 }
 const code=String(body.code||"").replace(/\s+/g,""),user=await findUserByRecoveryEmail(admin,email);
 if(!user||!isManagedAccount(user))throw Object.assign(new Error("Invalid or expired email recovery code."),{status:401});
 enforceRateLimit(emailRecoveryVerifyAttempts,requesterAddress(request)+":verify:"+email,5,15*60*1000);
 const latestResult=await admin.auth.admin.getUserById(user.id);
 if(latestResult.error||!latestResult.data.user)throw Object.assign(new Error("Invalid or expired email recovery code."),{status:401});
 const latest=latestResult.data.user,metadata={...(latest.app_metadata||{})};
 const expected=String(metadata.swgc_email_login_code_hash||""),expires=Number(metadata.swgc_email_login_code_expires_at||0);
 if(!expected||expires<=Date.now())throw Object.assign(new Error("Invalid or expired email recovery code."),{status:401});
 const attempts=Number(metadata.swgc_email_login_code_attempts||0);
 if(attempts>=5)throw Object.assign(new Error("Too many incorrect codes. Request a new code later."),{status:429});
 const actual=crypto.createHash("sha256").update(user.id+":login:"+email+":"+code).digest("hex");
 if(!safeEqual(expected,actual)){
  metadata.swgc_email_login_code_attempts=attempts+1;
  if(attempts+1>=5){delete metadata.swgc_email_login_code_hash;delete metadata.swgc_email_login_code_expires_at;delete metadata.swgc_email_login_code_attempts;}
  await updateUserMetadata(admin,latest,metadata);throw Object.assign(new Error("Invalid or expired email recovery code."),{status:401});
 }
 delete metadata.swgc_email_login_code_hash;delete metadata.swgc_email_login_code_expires_at;delete metadata.swgc_email_login_code_attempts;
 await updateUserMetadata(admin,latest,metadata);
 const session=await createAccountSession(user.id,"email-recovery:"+code);send(response,200,{ok:true,session});
}
async function handleDeleteAccount(request,response){
 const identity=await getIdentity(request),admin=createAdminClient(),userId=identity.user.id;
 const removeRows=async(table,column)=>{const result=await admin.from(table).delete().eq(column,userId);if(result.error)throw Object.assign(new Error("Could not safely delete account data from "+table+"."),{status:500});};
 await removeRows("chat_files","user_id");await removeRows("messages","user_id");await removeRows("group_messages","user_id");await removeRows("group_members","user_id");
 await removeRows("groups","owner_id");await removeRows("friend_requests","requester_id");await removeRows("friend_requests","recipient_id");
 await removeRows("friendships","user_a");await removeRows("friendships","user_b");await removeRows("username_history","profile_id");
 const deleted=await admin.auth.admin.deleteUser(userId);
 if(deleted.error)throw Object.assign(new Error("Could not delete this account. Please contact support."),{status:500});
 if(process.env.CHC_CACHE_KEY){
  try{await deleteCHC("profilesdata",userId);const cached=await readCHC("profilesdata","all_profiles");if(cached&&Array.isArray(cached.profiles)){cached.profiles=cached.profiles.filter(item=>item.id!==userId);await writeCHC("profilesdata","all_profiles",cached);}const messages=await readCHC("messages","public");if(Array.isArray(messages))await writeCHC("messages","public",messages.filter(item=>item.user_id!==userId));}catch{}
 }
 send(response,200,{ok:true});
}

async function getIdentity(request){
 const match=String(request.headers.authorization||"").match(/^Bearer\s+(.+)$/i);
 if(!match)throw Object.assign(new Error("Authentication required."),{status:401});
 const client=createUserClient(match[1]);
 const result=await client.auth.getUser(match[1]);
 if(result.error||!result.data.user)throw Object.assign(new Error("Session expired. Please sign in again."),{status:401});
 return {client,user:result.data.user};
}

async function updateDataCache(url,method,userId,data){
 if(!process.env.CHC_CACHE_KEY||!data?.ok)return;
 try{
  if(url.pathname==="/api/profiles"&&method==="POST"&&data.profile){
   await writeCHC("profilesdata",userId,data.profile);
   try{
    const cached=await readCHC("profilesdata","all_profiles");
    const profiles=Array.isArray(cached?.profiles)?cached.profiles:[];
    const index=profiles.findIndex(item=>item.id===userId);
    if(index>=0)profiles[index]={...profiles[index],...data.profile};
    else profiles.push(data.profile);
    await writeCHC("profilesdata","all_profiles",{profiles,expiresAt:Date.now()+30000});
   }catch{}
   return;
  }
  if(url.pathname==="/api/profiles"&&method==="GET"&&Array.isArray(data.profiles)){
   await writeCHC("profilesdata","all_profiles",{profiles:data.profiles,expiresAt:Date.now()+30000});
   return;
  }
  if(url.pathname==="/api/group-messages"&&method==="GET"){
   const groupId=url.searchParams.get("group_id")?.trim()||"";
   if(groupId)await writeCHC("messages","group_"+groupId,(data.messages||[]).slice(-100));
   return;
  }
  if(url.pathname==="/api/messages"&&method==="GET"){
   await writeCHC("messages","public",(data.messages||[]).slice(-100));
   return;
  }
  if((url.pathname==="/api/group-messages"||url.pathname==="/api/messages")&&method==="POST"&&data.message){
   const message=data.message;
   const isGroup=url.pathname==="/api/group-messages";
   const groupId=String(message.group_id||url.searchParams.get("group_id")||"");
   const cacheName=isGroup?"group_"+groupId:"public";
   const current=await readCHC("messages",cacheName);
   const messages=Array.isArray(current)?current:[];
   await writeCHC("messages",cacheName,[...messages.filter(item=>item.id!==message.id),message].slice(-100));
   if(message.type==="sticker"){
    await writeCHC("stickers",message.id,{...message,group_id:isGroup?groupId:null,cachedAt:new Date().toISOString()});
   }else if(message.type==="file"||message.type==="image"){
    await writeCHC("attachments",message.id,{...message,group_id:isGroup?groupId:null,cachedAt:new Date().toISOString()});
   }
   return;
  }
  if((url.pathname==="/api/messages"||url.pathname==="/api/group-messages")&&method==="DELETE"){
   if(url.pathname==="/api/messages")await deleteCHC("messages","public");
   else{
    const groupId=url.searchParams.get("group_id")||"";
    if(groupId)await deleteCHC("messages","group_"+groupId);
   }
  }
 }catch(cacheFailure){
  process.stderr.write("CHC data cache write failed: "+cacheFailure.message+"\\n");
 }
}

async function handleDatabase(response,url,method,body,identity){
 const {client,user}=identity;
 const userId=user.id;
 const profileResult=await client.from("profiles").select("id,user_number,username,display_name,note,avatar_url").eq("id",userId).maybeSingle();
 if(profileResult.error)throw profileResult.error;
 const profile=profileResult.data;
 let data=null;
 let error=null;

 if(url.pathname==="/api/profiles"&&method==="GET"){
  let cachedProfiles=null;
  if(process.env.CHC_CACHE_KEY&&cacheReady){
   try{
    const cached=await readCHC("profilesdata","all_profiles");
    if(cached&&Array.isArray(cached.profiles)&&Number(cached.expiresAt)>Date.now())cachedProfiles=cached.profiles;
   }catch{}
  }
  if(cachedProfiles){
   data={ok:true,profiles:cachedProfiles};
  }else{
   const result=await client.from("profiles").select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").order("created_at",{ascending:true});
   data={ok:true,profiles:result.data||[]};error=result.error;
  }
 }else if(url.pathname==="/api/username"&&method==="GET"){
  const username=url.searchParams.get("username")?.trim()||"";
  const result=await client.from("profiles").select("id,user_number").eq("username_key",username.toLowerCase()).maybeSingle();
  data={ok:true,taken:Boolean(result.data)};error=result.error;
 }else if(url.pathname==="/api/users/search"&&method==="GET"){
  const query=url.searchParams.get("q")?.trim()||"";
  const result=/^\d+$/.test(query)
   ? await client.from("profiles").select("id,user_number,username,display_name,note,avatar_url,last_seen").eq("user_number",Number(query)).maybeSingle()
   : await client.from("profiles").select("id,user_number,username,display_name,note,avatar_url,last_seen").eq("username_key",query.toLowerCase()).maybeSingle();
  data={ok:true,profile:result.data||null};error=result.error;
 }else if(url.pathname==="/api/groups"&&method==="GET"){
  const result=await client.from("groups").select("id,owner_id,name,avatar_url,created_at,deleted_at").order("created_at",{ascending:true});
  data={ok:true,groups:result.data||[]};error=result.error;
 }else if(url.pathname==="/api/groups"&&method==="POST"){
  const name=clean(body.name,48);
  if(name.length<2)throw new Error("Group name must be 2-48 characters.");
  const result=await client.from("groups").insert({owner_id:userId,name}).select("id,owner_id,name,avatar_url,created_at,deleted_at").single();
  data={ok:true,group:result.data};error=result.error;
 }else if(url.pathname==="/api/groups/update"&&method==="POST"){
  const groupId=clean(body.group_id,100);
  const name=clean(body.name,48);
  const avatarUrl=String(body.avatar_url||"").trim();
  if(!groupId)throw new Error("Group ID is required");
  if(name.length<2||name.length>48)throw new Error("Group name must be 2-48 characters.");
  if(avatarUrl.length>1500000)throw new Error("Group avatar is too large.");
  const result=await client.from("groups").update({name,avatar_url:avatarUrl||null}).eq("id",groupId).eq("owner_id",userId).is("deleted_at",null).select("id,owner_id,name,avatar_url,created_at,deleted_at").single();
  data={ok:true,group:result.data};error=result.error;
 }else if(url.pathname==="/api/groups/delete"&&method==="POST"){
  const groupId=clean(body.group_id,100);
  if(!groupId)throw new Error("Group ID is required");
  const result=await client.rpc("delete_group",{group_id_value:groupId});
  if(result.error)throw result.error;
  data={ok:true,deleted:Boolean(result.data)};
 }else if(url.pathname==="/api/group-members"&&method==="POST"){
  const groupId=clean(body.group_id,100);
  const memberIds=Array.isArray(body.user_ids)?[...new Set(body.user_ids.map(value=>String(value).trim()).filter(value=>value&&value!==userId))]:[];
  if(!groupId)throw new Error("Group ID is required");
  if(memberIds.length){
   const result=await client.from("group_members").insert(memberIds.map(memberId=>({group_id:groupId,user_id:memberId})));
   if(result.error)throw result.error;
  }
  data={ok:true};
 }else if(url.pathname==="/api/group-messages"&&method==="GET"){
  const groupId=url.searchParams.get("group_id")?.trim()||"";
  if(!groupId)throw new Error("Group ID is required");
  const result=await client.from("group_messages").select("id,group_id,user_id,user_number,username,display_name,avatar_url,text,type,attachment_name,attachment_size,attachment_mime,created_at").eq("group_id",groupId).order("created_at",{ascending:false}).limit(100);
  data={ok:true,messages:(result.data||[]).reverse()};error=result.error;
 }else if(url.pathname==="/api/group-messages"&&method==="POST"){
  const groupId=clean(body.group_id,100);
  const messageText=String(body.text||"").trim().slice(0,500);
  const type=["sticker","image","file"].includes(body.type)?body.type:"text";
  if(!groupId)throw new Error("Group ID is required");
  if(!messageText)throw new Error("Message cannot be empty");
  if(!profile)throw new Error("Profile not found");
  const attachmentName=clean(body.attachment_name,255);
  const attachmentSize=Number(body.attachment_size||0);
  const attachmentMime=clean(body.attachment_mime,255);
  if((type==="image"||type==="file")&&(attachmentSize<=0||attachmentSize>4194304))throw new Error("Attachment size must be between 1 byte and 4 MB");
  const result=await client.from("group_messages").insert({group_id:groupId,user_id:profile.id,user_number:profile.user_number,username:profile.username,display_name:profile.display_name,avatar_url:profile.avatar_url,text:messageText,type,attachment_name:type==="text"||type==="sticker"?null:attachmentName||"Attachment",attachment_size:type==="text"||type==="sticker"?null:attachmentSize,attachment_mime:type==="text"||type==="sticker"?null:attachmentMime}).select("id,group_id,user_id,user_number,username,display_name,avatar_url,text,type,attachment_name,attachment_size,attachment_mime,created_at").single();
  data={ok:true,message:result.data};error=result.error;
 }else if(url.pathname==="/api/group-messages"&&method==="DELETE"){
  const messageId=clean(body.id,100);
  if(!messageId)throw new Error("Message ID is required");
  const result=await client.from("group_messages").delete().eq("id",messageId).eq("user_id",userId).select("id").maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)throw new Error("Message not found or you are not allowed to delete it.");
  data={ok:true,message_id:result.data.id};
 }else if(url.pathname==="/api/messages"&&method==="GET"){
  const result=await client.from("messages").select("id,user_id,user_number,username,display_name,avatar_url,text,type,attachment_name,attachment_size,attachment_mime,created_at").order("created_at",{ascending:false}).limit(100);
  data={ok:true,messages:(result.data||[]).reverse()};error=result.error;
 }else if(url.pathname==="/api/friends"&&method==="GET"){
  const result=await client.from("friend_requests").select("id,requester_id,recipient_id,status,created_at,updated_at").or("requester_id.eq."+userId+",recipient_id.eq."+userId).in("status",["pending","accepted"]).order("updated_at",{ascending:false});
  if(result.error)throw result.error;
  const ids=[...new Set((result.data||[]).map(item=>item.requester_id===userId?item.recipient_id:item.requester_id))];
  const profilesResult=ids.length?await client.from("profiles").select("id,user_number,username,display_name,avatar_url").in("id",ids):{data:[],error:null};
  if(profilesResult.error)throw profilesResult.error;
  const profilesMap=new Map((profilesResult.data||[]).map(item=>[item.id,item]));
  data={ok:true,friends:(result.data||[]).map(item=>{
   const otherId=item.requester_id===userId?item.recipient_id:item.requester_id;
   const other=profilesMap.get(otherId);
   return {id:item.id,user_id:otherId,user_number:other?.user_number||null,status:item.status,username:other?.username||"",display_name:other?.display_name||"",avatar_url:other?.avatar_url||"",incoming:item.recipient_id===userId};
  })};
 }else if(url.pathname==="/api/friends/request"&&method==="POST"){
  const requesterId=String(body.user_id||"");
  const targetId=String(body.target_user_id||"");
  if(!requesterId||requesterId!==userId||!targetId||requesterId===targetId)throw new Error("Invalid friend request");
  const existing=await client.from("friend_requests").select("id,status,requester_id,recipient_id").or("and(requester_id.eq."+requesterId+",recipient_id.eq."+targetId+"),and(requester_id.eq."+targetId+",recipient_id.eq."+requesterId+")").in("status",["pending","accepted"]).limit(1).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data?.status==="accepted")throw new Error("You are already friends.");
  if(existing.data?.status==="pending")throw new Error("Friend request already exists.");
  const result=await client.from("friend_requests").insert({requester_id:requesterId,recipient_id:targetId,status:"pending"}).select("id,requester_id,recipient_id,status,created_at,updated_at").single();
  data={ok:true,message:"Friend request sent.",friend:result.data};error=result.error;
 }else if(url.pathname==="/api/friends/unfriend"&&method==="POST"){
  const targetId=String(body.target_user_id||"");
  if(!targetId||targetId===userId)throw new Error("Invalid friend");
  const friendship=await client.from("friendships").delete().or("and(user_a.eq."+userId+",user_b.eq."+targetId+"),and(user_a.eq."+targetId+",user_b.eq."+userId+")");
  if(friendship.error)throw friendship.error;
  const requests=await client.from("friend_requests").delete().or("and(requester_id.eq."+userId+",recipient_id.eq."+targetId+"),and(requester_id.eq."+targetId+",recipient_id.eq."+userId+")");
  if(requests.error)throw requests.error;
  data={ok:true,message:"Friend removed."};
 }else if(url.pathname==="/api/friends/respond"&&method==="POST"){
  const action=body.action==="accept"?"accepted":body.action==="decline"?"declined":"";
  if(!action||String(body.user_id||"")!==userId)throw new Error("Invalid friend response");
  const result=await client.from("friend_requests").update({status:action}).eq("id",body.request_id).eq("recipient_id",userId).select("id,requester_id,recipient_id,status,created_at,updated_at").single();
  data={ok:true,friend:result.data};error=result.error;
 }else if(url.pathname==="/api/profiles"&&method==="POST"){
  const id=String(body.id||"");
  const username=clean(body.username,32);
  const displayName=clean(body.display_name,80);
  const note=String(body.note||"").trim().slice(0,1000);
  const avatarUrl=String(body.avatar_url||"").trim().slice(0,6000000);
  if(!id||id!==userId||username.length<2)throw new Error("Username is required");
  const existing=await client.from("profiles").select("id").eq("id",userId).maybeSingle();
  if(existing.error)throw existing.error;
  const payload={id:userId,username,display_name:displayName||username,note,avatar_url:avatarUrl};
  const result=existing.data
   ? await client.from("profiles").update({username,display_name:payload.display_name,note,avatar_url:avatarUrl}).eq("id",userId).select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").single()
   : await client.from("profiles").insert(payload).select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").single();
  data={ok:true,profile:result.data};error=result.error;
 }else if(url.pathname==="/api/messages"&&method==="DELETE"){
  const messageId=clean(body.id,100);
  if(!messageId)throw new Error("Message ID is required");
  const result=await client.from("messages").delete().eq("id",messageId).eq("user_id",userId).select("id").maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)throw new Error("Message not found or you are not allowed to delete it.");
  data={ok:true,message_id:result.data.id};
 }else if(url.pathname==="/api/messages"&&method==="POST"){
  const messageText=String(body.text||"").trim().slice(0,500);
  const type=["sticker","image","file"].includes(body.type)?body.type:"text";
  if(!messageText)throw new Error("Message cannot be empty");
  if(!profile)throw new Error("Profile not found");
  const attachmentName=clean(body.attachment_name,255);
  const attachmentSize=Number(body.attachment_size||0);
  const attachmentMime=clean(body.attachment_mime,255);
  if((type==="image"||type==="file")&&(attachmentSize<=0||attachmentSize>4194304))throw new Error("Attachment size must be between 1 byte and 4 MB");
  const result=await client.from("messages").insert({user_id:profile.id,user_number:profile.user_number,username:profile.username,display_name:profile.display_name,avatar_url:profile.avatar_url,text:messageText,attachment_name:type==="text"||type==="sticker"?null:attachmentName||"Attachment",attachment_size:type==="text"||type==="sticker"?null:attachmentSize,attachment_mime:type==="text"||type==="sticker"?null:attachmentMime,type}).select("id,user_id,user_number,username,display_name,avatar_url,text,type,attachment_name,attachment_size,attachment_mime,created_at").single();
  data={ok:true,message:result.data};error=result.error;
 }else{
  throw Object.assign(new Error("Unsupported request."),{status:404});
 }
 if(error){
  const message=error.code==="23505"?(url.pathname==="/api/profiles"?"Name already exists. Choose another.":url.pathname==="/api/friends/request"?"Friend request already exists.":"Database conflict. Please try again."):error.message||"Database request failed";
  throw new Error(message);
 }
 send(response,200,data||{ok:true});
}

async function handleStickers(response,url){
 const apiKey=process.env.KLIPY_API_KEY||"";
 if(!apiKey)throw Object.assign(new Error("KLIPY is not configured."),{status:503});
 const query=clean(url.searchParams.get("q"),80);
 const pos=clean(url.searchParams.get("pos"),300);
 const endpoint=query?"https://api.klipy.com/v2/search":"https://api.klipy.com/v2/featured";
 const params=new URLSearchParams({key:apiKey,searchfilter:"sticker",country:"VN",locale:"vi_VN",contentfilter:"medium",media_filter:"tinywebp_transparent,nanowebp_transparent,webp_transparent,tinygif_transparent,nanogif_transparent,gif_transparent",limit:"50"});
 if(query)params.set("q",query);
 if(pos)params.set("pos",pos);
 const upstream=await fetch(endpoint+"?"+params.toString());
 const result=await upstream.json().catch(()=>({}));
 if(!upstream.ok)throw Object.assign(new Error(result.error||"Sticker search failed."),{status:upstream.status});
 const stickers=(Array.isArray(result.results)?result.results:[]).map(item=>{
  const media=item?.media_formats||item?.media||{};
  for(const key of ["tinywebp_transparent","nanowebp_transparent","webp_transparent","tinygif_transparent","nanogif_transparent","gif_transparent","tinywebp","nanowebp","webp","tinygif","nanogif","gif"]){
   if(media[key]?.url)return media[key].url;
  }
  return "";
 }).filter(Boolean);
 send(response,200,{ok:true,stickers,next:String(result.next||"")});
}

async function handleTroubleshoot(request,response){
 const supportEmail=process.env.SUPPORT_EMAIL||"";
 const apiKey=process.env.MAILTRAP_API_KEY||"";
 const fromEmail=process.env.MAILTRAP_FROM||"";
 const missing=[];
 if(!supportEmail)missing.push("SUPPORT_EMAIL");
 if(!apiKey)missing.push("MAILTRAP_API_KEY");
 if(!fromEmail)missing.push("MAILTRAP_FROM");
 if(missing.length)throw Object.assign(new Error("Missing server configuration: "+missing.join(", ")),{status:500});
 const body=await readBody(request);
 const reason=String(body.reason||"").trim();
 const otherReason=String(body.otherReason||"").trim();
 const details=String(body.details||"").trim();
 if(!reason||!details)throw Object.assign(new Error("Missing required fields."),{status:400});
 if(reason==="Other"&&!otherReason)throw Object.assign(new Error("Missing other reason."),{status:400});
 if(reason.length>200||otherReason.length>1000||details.length>5000)throw Object.assign(new Error("Request is too large."),{status:413});
 const data={reason,otherReason,details,page:String(body.page||"").slice(0,2000),language:String(body.language||"").slice(0,100),createdAt:String(body.createdAt||new Date().toISOString()).slice(0,100)};
 const textBody=["A new SWGC Room Chats troubleshooting request was submitted.","","Reason: "+data.reason,data.otherReason?"Other reason: "+data.otherReason:"","","Details:",data.details,"","Page: "+data.page,"Language: "+data.language,"Created: "+data.createdAt].filter(Boolean).join("\n");
 await sendTransactionalEmail({to:supportEmail,subject:"[SWGC Troubleshoot] "+reason,text:textBody});
 send(response,200,{ok:true});
}

const server=http.createServer(async(request,response)=>{
 setCors(request,response);
 if(request.method==="OPTIONS"){response.writeHead(204);response.end();return;}
 const url=new URL(request.url||"/","http://localhost");
 const method=request.method||"GET";
 try{
  if(method==="GET"&&(url.pathname==="/"||url.pathname==="/health")){
   send(response,200,{ok:true,service:"SWGC API",supabaseConfigured:Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY),cache:{ready:cacheReady,format:"CHC2",types:CHC_CACHE_TYPES,keyConfigured:Boolean(process.env.CHC_CACHE_KEY),error:cacheError||null}});
   return;
  }
  if(method==="POST"&&url.pathname==="/api/auth/owner-login"){
    await handleOwnerLogin(request,response,await readBody(request));
    return;
   }
   if(method==="POST"&&url.pathname==="/api/auth/recover"){
   await handleAccountRecovery(request,response,await readBody(request),"recover");
   return;
  }
  if(method==="POST"&&url.pathname==="/api/auth/recovery-code"){
    await handleAccountRecovery(request,response,await readBody(request),"create");
    return;
   }
   if(method==="GET"&&url.pathname==="/api/auth/recovery-email/status"){
    await handleRecoveryEmailSettings(request,response,{},"status");return;
   }
   if(method==="POST"&&url.pathname==="/api/auth/recovery-email/start"){
    await handleRecoveryEmailSettings(request,response,await readBody(request),"start");return;
   }
   if(method==="POST"&&url.pathname==="/api/auth/recovery-email/verify"){
    await handleRecoveryEmailSettings(request,response,await readBody(request),"verify");return;
   }
   if(method==="POST"&&url.pathname==="/api/auth/recover-email/start"){
    await handleEmailAccountRecovery(request,response,await readBody(request),"start");return;
   }
   if(method==="POST"&&url.pathname==="/api/auth/recover-email/verify"){
    await handleEmailAccountRecovery(request,response,await readBody(request),"verify");return;
   }
   if(method==="POST"&&url.pathname==="/api/auth/delete-account"){
    await handleDeleteAccount(request,response);return;
   }
  if(method==="GET"&&url.pathname==="/api/config"){
   if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY)throw Object.assign(new Error("Supabase is not configured."),{status:503});
   send(response,200,{ok:true,supabaseUrl:SUPABASE_URL,supabasePublishableKey:SUPABASE_PUBLISHABLE_KEY});
   return;
  }
  if(method==="GET"&&url.pathname==="/api/stickers"){await handleStickers(response,url);return;}
  if(url.pathname==="/api/troubleshoot"&&method==="POST"){await handleTroubleshoot(request,response);return;}
  if(url.pathname.startsWith("/api/")){
   if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY)throw Object.assign(new Error("Supabase is not configured."),{status:503});
   const identity=await getIdentity(request);
   const body=["POST","DELETE","PUT"].includes(method)?await readBody(request):{};
   await handleDatabase(response,url,method,body,identity);
   return;
  }
  send(response,404,{ok:false,error:"Not found."});
 }catch(error){
  send(response,Number(error?.status)||400,{ok:false,error:error instanceof Error?error.message:"Server error."});
 }
});

server.listen(PORT,"0.0.0.0",()=>{
 process.stdout.write("SWGC API listening on "+PORT+"\n");
 initializeCache().catch(error=>{
  cacheReady=false;
  process.stderr.write("Cache folder initialization failed: "+error.message+"\n");
 });
});
