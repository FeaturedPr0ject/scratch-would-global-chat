import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const CONFIG_ENDPOINT="/api/config";
const STORAGE_NAME="swgc-room-chats-name";
const STORAGE_PROFILE="swgc-room-chats-profile";
const THEME_STORAGE="swgc-room-chats-theme";
const THEME_PRESETS={orange:["#ffad00","#ffbf2f","255,173,0"],blue:["#4f8cff","#74a6ff","79,140,255"],purple:["#a970ff","#c293ff","169,112,255"],green:["#38d39f","#63e6b8","56,211,159"],red:["#ff5f6d","#ff7b86","255,95,109"]};
const messagesEl=document.querySelector("#messages");
const input=document.querySelector("#messageInput");
const sendButton=document.querySelector("#sendButton");
const stickerButton=document.querySelector("#stickerButton");
const stickerPicker=document.querySelector("#stickerPicker");
const charCount=document.querySelector("#charCount");
const nameModal=document.querySelector("#nameModal");
const firstUsernameInput=document.querySelector("#firstUsernameInput");
const firstDisplayNameInput=document.querySelector("#firstDisplayNameInput");
const firstUsernameCheck=document.querySelector("#firstUsernameCheck");
const joinRoomButton=document.querySelector("#joinRoomButton");
const openProfileButton=document.querySelector("#openProfile");
const profileModal=document.querySelector("#profileModal");
const closeProfileButton=document.querySelector("#closeProfile");
const avatarPreview=document.querySelector("#avatarPreview");
const avatarInput=document.querySelector("#avatarInput");
const avatarCropModal=document.querySelector("#avatarCropModal");
const avatarCropCanvas=document.querySelector("#avatarCropCanvas");
const avatarCropZoom=document.querySelector("#avatarCropZoom");
const avatarCropCancel=document.querySelector("#avatarCropCancel");
const avatarCropSave=document.querySelector("#avatarCropSave");
const usernameInput=document.querySelector("#usernameInput");
const displayNameInput=document.querySelector("#displayNameInput");
const profileNoteInput=document.querySelector("#profileNoteInput");
const usernameCheck=document.querySelector("#usernameCheck");
const profileMessage=document.querySelector("#profileMessage");
const savedStickerTab=document.querySelector("#savedStickerTab");
const searchStickerTab=document.querySelector("#searchStickerTab");
const savedStickerPanel=document.querySelector("#savedStickerPanel");
const searchStickerPanel=document.querySelector("#searchStickerPanel");
const savedStickerGrid=document.querySelector("#savedStickerGrid");
const savedStickerEmpty=document.querySelector("#savedStickerEmpty");
const stickerSearchInput=document.querySelector("#stickerSearchInput");
const stickerSearchButton=document.querySelector("#stickerSearchButton");
const stickerSearchStatus=document.querySelector("#stickerSearchStatus");
const stickerSearchGrid=document.querySelector("#stickerSearchGrid");
const stickerPickerClose=document.querySelector("#stickerPickerClose");
const saveProfileButton=document.querySelector("#saveProfile");
const userProfileModal=document.querySelector("#userProfileModal");
const closeUserProfileButton=document.querySelector("#closeUserProfile");
const publicProfileAvatar=document.querySelector("#publicProfileAvatar");
const publicProfileDisplayName=document.querySelector("#publicProfileDisplayName");
const publicProfileUsername=document.querySelector("#publicProfileUsername");
const publicProfileNote=document.querySelector("#publicProfileNote");
const profileAvatar=document.querySelector("#profileAvatar");
const profileDisplayName=document.querySelector("#profileDisplayName");
const profileUsername=document.querySelector("#profileUsername");
const friendSearchInput=document.querySelector("#friendSearchInput");
const friendSearchButton=document.querySelector("#friendSearchButton");
const friendSearchStatus=document.querySelector("#friendSearchStatus");
const friendSearchResult=document.querySelector("#friendSearchResult");
const friendList=document.querySelector("#friendList");
const friendRefreshButton=document.querySelector("#friendRefreshButton");
const addFriendButton=document.querySelector("#addFriendButton");
const friendActionMessage=document.querySelector("#friendActionMessage");
const mobileMenuButton=document.querySelector("#mobileMenuButton");
const mobileMenuBackdrop=document.querySelector("#mobileMenuBackdrop");
const mobileSidebar=document.querySelector(".sidebar");
const chatLayout=document.querySelector(".chat-layout");
const scrollToBottomButton=document.querySelector("#scrollToBottom");
const profileSectionButtons=document.querySelectorAll("[data-profile-section]");
const profileSectionProfile=document.querySelector("#profileSectionProfile");
const profileSectionSettings=document.querySelector("#profileSectionSettings");
const themeOptions=document.querySelectorAll("[data-theme]");
let friends=[];
let selectedProfileId="";
const onlineUsers=new Set();
let presenceChannel=null;
const connectionDot=document.querySelector("#connectionDot");
const connectionText=document.querySelector("#connectionText");
let supabaseClient=null;
let userId="";
let profile=null;
const profileDirectory=new Map();
let messages=[];
let socket=null;
const SAVED_STICKERS_STORAGE="swgc-room-chats-saved-stickers";
let savedStickers=[];
let avatarFile=null;
let avatarCropImage=null;
let avatarCropObjectUrl="";
let avatarCropScale=1;
let avatarCropOffsetX=0;
let avatarCropOffsetY=0;
let avatarCropDragging=false;
let avatarCropStartX=0;
let avatarCropStartY=0;
let avatarCropStartOffsetX=0;
let avatarCropStartOffsetY=0;
let usernameTimer=null;
let savingProfile=false;
function applyTheme(themeName,save=true){
 const preset=THEME_PRESETS[themeName]||THEME_PRESETS.orange;
 document.documentElement.style.setProperty("--orange",preset[0]);
 document.documentElement.style.setProperty("--orange2",preset[1]);
 document.documentElement.style.setProperty("--accent-rgb",preset[2]);
 document.querySelector('meta[name="theme-color"]')?.setAttribute("content",preset[0]);
 themeOptions.forEach(button=>button.classList.toggle("active",button.dataset.theme===themeName));
 if(save)localStorage.setItem(THEME_STORAGE,themeName);
}

