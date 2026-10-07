import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {WebSocketServer} from "ws";

const PORT=Number(process.env.PORT||3000);
const DATA_DIR=path.join(process.cwd(),"data");
const DATA_FILE=path.join(DATA_DIR,"chat.json");

fs.mkdirSync(DATA_DIR,{recursive:true});

function loadData(){
 try{
  const data=JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  return {
   profiles:Array.isArray(data.profiles)?data.profiles:[],
   messages:Array.isArray(data.messages)?data.messages:[]
  };
 }catch{
  return {profiles:[],messages:[]};
 }
}

let data=loadData();

function saveData(){
 const temp=DATA_FILE+".tmp";
 fs.writeFileSync(temp,JSON.stringify(data,null,2));
 fs.renameSync(temp,DATA_FILE);
}

function sendJson(response,status,payload){
 response.writeHead(status,{
  "Content-Type":"application/json; charset=utf-8",
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"Content-Type",
  "Cache-Control":"no-store"
 });
 response.end(JSON.stringify(payload));
}

function readBody(request){
 return new Promise((resolve,reject)=>{
  let body="";
  request.on("data",chunk=>{
   body+=chunk;
   if(body.length>200000)request.destroy();
  });
  request.on("end",()=>{
   try{resolve(body?JSON.parse(body):{});}catch{reject(new Error("Invalid JSON"));}
  });
  request.on("error",reject);
 });
}

function clean(value,max){
 return String(value??"").trim().replace(/\s+/g," ").slice(0,max);
}

function usernameKey(value){
 return clean(value,24).toLowerCase();
}

function findProfile(username){
 const key=usernameKey(username);
 return data.profiles.find(item=>item.username_key===key);
}

function broadcast(payload){
 const message=JSON.stringify(payload);
 for(const client of wss.clients){
  if(client.readyState===1)client.send(message);
 }
}

const server=http.createServer(async(request,response)=>{
 const url=new URL(request.url||"/","http://localhost");
 const method=request.method||"GET";

 if(method==="OPTIONS"){
  response.writeHead(204,{
   "Access-Control-Allow-Origin":"*",
   "Access-Control-Allow-Headers":"Content-Type",
   "Access-Control-Allow-Methods":"GET,POST,PUT,OPTIONS"
  });
  response.end();
  return;
 }

 if(method==="GET"&&url.pathname==="/health"){
  sendJson(response,200,{ok:true,service:"SWGC Mini Chat Server"});
  return;
 }

 if(method==="GET"&&url.pathname==="/api/messages"){
  const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||100),1),200);
  sendJson(response,200,{ok:true,messages:data.messages.slice(-limit)});
  return;
 }

 if(method==="GET"&&url.pathname==="/api/username"){
  const username=clean(url.searchParams.get("username"),24);
  sendJson(response,200,{ok:true,taken:Boolean(username&&findProfile(username))});
  return;
 }

 if(method==="GET"&&url.pathname==="/api/profiles"){
  sendJson(response,200,{ok:true,profiles:data.profiles.map(({id,username,display_name,note,avatar_url})=>({id,username,display_name,note,avatar_url}))});
  return;
 }

 if(method==="POST"&&url.pathname==="/api/session"){
  const id=crypto.randomUUID();
  sendJson(response,200,{ok:true,userId:id});
  return;
 }

 if(method==="POST"&&url.pathname==="/api/profiles"){
  try{
   const body=await readBody(request);
   const id=clean(body.id,80);
   const username=clean(body.username,24);
   const displayName=clean(body.display_name,32);
   const note=String(body.note??"").trim().slice(0,1000);
   const avatarUrl=clean(body.avatar_url,2000);
   if(!id||username.length<2){
    sendJson(response,400,{ok:false,error:"Username and display name are required"});
    return;
   }
   if(findProfile(username)){
    sendJson(response,409,{ok:false,error:"Name already exists. Choose another."});
    return;
   }
   const existing=data.profiles.find(item=>item.id===id);
   if(existing){
    existing.username=username;
    existing.username_key=usernameKey(username);
    existing.display_name=displayName;
    existing.note=note;
    existing.avatar_url=avatarUrl;
    existing.updated_at=new Date().toISOString();
    saveData();
    broadcast({type:"profile.updated",profile:existing});
    sendJson(response,200,{ok:true,profile:existing});
    return;
   }
   const profile={
    id,
    username,
    username_key:usernameKey(username),
    display_name:displayName||username,
    note,
    avatar_url:avatarUrl,
    created_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
   };
   data.profiles.push(profile);
   saveData();
   broadcast({type:"profile.created",profile});
   sendJson(response,201,{ok:true,profile});
  }catch(error){
   sendJson(response,400,{ok:false,error:error instanceof Error?error.message:"Invalid request"});
  }
  return;
 }

 if(method==="POST"&&url.pathname==="/api/messages"){
  try{
   const body=await readBody(request);
   const userId=clean(body.user_id,80);
   const text=String(body.text??"").trim().slice(0,500);
   const profile=data.profiles.find(item=>item.id===userId);
   if(!profile){
    sendJson(response,403,{ok:false,error:"Profile not found"});
    return;
   }
   if(!text){
    sendJson(response,400,{ok:false,error:"Message cannot be empty"});
    return;
   }
   const message={
    id:crypto.randomUUID(),
    user_id:profile.id,
    username:profile.username,
    display_name:profile.display_name,
    avatar_url:profile.avatar_url,
    text,
    created_at:new Date().toISOString()
   };
   data.messages.push(message);
   data.messages=data.messages.slice(-1000);
   saveData();
   broadcast({type:"message.created",message});
   sendJson(response,201,{ok:true,message});
  }catch(error){
   sendJson(response,400,{ok:false,error:error instanceof Error?error.message:"Invalid request"});
  }
  return;
 }

 sendJson(response,404,{ok:false,error:"Not found"});
});

const wss=new WebSocketServer({server,path:"/ws"});

wss.on("connection",socket=>{
 socket.send(JSON.stringify({type:"ready"}));
});

server.listen(PORT,()=>console.log("SWGC Mini Chat Server listening on port "+PORT));