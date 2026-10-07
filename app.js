const CONFIG_ENDPOINT="/api/config";
const STORAGE_NAME="swgc-room-chats-name";
const STORAGE_PROFILE="swgc-room-chats-profile";
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
const usernameInput=document.querySelector("#usernameInput");
const displayNameInput=document.querySelector("#displayNameInput");
const profileNoteInput=document.querySelector("#profileNoteInput");
const usernameCheck=document.querySelector("#usernameCheck");
const profileMessage=document.querySelector("#profileMessage");
const stickerButtons=stickerPicker?stickerPicker.querySelectorAll("[data-sticker]"):[];
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
const connectionDot=document.querySelector("#connectionDot");
const connectionText=document.querySelector("#connectionText");
let serverUrl="";
let userId="";
let profile=null;
let messages=[];
let socket=null;
let avatarFile=null;
let usernameTimer=null;
let savingProfile=false;

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

function renderProfile(){
 const current=profile||{};
 profileDisplayName.textContent=current.display_name||"Guest";
 profileUsername.textContent=current.username?"@"+current.username:"@guest";
 setProfileAvatar(profileAvatar,current,"avatar-large");
 setProfileAvatar(avatarPreview,current,"avatar-preview");
}

function renderMessages(){
 if(!messages.length){
  messagesEl.innerHTML='<div class="empty"><div class="empty-inner"><div class="empty-logo"><img class="logo-image" src="./assests/logo.png" alt="SWG"></div><h2>Welcome to SWGC Room Chats</h2><p>Start the conversation. New messages appear here in real time.</p></div></div>';
  return;
 }
 const wasNearBottom=messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<80;
 messagesEl.innerHTML=messages.map(item=>{
  const displayName=item.display_name||item.username||"Guest";
  const username=item.username?("@"+item.username):"";
  const content=item.type==="sticker"?'<span class="message-sticker">'+escapeText(item.text)+'</span>':'<span class="message-text">'+escapeText(item.text)+'</span>';
  return '<button class="message-profile-button" type="button" data-user-id="'+escapeText(item.user_id)+'">'+
   avatarMarkup(item)+
   '<span class="message-body"><span class="message-meta"><span class="message-name-wrap"><span class="message-display-name">'+escapeText(displayName)+'</span><span class="message-username">'+escapeText(username)+'</span></span><time class="message-time">'+escapeText(new Date(item.created_at||Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</time></span>'+content+'</span></button>';
 }).join("");
 if(wasNearBottom)messagesEl.scrollTop=messagesEl.scrollHeight;
}

async function request(path,options={}){
 const response=await fetch(serverUrl+path,{
  ...options,
  headers:{"Content-Type":"application/json",...(options.headers||{})}
 });
 let result={};
 try{result=await response.json();}catch{}
 if(!response.ok)throw new Error(result.error||"Server request failed");
 return result;
}

async function initializeServer(){
 const configResponse=await fetch(CONFIG_ENDPOINT,{cache:"no-store"});
 if(!configResponse.ok)throw new Error("Chat server is not configured");
 const config=await configResponse.json();
 serverUrl=String(config.chatServerUrl||"").replace(/\/$/,"");
 if(!serverUrl)throw new Error("Chat server is not configured");
 let savedId=localStorage.getItem("swgc-room-chats-user-id")||"";
 if(savedId){
  userId=savedId;
 }else{
  const session=await request("/api/session",{method:"POST",body:"{}"});
  userId=session.userId;
  localStorage.setItem("swgc-room-chats-user-id",userId);
 }
 const profiles=await request("/api/profiles");
 profile=profiles.profiles.find(item=>item.id===userId)||null;
 if(profile)localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
 renderProfile();
 if(!profile)openFirstProfile();
 const history=await request("/api/messages?limit=100");
 messages=history.messages||[];
 renderMessages();
 connectSocket();
}

function connectSocket(){
 const wsUrl=serverUrl.replace(/^http/,"ws")+"/ws";
 socket=new WebSocket(wsUrl);
 socket.addEventListener("open",()=>setConnection("Connected"));
 socket.addEventListener("message",event=>{
  try{
   const data=JSON.parse(event.data);
   if(data.type==="message.created"){
    if(!messages.some(item=>item.id===data.message.id)){
     messages.push(data.message);
     messages=messages.slice(-100);
     renderMessages();
    }
   }
   if((data.type==="profile.created"||data.type==="profile.updated")&&data.profile){
    if(data.profile.id===userId){
     profile=data.profile;
     localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
     localStorage.setItem(STORAGE_NAME,profile.username);
     renderProfile();
    }
    messages=messages.map(item=>item.user_id===data.profile.id?{...item,username:data.profile.username,display_name:data.profile.display_name,avatar_url:data.profile.avatar_url}:item);
    renderMessages();
   }
  }catch{}
 });
 socket.addEventListener("close",()=>{
  setConnection("Reconnecting");
  setTimeout(()=>connectSocket(),1500);
 });
 socket.addEventListener("error",()=>setConnection("Reconnecting"));
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

async function sendMessage(type="text",sticker=""){
 const text=type==="sticker"?sticker:input.value.trim();
 if(!text||!profile||!userId)return;
 sendButton.disabled=true;
 try{
  const result=await request("/api/messages",{method:"POST",body:JSON.stringify({user_id:userId,text,type})});
  if(result.message&&!messages.some(item=>item.id===result.message.id)){
   messages.push(result.message);
   messages=messages.slice(-100);
   renderMessages();
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
  setProfileAvatar(publicProfileAvatar,data,"public-avatar");
  publicProfileDisplayName.textContent=data.display_name||data.username;
  publicProfileUsername.textContent=data.username?"@"+data.username:"";
  publicProfileNote.textContent=data.note||"No profile note.";
  userProfileModal.classList.remove("hidden");
 }catch{}
}

avatarPreview.addEventListener("click",()=>avatarInput.click());
avatarInput.addEventListener("change",()=>{
 avatarFile=avatarInput.files?.[0]||null;
 if(!avatarFile)return;
 if(avatarFile.size>4*1024*1024){showProfileMessage("Avatar must be smaller than 4 MB.");avatarFile=null;avatarInput.value="";return;}
 const reader=new FileReader();
 reader.onload=()=>avatarPreview.innerHTML='<img src="'+escapeText(String(reader.result))+'" alt="">';
 reader.readAsDataURL(avatarFile);
});

openProfileButton.addEventListener("click",openMyProfile);
closeProfileButton.addEventListener("click",closeProfileModal);
closeUserProfileButton.addEventListener("click",()=>userProfileModal.classList.add("hidden"));
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
sendButton.addEventListener("click",()=>sendMessage());
stickerButton?.addEventListener("click",event=>{event.stopPropagation();stickerPicker?.classList.toggle("hidden")});
stickerButtons.forEach(button=>button.addEventListener("click",()=>sendMessage("sticker",button.dataset.sticker||"")));
document.addEventListener("click",event=>{if(!event.target.closest(".sticker-picker")&&!event.target.closest("#stickerButton"))stickerPicker?.classList.add("hidden")});
messagesEl.addEventListener("click",event=>{
 const button=event.target.closest("[data-user-id]");
 if(button)openPublicProfile(button.dataset.userId);
});
profileModal.addEventListener("click",event=>{if(event.target===profileModal)closeProfileModal()});
userProfileModal.addEventListener("click",event=>{if(event.target===userProfileModal)userProfileModal.classList.add("hidden")});

async function start(){
 setConnection("Connecting");
 try{
  await initializeServer();
 }catch(error){
  console.error(error);
  setConnection("Server offline");
  profile=JSON.parse(localStorage.getItem(STORAGE_PROFILE)||"null");
  if(profile)renderProfile();else openFirstProfile();
  messages=[];
  renderMessages();
 }
}
start();