function loadTheme(){
 applyTheme(localStorage.getItem(THEME_STORAGE)||"orange",false);
}

function setProfileSection(section){
 const settings=section==="settings";
 profileSectionProfile?.classList.toggle("hidden",settings);
 profileSectionSettings?.classList.toggle("hidden",!settings);
 profileSectionButtons.forEach(button=>button.classList.toggle("active",button.dataset.profileSection===section));
}

function setMobileMenu(open){
 const mobile=window.innerWidth<=760;
 if(mobile){
  mobileSidebar?.classList.toggle("mobile-open",open);
  mobileMenuBackdrop?.classList.toggle("mobile-open",open);
 }else{
  chatLayout?.classList.toggle("sidebar-collapsed",!open);
  mobileMenuBackdrop?.classList.remove("mobile-open");
 }
 mobileMenuButton?.setAttribute("aria-expanded",open?"true":"false");
 mobileMenuButton?.classList.toggle("active",open);
}

function isNearBottom(){
 return messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<120;
}

function updateScrollButton(){
 scrollToBottomButton?.classList.toggle("hidden",isNearBottom());
}

function scrollToBottom(smooth=false){
 messagesEl.scrollTo({top:messagesEl.scrollHeight,behavior:smooth?"smooth":"auto"});
 setTimeout(updateScrollButton,180);
}


