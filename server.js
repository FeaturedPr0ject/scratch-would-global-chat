import http from "node:http";
import {createClient} from "@supabase/supabase-js";
import {promises as fs} from "node:fs";
import path from "node:path";
import {writeCHC,readCHC,hasCHC,CHC_CACHE_TYPES} from "./cache/chc.js";

const PORT=Number(process.env.PORT||3000);
const FRONTEND_ORIGINS=(process.env.FRONTEND_ORIGINS||"").split(",").map(value=>value.trim()).filter(Boolean);
const SUPABASE_URL=process.env.SUPABASE_URL||"";
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||"";
const CACHE_ROOT=path.resolve(process.env.CHC_CACHE_DIR||path.join(process.cwd(),"cache"));
let cacheReady=false;

async function initializeCache(){
 for(const type of CHC_CACHE_TYPES)await fs.mkdir(path.join(CACHE_ROOT,type),{recursive:true});
 cacheReady=true;
 if(process.env.CHC_CACHE_KEY){
  try{
   const exists=await hasCHC("configserver","config");
   if(!exists)await writeCHC("configserver","config",{format:"CHC2",version:1,cacheEnabled:true,createdAt:new Date().toISOString()});
   await readCHC("configserver","config");
   process.stdout.write("CHC cache initialized and encrypted.\\n");
  }catch(error){
   cacheReady=false;
   process.stderr.write("CHC cache initialization failed: "+error.message+"\\n");
  }
 }else{
  process.stderr.write("CHC_CACHE_KEY is missing; cache folders created, encrypted cache writes are disabled.\\n");
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

async function getIdentity(request){
 const match=String(request.headers.authorization||"").match(/^Bearer\s+(.+)$/i);
 if(!match)throw Object.assign(new Error("Authentication required."),{status:401});
 const client=createUserClient(match[1]);
 const result=await client.auth.getUser(match[1]);
 if(result.error||!result.data.user)throw Object.assign(new Error("Session expired. Please sign in again."),{status:401});
 return {client,user:result.data.user};
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
  const result=await client.from("profiles").select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").order("created_at",{ascending:true});
  data={ok:true,profiles:result.data||[]};error=result.error;
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
  if((type==="image"||type==="file")&&(attachmentSize<=0||attachmentSize>2097152))throw new Error("Attachment size is invalid");
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
  if((type==="image"||type==="file")&&(attachmentSize<=0||attachmentSize>2097152))throw new Error("Attachment size is invalid");
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
 const apiKey=process.env.RESEND_API_KEY||"";
 const fromEmail=process.env.RESEND_FROM||"";
 const missing=[];
 if(!supportEmail)missing.push("SUPPORT_EMAIL");
 if(!apiKey)missing.push("RESEND_API_KEY");
 if(!fromEmail)missing.push("RESEND_FROM");
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
 const upstream=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from:fromEmail,to:[supportEmail],subject:"[SWGC Troubleshoot] "+reason,text:textBody})});
 const result=await upstream.json().catch(()=>({}));
 if(!upstream.ok)throw Object.assign(new Error(typeof result.message==="string"?result.message:"Email provider rejected the request."),{status:502});
 send(response,200,{ok:true});
}

const server=http.createServer(async(request,response)=>{
 setCors(request,response);
 if(request.method==="OPTIONS"){response.writeHead(204);response.end();return;}
 const url=new URL(request.url||"/","http://localhost");
 const method=request.method||"GET";
 try{
  if(method==="GET"&&(url.pathname==="/"||url.pathname==="/health")){
   send(response,200,{ok:true,service:"SWGC API",supabaseConfigured:Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY),cache:{ready:cacheReady,format:"CHC2",types:CHC_CACHE_TYPES}});
   return;
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

server.listen(PORT,"0.0.0.0",()=>process.stdout.write("SWGC API listening on "+PORT+"\n"));