function escapeText(value){
 return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function safeUrl(value){
 try{
  const url=new URL(value);
  return url.protocol==="http:"||url.protocol==="https:"||url.protocol==="data:"?url.href:"";
 }catch{return "";}
}

function initials(name){
 const parts=String(name||"Guest").trim().split(/\s+/).filter(Boolean);
 return (parts.length>1?parts[0][0]+parts[1][0]:String(name||"?").slice(0,2)).toUpperCase();
}

function ownerBadgeMarkup(id,userNumber){
 return Number(userNumber)===1?'<span class="owner-badge" title="Owner">OWNER</span>':"";
}

function avatarMarkup(item,className="message-avatar"){
 const url=safeUrl(item?.avatar_url);
 if(url)return '<span class="'+className+'"><img src="'+escapeText(url)+'" alt=""></span>';
 return '<span class="'+className+'">'+escapeText(initials(item?.display_name||item?.username))+'</span>';
}

function setConnection(state){
 const online=state==="Connected";
 connectionDot.classList.toggle("online",online);
 connectionDot.classList.toggle("offline",!online);
 connectionText.textContent=state;
}

function setProfileAvatar(element,data,sizeClass=""){
 const url=safeUrl(data?.avatar_url);
 element.className="avatar "+sizeClass;
 if(url)element.innerHTML='<img src="'+escapeText(url)+'" alt="">';
 else element.textContent=initials(data?.display_name||data?.username);
}

function drawAvatarCrop(){
 if(!avatarCropCanvas||!avatarCropImage)return;
 const ctx=avatarCropCanvas.getContext("2d");
 const size=avatarCropCanvas.width;
 ctx.clearRect(0,0,size,size);
 ctx.fillStyle="#111116";
 ctx.fillRect(0,0,size,size);
 const image=avatarCropImage;
 const baseScale=Math.max(size/image.width,size/image.height);
 const scale=baseScale*avatarCropScale;
 const width=image.width*scale;
 const height=image.height*scale;
 const maxOffsetX=Math.max(0,(width-size)/2);
 const maxOffsetY=Math.max(0,(height-size)/2);
 avatarCropOffsetX=Math.max(-maxOffsetX,Math.min(maxOffsetX,avatarCropOffsetX));
 avatarCropOffsetY=Math.max(-maxOffsetY,Math.min(maxOffsetY,avatarCropOffsetY));
 const x=(size-width)/2+avatarCropOffsetX;
 const y=(size-height)/2+avatarCropOffsetY;
 ctx.drawImage(image,x,y,width,height);
}

function closeAvatarCrop(){
 avatarCropModal?.classList.add("hidden");
 avatarCropDragging=false;
 if(avatarCropObjectUrl){URL.revokeObjectURL(avatarCropObjectUrl);avatarCropObjectUrl="";}
 avatarCropImage=null;
 avatarInput.value="";
}

function openAvatarCrop(file){
 if(!file||!avatarCropCanvas)return;
 avatarCropObjectUrl=URL.createObjectURL(file);
 const image=new Image();
 image.onload=()=>{
  avatarCropImage=image;
  avatarCropScale=1;
  avatarCropOffsetX=0;
  avatarCropOffsetY=0;
  avatarCropZoom.value="1";
  avatarCropModal.classList.remove("hidden");
  drawAvatarCrop();
 };
 image.src=avatarCropObjectUrl;
}

function saveAvatarCrop(){
 if(!avatarCropCanvas||!avatarCropImage)return;
 const output=document.createElement("canvas");
 output.width=512;
 output.height=512;
 const ctx=output.getContext("2d");
 ctx.drawImage(avatarCropCanvas,0,0,512,512);
 output.toBlob(blob=>{
  if(!blob)return;
  avatarFile=new File([blob],"avatar.jpg",{type:"image/jpeg"});
  const reader=new FileReader();
  reader.onload=()=>{
   avatarPreview.innerHTML='<img src="'+escapeText(String(reader.result))+'" alt="">';
   closeAvatarCrop();
  };
  reader.readAsDataURL(blob);
 },"image/jpeg",.88);
}

function renderProfile(){
 const current=profile||{};
 profileDisplayName.innerHTML=escapeText(current.display_name||"Guest")+ownerBadgeMarkup(current.id,current.user_number);
 profileUsername.textContent=current.username?"@"+current.username+(current.user_number?" · ID #"+current.user_number:""):"@guest";
 setProfileAvatar(profileAvatar,current,"avatar-large");
 setProfileAvatar(avatarPreview,current,"avatar-preview");
}

function renderMessages(forceScroll=false){
 if(!messages.length){
  updateScrollButton();
  messagesEl.innerHTML='<div class="empty"><div class="empty-inner"><div class="empty-logo"><img class="logo-image" src="./assests/logo.png" alt="SWG"></div><h2>Welcome to SWGC Room Chats</h2><p>Start the conversation. New messages appear here in real time.</p></div></div>';
  return;
 }
 const wasNearBottom=isNearBottom();
 const shouldStickToBottom=forceScroll||wasNearBottom;
 messagesEl.innerHTML=messages.map(item=>{
  const liveProfile=profileDirectory.get(item.user_id)||{};
  const displayName=liveProfile.display_name||item.display_name||liveProfile.username||item.username||"Guest";
  const username=liveProfile.username||item.username||"";
  const userNumber=liveProfile.user_number||item.user_number;
  const avatarItem={...item,...liveProfile};
  const stickerUrl=item.type==="sticker"?safeUrl(item.text):"";
  const content=item.type==="sticker"&&stickerUrl?'<span class="message-sticker"><img src="'+escapeText(stickerUrl)+'" alt="Sticker" loading="lazy"></span>':item.type==="sticker"?'<span class="message-sticker">'+escapeText(item.text)+'</span>':'<span class="message-text">'+escapeText(item.text)+'</span>';
  return '<button class="message-profile-button" type="button" data-user-id="'+escapeText(item.user_id)+'">'+
   avatarMarkup(avatarItem)+
   '<span class="message-body"><span class="message-meta"><span class="message-name-wrap"><span class="message-display-name">'+escapeText(displayName)+'</span>'+ownerBadgeMarkup(item.user_id,userNumber)+'<span class="message-username">'+escapeText(username?"@"+username:"")+'</span></span><time class="message-time">'+escapeText(new Date(item.created_at||Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</time></span>'+content+'</span></button>';
 }).join("");
 if(shouldStickToBottom){
  scrollToBottom(false);
  messagesEl.querySelectorAll(".message-sticker img").forEach(image=>{
   if(!image.complete)image.addEventListener("load",()=>{if(isNearBottom())scrollToBottom(false)},{once:true});
  });
 }
 updateScrollButton();
}

async function request(path,options={}){
 const method=options.method||"GET";
 const url=new URL(path,"https://swgc.local");
 const body=options.body?JSON.parse(options.body):{};
 let data=null;
 let error=null;

 if(url.pathname==="/api/profiles"&&method==="GET"){
  const result=await supabaseClient.from("profiles").select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").order("created_at",{ascending:true});
  data={ok:true,profiles:result.data||[]};
  error=result.error;
 }else if(url.pathname==="/api/username"&&method==="GET"){
  const username=new URLSearchParams(url.search).get("username")?.trim()||"";
  const result=await supabaseClient.from("profiles").select("id,user_number").eq("username_key",username.toLowerCase()).maybeSingle();
  data={ok:true,taken:Boolean(result.data)};
  error=result.error;
 }else if(url.pathname==="/api/users/search"&&method==="GET"){
  const query=new URLSearchParams(url.search).get("q")?.trim()||"";
  const result=/^\d+$/.test(query)
   ? await supabaseClient.from("profiles").select("id,user_number,username,display_name,note,avatar_url,last_seen").eq("user_number",Number(query)).maybeSingle()
   : await supabaseClient.from("profiles").select("id,user_number,username,display_name,note,avatar_url,last_seen").eq("username_key",query.toLowerCase()).maybeSingle();
  data={ok:true,profile:result.data||null};
  error=result.error;
 }else if(url.pathname==="/api/messages"&&method==="GET"){
  const result=await supabaseClient.from("messages").select("id,user_id,user_number,username,display_name,avatar_url,text,type,created_at").order("created_at",{ascending:false}).limit(100);
  data={ok:true,messages:(result.data||[]).reverse()};
  error=result.error;
 }else if(url.pathname==="/api/friends"&&method==="GET"){
  const result=await supabaseClient.from("friend_requests").select("id,requester_id,recipient_id,status,created_at,updated_at").or("requester_id.eq."+userId+",recipient_id.eq."+userId).in("status",["pending","accepted"]).order("updated_at",{ascending:false});
  if(!result.error){
   const ids=[...new Set((result.data||[]).map(item=>item.requester_id===userId?item.recipient_id:item.requester_id))];
   const profilesResult=ids.length?await supabaseClient.from("profiles").select("id,user_number,username,display_name,avatar_url").in("id",ids):{data:[],error:null};
   const profilesMap=new Map((profilesResult.data||[]).map(item=>[item.id,item]));
   data={ok:true,friends:(result.data||[]).map(item=>{
    const otherId=item.requester_id===userId?item.recipient_id:item.requester_id;
    const other=profilesMap.get(otherId);
    return {id:item.id,user_id:otherId,user_number:other?.user_number||null,status:item.status,username:other?.username||"",display_name:other?.display_name||"",avatar_url:other?.avatar_url||"",incoming:item.recipient_id===userId};
   })};
   error=profilesResult.error;
  }else{
   error=result.error;
  }
 }else if(url.pathname==="/api/friends/request"&&method==="POST"){
  const requesterId=String(body.user_id||"");
  const targetId=String(body.target_user_id||"");
  if(!requesterId||!targetId||requesterId===targetId)throw new Error("Invalid friend request");
  const existing=await supabaseClient.from("friend_requests").select("id,status,requester_id,recipient_id").or("and(requester_id.eq."+requesterId+",recipient_id.eq."+targetId+"),and(requester_id.eq."+targetId+",recipient_id.eq."+requesterId+")").in("status",["pending","accepted"]).limit(1).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data?.status==="accepted")throw new Error("You are already friends.");
  if(existing.data?.status==="pending")throw new Error("Friend request already exists.");
  const result=await supabaseClient.from("friend_requests").insert({requester_id:requesterId,recipient_id:targetId,status:"pending"}).select("id,requester_id,recipient_id,status,created_at,updated_at").single();
  data={ok:true,message:"Friend request sent.",friend:result.data};
  error=result.error;
 }else if(url.pathname==="/api/friends/unfriend"&&method==="POST"){
  const targetId=String(body.target_user_id||"");
  if(!targetId||targetId===userId)throw new Error("Invalid friend");
  const friendship=await supabaseClient.from("friendships").delete().or("and(user_a.eq."+userId+",user_b.eq."+targetId+"),and(user_a.eq."+targetId+",user_b.eq."+userId+")");
  if(friendship.error)throw friendship.error;
  const requests=await supabaseClient.from("friend_requests").delete().or("and(requester_id.eq."+userId+",recipient_id.eq."+targetId+"),and(requester_id.eq."+targetId+",recipient_id.eq."+userId+")");
  if(requests.error)throw requests.error;
  data={ok:true,message:"Friend removed."};
  error=null;
 }else if(url.pathname==="/api/friends/respond"&&method==="POST"){
  const action=body.action==="accept"?"accepted":body.action==="decline"?"declined":"";
  if(!action)throw new Error("Invalid friend response");
  const result=await supabaseClient.from("friend_requests").update({status:action}).eq("id",body.request_id).eq("recipient_id",body.user_id).select("id,requester_id,recipient_id,status,created_at,updated_at").single();
  data={ok:true,friend:result.data};
  error=result.error;
 }else if(url.pathname==="/api/profiles"&&method==="POST"){
  const id=String(body.id||"");
  const username=String(body.username||"").trim().replace(/\s+/g," ");
  const displayName=String(body.display_name||"").trim().replace(/\s+/g," ");
  const note=String(body.note||"").trim().slice(0,1000);
  const avatarUrl=String(body.avatar_url||"").trim().slice(0,6000000);
  if(!id||username.length<2)throw new Error("Username is required");
  const existing=await supabaseClient.from("profiles").select("id").eq("id",id).maybeSingle();
  if(existing.error)throw existing.error;
  const payload={id,username,display_name:displayName||username,note,avatar_url:avatarUrl};
  const result=existing.data
   ? await supabaseClient.from("profiles").update({username,display_name:payload.display_name,note,avatar_url:avatarUrl}).eq("id",id).select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").single()
   : await supabaseClient.from("profiles").insert(payload).select("id,user_number,username,display_name,note,avatar_url,created_at,updated_at").single();
  data={ok:true,profile:result.data};
  error=result.error;
 }else if(url.pathname==="/api/messages"&&method==="POST"){
  const messageText=String(body.text||"").trim().slice(0,500);
  const type=body.type==="sticker"?"sticker":"text";
  if(!messageText)throw new Error("Message cannot be empty");
  if(!profile)throw new Error("Profile not found");
  const result=await supabaseClient.from("messages").insert({
   user_id:profile.id,
   user_number:profile.user_number,
   username:profile.username,
   display_name:profile.display_name,
   avatar_url:profile.avatar_url,
   text:messageText,
   type
  }).select("id,user_id,user_number,username,display_name,avatar_url,text,type,created_at").single();
  data={ok:true,message:result.data};
  error=result.error;
 }else{
  throw new Error("Unsupported request");
 }

 if(error){
  const message=error.code==="23505"?(url.pathname==="/api/profiles"?"Name already exists. Choose another.":url.pathname==="/api/friends/request"?"Friend request already exists.":"Database conflict. Please try again."):error.message||"Database request failed";
  throw new Error(message);
 }
 return data;
}

async function initializeSupabase(){
 const configResponse=await fetch(CONFIG_ENDPOINT,{cache:"no-store"});
 if(!configResponse.ok)throw new Error("Supabase is not configured");
 const config=await configResponse.json();
 const supabaseUrl=String(config.supabaseUrl||"").trim();
 const publishableKey=String(config.supabasePublishableKey||"").trim();
 if(!supabaseUrl||!publishableKey)throw new Error("Supabase is not configured");
 supabaseClient=createClient(supabaseUrl,publishableKey);
 let sessionResult=await supabaseClient.auth.getSession();
 if(!sessionResult.data.session){
  const signInResult=await supabaseClient.auth.signInAnonymously();
  if(signInResult.error)throw signInResult.error;
  sessionResult={data:{session:signInResult.data.session}};
 }
 userId=sessionResult.data.session.user.id;
 localStorage.setItem("swgc-room-chats-user-id",userId);
 const profiles=await request("/api/profiles");
 profileDirectory.clear();
 (profiles.profiles||[]).forEach(item=>profileDirectory.set(item.id,item));
 profile=profiles.profiles.find(item=>item.id===userId)||null;
 if(profile)localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
 renderProfile();
 if(!profile)openFirstProfile();
 const history=await request("/api/messages?limit=100");
 messages=history.messages||[];
 renderMessages();
 connectRealtime();
 await loadFriends();
 setConnection("Connected");
}

function connectRealtime(){
 if(!supabaseClient)return;
 const channel=supabaseClient.channel("swgc-room");
 channel
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
   const message=payload.new;
   if(message&&!messages.some(item=>item.id===message.id)){
    messages.push(message);
    messages=messages.slice(-100);
    renderMessages();
   }
  })
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"friend_requests"},()=>loadFriends())
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"friend_requests"},()=>loadFriends())
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"profiles"},payload=>{
   if(payload.new?.id===userId){
    profile=payload.new;
    localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
    localStorage.setItem(STORAGE_NAME,profile.username);
    renderProfile();
   }
   if(payload.new){
    profileDirectory.set(payload.new.id,payload.new);
    friends=friends.map(item=>item.user_id===payload.new.id?{...item,user_number:payload.new.user_number,username:payload.new.username,display_name:payload.new.display_name,avatar_url:payload.new.avatar_url}:item);
    renderFriendList();
    renderMessages();
   }
  })
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"},payload=>{
   if(payload.new?.id===userId){
    profile=payload.new;
    localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
    localStorage.setItem(STORAGE_NAME,profile.username);
    renderProfile();
   }
   if(payload.new){
    profileDirectory.set(payload.new.id,payload.new);
    friends=friends.map(item=>item.user_id===payload.new.id?{...item,user_number:payload.new.user_number,username:payload.new.username,display_name:payload.new.display_name,avatar_url:payload.new.avatar_url}:item);
    renderFriendList();
    renderMessages();
   }
  })
  .subscribe(state=>{
   if(state==="SUBSCRIBED")setConnection("Connected");
  });
 presenceChannel=supabaseClient.channel("swgc-presence",{config:{presence:{key:userId}}});
 const refreshPresence=()=>{
  onlineUsers.clear();
  const state=presenceChannel.presenceState();
  Object.keys(state||{}).forEach(key=>onlineUsers.add(key));
  renderFriendList();
 };
 presenceChannel
  .on("presence",{event:"sync"},refreshPresence)
  .on("presence",{event:"join"},refreshPresence)
  .on("presence",{event:"leave"},refreshPresence)
  .subscribe(async state=>{
   if(state==="SUBSCRIBED"){
    await presenceChannel.track({user_id:userId,online_at:new Date().toISOString()});
   }
  });
}

async function checkUsername(value,first=false){
 const clean=value.trim().replace(/\s+/g," ");
 const output=first?firstUsernameCheck:usernameCheck;
 if(clean.length<2||clean.length>24){
  output.textContent=clean?"Use 2-24 characters":"";
  output.className="field-status";
  return false;
 }
 output.textContent="Checking...";
 output.className="field-status checking";
 try{
  const result=await request("/api/username?username="+encodeURIComponent(clean));
  const taken=result.taken&&clean.toLowerCase()!==(profile?.username||"").toLowerCase();
  output.textContent=taken?"Name already exists. Choose another.":"Username available";
  output.className="field-status "+(taken?"taken":"available");
  return !taken;
 }catch{
  output.textContent="Server unavailable";
  output.className="field-status taken";
  return false;
 }
}

function scheduleUsernameCheck(first=false){
 clearTimeout(usernameTimer);
 usernameTimer=setTimeout(()=>checkUsername((first?firstUsernameInput:usernameInput).value,first),250);
}

function openFirstProfile(){
 nameModal.classList.remove("hidden");
 firstUsernameInput.value=localStorage.getItem(STORAGE_NAME)||"";
 firstDisplayNameInput.value="";
 setTimeout(()=>firstUsernameInput.focus(),30);
 scheduleUsernameCheck(true);
}

function closeProfileModal(){
 profileModal.classList.add("hidden");
 avatarFile=null;
 profileMessage.textContent="";
}

function openMyProfile(){
 if(!profile){openFirstProfile();return;}
 setProfileSection("profile");
 usernameInput.value=profile.username;
 displayNameInput.value=profile.display_name;
 profileNoteInput.value=profile.note||"";
 avatarFile=null;
 usernameCheck.textContent="";
 usernameCheck.className="field-status";
 profileMessage.textContent="";
 renderProfile();
 profileModal.classList.remove("hidden");
}

function showProfileMessage(message){profileMessage.textContent=message;}

async function avatarDataUrl(){
 if(!avatarFile)return profile?.avatar_url||"";
 if(avatarFile.size>4*1024*1024)throw new Error("Avatar must be smaller than 4 MB");
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(new Error("Could not read avatar"));
  reader.readAsDataURL(avatarFile);
 });
}

async function saveProfile(){
 if(savingProfile)return;
 const username=usernameInput.value.trim().replace(/\s+/g," ");
 const displayName=displayNameInput.value.trim().replace(/\s+/g," ");
 const note=profileNoteInput.value.trim();
 if(username.length<2||username.length>24){showProfileMessage("Username must be 2-24 characters.");return;}
 if(displayName.length>32){showProfileMessage("Display name must be 32 characters or less.");return;}
 if(note.length>1000){showProfileMessage("Profile note is too long.");return;}
 savingProfile=true;
 saveProfileButton.disabled=true;
 showProfileMessage("Saving...");
 try{
  if(!await checkUsername(username))throw new Error("Name already exists. Choose another.");
  const avatarUrl=await avatarDataUrl();
  const result=await request("/api/profiles",{method:"POST",body:JSON.stringify({id:userId,username,display_name:displayName,note,avatar_url:avatarUrl})});
  profile=result.profile;
  localStorage.setItem(STORAGE_NAME,profile.username);
  localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
  renderProfile();
  closeProfileModal();
  nameModal.classList.add("hidden");
 }catch(error){showProfileMessage(error instanceof Error?error.message:"Could not save profile.");}
 finally{savingProfile=false;saveProfileButton.disabled=false;}
}

async function joinRoom(){
 const username=firstUsernameInput.value.trim().replace(/\s+/g," ");
 const displayName=firstDisplayNameInput.value.trim().replace(/\s+/g," ");
 if(username.length<2||username.length>24){firstUsernameCheck.textContent="Use 2-24 characters";firstUsernameCheck.className="field-status taken first-check";return;}
 if(displayName.length>32){firstUsernameCheck.textContent="Display name is too long.";firstUsernameCheck.className="field-status taken first-check";return;}
 joinRoomButton.disabled=true;
 try{
  if(!await checkUsername(username,true))return;
  const result=await request("/api/profiles",{method:"POST",body:JSON.stringify({id:userId,username,display_name:displayName,note:"",avatar_url:""})});
  profile=result.profile;
  localStorage.setItem(STORAGE_NAME,profile.username);
  localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
  renderProfile();
  nameModal.classList.add("hidden");
  input.focus();
 }catch(error){
  firstUsernameCheck.textContent=error instanceof Error?error.message:"Could not create profile.";
  firstUsernameCheck.className="field-status taken first-check";
 }finally{joinRoomButton.disabled=false;}
}

function loadSavedStickers(){
 try{
  const data=JSON.parse(localStorage.getItem(SAVED_STICKERS_STORAGE)||"[]");
  savedStickers=Array.isArray(data)?data.filter(item=>typeof item==="string"&&safeUrl(item)):[]; 
 }catch{savedStickers=[];}
 renderSavedStickers();
}

function saveSticker(url){
 const safe=safeUrl(url);
 if(!safe)return;
 savedStickers=[safe,...savedStickers.filter(item=>item!==safe)].slice(0,60);
 localStorage.setItem(SAVED_STICKERS_STORAGE,JSON.stringify(savedStickers));
 renderSavedStickers();
}

function renderSavedStickers(){
 if(!savedStickerGrid||!savedStickerEmpty)return;
 savedStickerGrid.innerHTML=savedStickers.map(url=>'<button class="sticker-tile" type="button" data-sticker-url="'+escapeText(url)+'"><img src="'+escapeText(url)+'" alt="Saved sticker" loading="lazy"></button>').join("");
 savedStickerEmpty.classList.toggle("hidden",savedStickers.length>0);
}

function setStickerTab(tab){
 const search=tab==="search";
 savedStickerTab?.classList.toggle("active",!search);
 searchStickerTab?.classList.toggle("active",search);
 savedStickerPanel?.classList.toggle("hidden",search);
 searchStickerPanel?.classList.toggle("hidden",!search);
 if(search){
  stickerSearchInput?.focus();
  if(stickerSearchGrid&&!stickerSearchGrid.children.length)searchStickers("");
 }
}

async function searchStickers(){
 const query=stickerSearchInput?.value.trim()||"";
 if(!stickerSearchStatus||!stickerSearchGrid)return;
 if(query.length<2){
  stickerSearchStatus.textContent="Enter at least 2 characters.";
  stickerSearchGrid.innerHTML="";
  return;
 }
 stickerSearchStatus.textContent="Searching...";
 stickerSearchGrid.innerHTML="";
 try{
  const endpoint="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=24&gsrsearch="+encodeURIComponent(query+" sticker")+"&prop=imageinfo&iiprop=url|mime&iiurlwidth=240&format=json&origin=*";
  const response=await fetch(endpoint);
  if(!response.ok)throw new Error("Search failed");
  const data=await response.json();
  const pages=Object.values(data.query?.pages||{}).filter(item=>item.imageinfo?.[0]?.thumburl||item.imageinfo?.[0]?.url);
  if(!pages.length){
   stickerSearchStatus.textContent="No stickers found.";
   return;
  }
  stickerSearchStatus.textContent=pages.length+" results";
  stickerSearchGrid.innerHTML=pages.map(item=>{
   const info=item.imageinfo?.[0]||{};
   const url=info.thumburl||info.url;
   return '<div class="sticker-result"><button class="sticker-tile" type="button" data-sticker-url="'+escapeText(url)+'"><img src="'+escapeText(url)+'" alt="Sticker" loading="lazy"></button><button class="sticker-save" type="button" data-save-sticker="'+escapeText(url)+'" aria-label="Save sticker" title="Save sticker"></button></div>';
  }).join("");
 }catch{
  stickerSearchStatus.textContent="Could not search stickers.";
 }
}

function openStickerPicker(){
 stickerPicker?.classList.remove("hidden");
 loadSavedStickers();
 setStickerTab("saved");
}

async function sendSticker(url){
 const safe=safeUrl(url);
 if(!safe||!profile||!userId)return;
 saveSticker(safe);
 await sendMessage("sticker",safe);
}

async function sendMessage(type="text",sticker=""){
 const text=type==="sticker"?sticker:input.value.trim();
 if(!text||!profile||!userId)return;
 sendButton.disabled=true;
 try{
  const result=await request("/api/messages",{method:"POST",body:JSON.stringify({user_id:userId,text,type})});
  if(result.message&&!messages.some(item=>item.id===result.message.id)){
   messages.push(result.message);
   messages=messages.slice(-100);
   renderMessages(true);
  }
  input.value="";
  input.style.height="auto";
  charCount.textContent="0 / 500";
  stickerPicker?.classList.add("hidden");
 }catch(error){
  setConnection(error instanceof Error?error.message:"Message failed");
  setTimeout(()=>setConnection("Connected"),1800);
 }finally{sendButton.disabled=false;}
}

async function openPublicProfile(userIdValue){
 if(!userIdValue)return;
 try{
  const result=await request("/api/profiles");
  const data=result.profiles.find(item=>item.id===userIdValue);
  if(!data)return;
  selectedProfileId=data.id;
  setProfileAvatar(publicProfileAvatar,data,"public-avatar");
  publicProfileDisplayName.innerHTML=escapeText(data.display_name||data.username)+ownerBadgeMarkup(data.id,data.user_number);
  publicProfileUsername.textContent=data.username?"@"+data.username+(data.user_number?" · ID #"+data.user_number:""):"";
  publicProfileNote.textContent=data.note||"No profile note.";
  friendActionMessage.textContent="";
  const relation=friends.find(item=>item.user_id===data.id);
  addFriendButton.textContent=data.id===userId?"This is you":relation?.status==="accepted"?"Unfriend":relation?.status==="pending"?"Request pending":"Add Friend";
  addFriendButton.disabled=data.id===userId||relation?.status==="pending";
  userProfileModal.classList.remove("hidden");
 }catch{}
}


avatarPreview.addEventListener("click",()=>avatarInput.click());
avatarInput.addEventListener("change",()=>{
 const file=avatarInput.files?.[0]||null;
 if(!file)return;
 if(file.size>8*1024*1024){showProfileMessage("Avatar must be smaller than 8 MB.");avatarInput.value="";return;}
 openAvatarCrop(file);
});
avatarCropZoom?.addEventListener("input",()=>{avatarCropScale=Number(avatarCropZoom.value)||1;drawAvatarCrop()});
avatarCropCanvas?.addEventListener("pointerdown",event=>{
 avatarCropDragging=true;
 avatarCropCanvas.setPointerCapture(event.pointerId);
 avatarCropStartX=event.clientX;
 avatarCropStartY=event.clientY;
 avatarCropStartOffsetX=avatarCropOffsetX;
 avatarCropStartOffsetY=avatarCropOffsetY;
});
avatarCropCanvas?.addEventListener("pointermove",event=>{
 if(!avatarCropDragging)return;
 avatarCropOffsetX=avatarCropStartOffsetX+event.clientX-avatarCropStartX;
 avatarCropOffsetY=avatarCropStartOffsetY+event.clientY-avatarCropStartY;
 drawAvatarCrop();
});
avatarCropCanvas?.addEventListener("pointerup",()=>{avatarCropDragging=false});
avatarCropCanvas?.addEventListener("pointercancel",()=>{avatarCropDragging=false});
avatarCropCancel?.addEventListener("click",closeAvatarCrop);
avatarCropSave?.addEventListener("click",saveAvatarCrop);

mobileMenuButton?.addEventListener("click",()=>{
 const mobile=window.innerWidth<=760;
 const open=mobile?mobileSidebar?.classList.contains("mobile-open"):!chatLayout?.classList.contains("sidebar-collapsed");
 setMobileMenu(!open);
});
mobileMenuBackdrop?.addEventListener("click",()=>setMobileMenu(false));
document.querySelector(".sidebar-menu-button")?.addEventListener("click",()=>setMobileMenu(false));
profileSectionButtons.forEach(button=>button.addEventListener("click",()=>setProfileSection(button.dataset.profileSection||"profile")));
themeOptions.forEach(button=>button.addEventListener("click",()=>applyTheme(button.dataset.theme||"orange")));
openProfileButton.addEventListener("click",()=>{setMobileMenu(false);openMyProfile();});
closeProfileButton.addEventListener("click",closeProfileModal);
avatarCropModal?.addEventListener("click",event=>{if(event.target===avatarCropModal)closeAvatarCrop()});
closeUserProfileButton.addEventListener("click",()=>userProfileModal.classList.add("hidden"));
friendRefreshButton?.addEventListener("click",async()=>{friendRefreshButton.classList.add("refreshing");await loadFriends();setTimeout(()=>friendRefreshButton.classList.remove("refreshing"),280);});
addFriendButton?.addEventListener("click",()=>{const relation=friends.find(item=>item.user_id===selectedProfileId);if(relation?.status==="accepted")unfriend();else addFriend();});
saveProfileButton.addEventListener("click",saveProfile);
joinRoomButton.addEventListener("click",joinRoom);
usernameInput.addEventListener("input",()=>scheduleUsernameCheck(false));
firstUsernameInput.addEventListener("input",()=>scheduleUsernameCheck(true));
firstUsernameInput.addEventListener("keydown",event=>{if(event.key==="Enter")joinRoom()});
usernameInput.addEventListener("keydown",event=>{if(event.key==="Enter")saveProfile()});
input.addEventListener("input",()=>{
 charCount.textContent=input.value.length+" / 500";
 input.style.height="auto";
 input.style.height=Math.min(input.scrollHeight,130)+"px";
});
input.addEventListener("keydown",event=>{
 if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendMessage();}
});
messagesEl.addEventListener("scroll",updateScrollButton,{passive:true});
scrollToBottomButton?.addEventListener("click",()=>scrollToBottom(true));
sendButton.addEventListener("click",()=>sendMessage());
stickerButton?.addEventListener("click",event=>{event.stopPropagation();openStickerPicker()});
stickerPickerClose?.addEventListener("click",()=>stickerPicker?.classList.add("hidden"));
savedStickerTab?.addEventListener("click",()=>setStickerTab("saved"));
searchStickerTab?.addEventListener("click",()=>setStickerTab("search"));
stickerSearchButton?.addEventListener("click",searchStickers);
stickerSearchInput?.addEventListener("keydown",event=>{if(event.key==="Enter")searchStickers()});
savedStickerGrid?.addEventListener("click",event=>{
 const button=event.target.closest("[data-sticker-url]");
 if(button)sendSticker(button.dataset.stickerUrl);
});
stickerSearchGrid?.addEventListener("click",event=>{
 const save=event.target.closest("[data-save-sticker]");
 const send=event.target.closest("[data-sticker-url]");
 if(save){
  saveSticker(save.dataset.saveSticker);
  save.classList.add("saved");
  save.textContent="Saved";
  return;
 }
 if(send)sendSticker(send.dataset.stickerUrl);
});
document.addEventListener("click",event=>{if(!event.target.closest(".sticker-picker")&&!event.target.closest("#stickerButton"))stickerPicker?.classList.add("hidden")});
loadSavedStickers();
loadTheme();
friendSearchButton?.addEventListener("click",searchFriend);
window.addEventListener("resize",()=>{
 if(window.innerWidth>760){
  mobileSidebar?.classList.remove("mobile-open");
  mobileMenuBackdrop?.classList.remove("mobile-open");
  chatLayout?.classList.remove("sidebar-collapsed");
 }else{
  chatLayout?.classList.remove("sidebar-collapsed");
 }
});
friendSearchInput?.addEventListener("keydown",event=>{if(event.key==="Enter")searchFriend()});
friendSearchResult?.addEventListener("click",event=>{const button=event.target.closest("[data-search-id]");if(button)openPublicProfile(button.dataset.searchId)});
friendList?.addEventListener("click",async event=>{
 const button=event.target.closest("[data-friend-id]");
 if(button){setMobileMenu(false);openPublicProfile(button.dataset.friendId);}
 const accept=event.target.closest("[data-accept-id]");
 const decline=event.target.closest("[data-decline-id]");
 if(accept||decline){
  const requestId=(accept||decline).dataset.acceptId||(accept||decline).dataset.declineId;
  try{
   await request("/api/friends/respond",{method:"POST",body:JSON.stringify({user_id:userId,request_id:requestId,action:accept?"accept":"decline"})});
   await loadFriends();
  }catch{}
 }
});
messagesEl.addEventListener("click",event=>{
 const button=event.target.closest("[data-user-id]");
 if(button)openPublicProfile(button.dataset.userId);
});



async function loadFriends(){
 try{
  const result=await request("/api/friends?user_id="+encodeURIComponent(userId));
  friends=result.friends||[];
  renderFriendList();
 }catch{friendList.innerHTML="";}
}

function renderFriendList(){
 friends=friends.map(item=>({...item,online:onlineUsers.has(item.user_id)}));
 const incoming=friends.filter(item=>item.status==="pending"&&item.incoming);
 const accepted=friends.filter(item=>item.status==="accepted");
 const incomingMarkup=incoming.map(item=>'<div class="friend-request"><button class="friend-item" type="button" data-friend-id="'+escapeText(item.user_id)+'">'+avatarMarkup(item,"friend-avatar")+'<span><strong>'+escapeText(item.display_name||item.username)+ownerBadgeMarkup(item.user_id,item.user_number)+'</strong><small>@'+escapeText(item.username)+(item.user_number?" · ID #"+item.user_number:"")+'</small></span></button><div class="friend-request-actions"><button type="button" data-accept-id="'+escapeText(item.id)+'">Accept</button><button type="button" data-decline-id="'+escapeText(item.id)+'">Decline</button></div></div>').join("");
 const acceptedMarkup=accepted.map(item=>'<button class="friend-item" type="button" data-friend-id="'+escapeText(item.user_id)+'">'+avatarMarkup(item,"friend-avatar")+'<span class="friend-info"><strong>'+escapeText(item.display_name||item.username)+ownerBadgeMarkup(item.user_id,item.user_number)+'</strong><small>@'+escapeText(item.username)+(item.user_number?" · ID #"+item.user_number:"")+'</small></span><span class="presence-dot '+(item.online?"online":"offline")+'" title="'+(item.online?"Online":"Offline")+'"></span></button>').join("");
 friendList.innerHTML=incomingMarkup+acceptedMarkup+(!incomingMarkup&&!acceptedMarkup?'<span class="friend-empty">No friends yet.</span>':"");
}

async function searchFriend(){
 const query=friendSearchInput.value.trim();
 friendSearchStatus.textContent="";
 friendSearchResult.classList.add("hidden");
 if(query.length<1){friendSearchStatus.textContent="Enter a username or UID.";return;}
 if(!/^\d+$/.test(query)&&query.length<2){friendSearchStatus.textContent="Enter at least 2 characters.";return;}
 friendSearchStatus.textContent="Searching...";
 try{
  const result=await request("/api/users/search?q="+encodeURIComponent(query));
  if(!result.profile){friendSearchStatus.textContent="User not found.";return;}
  const item=result.profile;
  friendSearchStatus.textContent="";
  friendSearchResult.classList.remove("hidden");
  friendSearchResult.innerHTML=avatarMarkup(item,"friend-search-avatar")+'<span><strong>'+escapeText(item.display_name||item.username)+ownerBadgeMarkup(item.user_id,item.user_number)+'</strong><small>@'+escapeText(item.username)+(item.user_number?" · ID #"+item.user_number:"")+'</small></span><button type="button" class="friend-view-button" data-search-id="'+escapeText(item.id)+'">View</button>';
 }catch(error){friendSearchStatus.textContent=error instanceof Error?error.message:"Search failed."}
}

async function unfriend(){
 if(!selectedProfileId||selectedProfileId===userId)return;
 addFriendButton.disabled=true;
 friendActionMessage.textContent="Removing friend...";
 try{
  const result=await request("/api/friends/unfriend",{method:"POST",body:JSON.stringify({user_id:userId,target_user_id:selectedProfileId})});
  friendActionMessage.textContent=result.message||"Friend removed.";
  addFriendButton.textContent="Add Friend";
  addFriendButton.disabled=false;
  await loadFriends();
 }catch(error){
  friendActionMessage.textContent=error instanceof Error?error.message:"Could not remove friend.";
  addFriendButton.disabled=false;
 }
}

async function addFriend(){
 if(!selectedProfileId||selectedProfileId===userId)return;
 addFriendButton.disabled=true;
 friendActionMessage.textContent="Sending...";
 try{
  const result=await request("/api/friends/request",{method:"POST",body:JSON.stringify({user_id:userId,target_user_id:selectedProfileId})});
  friendActionMessage.textContent=result.message||"Friend request sent.";
  addFriendButton.textContent="Request pending";
 }catch(error){
  friendActionMessage.textContent=error instanceof Error?error.message:"Could not send friend request.";
  addFriendButton.disabled=false;
 }
}

async function start(){
 setConnection("Connecting");
 try{
  await initializeSupabase();
 }catch(error){
  console.error(error);
  setConnection(error instanceof Error?error.message:"Database offline");
  profile=JSON.parse(localStorage.getItem(STORAGE_PROFILE)||"null");
  if(profile)renderProfile();else openFirstProfile();
  messages=[];
  renderMessages();
 }
}
start();