const CONFIG_ENDPOINT="/api/config";
const STORAGE_NAME="swgc-room-chats-name";
const STORAGE_PROFILE="swgc-room-chats-profile";
const messagesEl=document.querySelector("#messages");
const input=document.querySelector("#messageInput");
const sendButton=document.querySelector("#sendButton");
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
let supabase=null;
let user=null;
let profile=null;
let messages=[];
let realtimeChannel=null;
let avatarFile=null;
let usernameTimer=null;
let savingProfile=false;

function escapeText(value){
 return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function safeUrl(value){
 try{
  const url=new URL(value);
  return url.protocol==="http:"||url.protocol==="https:"?url.href:"";
 }catch{
  return "";
 }
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
  return '<button class="message-profile-button" type="button" data-user-id="'+escapeText(item.user_id)+'">'+
   avatarMarkup(item)+
   '<span class="message-body"><span class="message-meta"><span class="message-name-wrap"><span class="message-display-name">'+escapeText(displayName)+'</span><span class="message-username">'+escapeText(username)+'</span></span><time class="message-time">'+escapeText(new Date(item.created_at||Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</time></span>'+
   '<span class="message-text">'+escapeText(item.text)+'</span></span></button>';
 }).join("");
 if(wasNearBottom)messagesEl.scrollTop=messagesEl.scrollHeight;
}

async function loadConfig(){
 const response=await fetch(CONFIG_ENDPOINT,{cache:"no-store"});
 if(!response.ok)throw new Error("Supabase configuration is missing");
 return response.json();
}

async function initializeRealtime(){
 const config=await loadConfig();
 const module=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 supabase=module.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const sessionResult=await supabase.auth.getSession();
 if(!sessionResult.data.session){
  const signIn=await supabase.auth.signInAnonymously();
  if(signIn.error)throw signIn.error;
  user=signIn.data.user;
 }else{
  user=sessionResult.data.session.user;
 }
 if(!user)throw new Error("Could not create a chat session");
 await loadProfile();
 await loadMessages();
 subscribeRealtime();
 setConnection("Connected");
}

async function loadProfile(){
 const result=await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
 if(result.error)throw result.error;
 profile=result.data;
 if(profile)localStorage.setItem(STORAGE_NAME,profile.username);
 renderProfile();
 if(!profile)openFirstProfile();
}

async function loadMessages(){
 const result=await supabase.from("messages").select("*").order("created_at",{ascending:false}).limit(100);
 if(result.error)throw result.error;
 messages=(result.data||[]).reverse();
 renderMessages();
}

function subscribeRealtime(){
 realtimeChannel=supabase.channel("swgc-room-realtime")
 .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
  if(messages.some(item=>String(item.id)===String(payload.new.id)))return;
  messages.push(payload.new);
  messages=messages.slice(-100);
  renderMessages();
 })
 .on("postgres_changes",{event:"INSERT",schema:"public",table:"profiles"},payload=>{
  if(payload.new.id===user.id){
   profile=payload.new;
   renderProfile();
  }
 })
 .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"},payload=>{
  if(payload.new.id===user.id){
   profile=payload.new;
   renderProfile();
  }
  messages=messages.map(item=>item.user_id===payload.new.id?{...item,display_name:payload.new.display_name,avatar_url:payload.new.avatar_url,username:payload.new.username}:item);
  renderMessages();
 })
 .subscribe((status,error)=>{
  if(status==="SUBSCRIBED")setConnection("Connected");
  if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
   console.error(status,error);
   setConnection("Realtime retrying");
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
 if(!supabase){
  output.textContent="";
  return true;
 }
 output.textContent="Checking...";
 output.className="field-status checking";
 const result=await supabase.from("profiles").select("id").ilike("username",clean).limit(1);
 if(result.error){
  output.textContent="Could not check";
  output.className="field-status taken";
  return false;
 }
 const taken=Boolean(result.data?.length&&result.data[0].id!==user?.id);
 output.textContent=taken?"Name already exists. Choose another.":"Username available";
 output.className="field-status "+(taken?"taken":"available");
 return !taken;
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
 if(!profile){
  openFirstProfile();
  return;
 }
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

function showProfileMessage(message){
 profileMessage.textContent=message;
}

async function uploadAvatar(){
 if(!avatarFile)return profile?.avatar_url||"";
 if(avatarFile.size>4*1024*1024)throw new Error("Avatar must be smaller than 4 MB");
 if(!avatarFile.type.startsWith("image/"))throw new Error("Choose an image file");
 const extension=(avatarFile.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
 const path=user.id+"/"+crypto.randomUUID()+"."+extension;
 const result=await supabase.storage.from("avatars").upload(path,avatarFile,{contentType:avatarFile.type,cacheControl:"3600",upsert:false});
 if(result.error)throw result.error;
 return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

async function saveProfile(){
 if(savingProfile)return;
 const username=usernameInput.value.trim().replace(/\s+/g," ");
 const displayName=displayNameInput.value.trim().replace(/\s+/g," ");
 const note=profileNoteInput.value.trim();
 if(username.length<2||username.length>24){
  showProfileMessage("Username must be 2-24 characters.");
  return;
 }
 if(displayName.length<2||displayName.length>32){
  showProfileMessage("Display name must be 2-32 characters.");
  return;
 }
 if(note.length>1000){
  showProfileMessage("Profile note is too long.");
  return;
 }
 if(!supabase){
  profile={...(profile||{}),username,display_name:displayName,note,avatar_url:profile?.avatar_url||""};
  localStorage.setItem(STORAGE_NAME,username);
  localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
  renderProfile();
  closeProfileModal();
  return;
 }
 savingProfile=true;
 saveProfileButton.disabled=true;
 showProfileMessage("Saving...");
 try{
  const available=await checkUsername(username);
  if(!available)throw new Error("Name already exists. Choose another.");
  const avatarUrl=await uploadAvatar();
  const result=await supabase.from("profiles").upsert({id:user.id,username,display_name:displayName,note,avatar_url:avatarUrl},{onConflict:"id"}).select().single();
  if(result.error){
   if(result.error.code==="23505")throw new Error("Name already exists. Choose another.");
   throw result.error;
  }
  profile=result.data;
  localStorage.setItem(STORAGE_NAME,profile.username);
  renderProfile();
  closeProfileModal();
  nameModal.classList.add("hidden");
 }catch(error){
  showProfileMessage(error instanceof Error?error.message:"Could not save profile.");
 }finally{
  savingProfile=false;
  saveProfileButton.disabled=false;
 }
}

async function joinRoom(){
 const username=firstUsernameInput.value.trim().replace(/\s+/g," ");
 const displayName=firstDisplayNameInput.value.trim().replace(/\s+/g," ");
 if(username.length<2||username.length>24){
  firstUsernameCheck.textContent="Use 2-24 characters";
  firstUsernameCheck.className="field-status taken first-check";
  return;
 }
 if(displayName.length<2||displayName.length>32){
  firstUsernameCheck.textContent="Choose a display name";
  firstUsernameCheck.className="field-status taken first-check";
  return;
 }
 if(!supabase){
  profile={username,display_name:displayName,note:"",avatar_url:""};
  localStorage.setItem(STORAGE_NAME,username);
  localStorage.setItem(STORAGE_PROFILE,JSON.stringify(profile));
  renderProfile();
  nameModal.classList.add("hidden");
  input.focus();
  return;
 }
 joinRoomButton.disabled=true;
 try{
  const available=await checkUsername(username,true);
  if(!available)return;
  const result=await supabase.from("profiles").insert({id:user.id,username,display_name:displayName,note:"",avatar_url:""}).select().single();
  if(result.error){
   if(result.error.code==="23505")throw new Error("Name already exists. Choose another.");
   throw result.error;
  }
  profile=result.data;
  localStorage.setItem(STORAGE_NAME,profile.username);
  renderProfile();
  nameModal.classList.add("hidden");
  input.focus();
 }catch(error){
  firstUsernameCheck.textContent=error instanceof Error?error.message:"Could not create profile.";
  firstUsernameCheck.className="field-status taken first-check";
 }finally{
  joinRoomButton.disabled=false;
 }
}

async function sendMessage(){
 const text=input.value.trim();
 if(!text||!profile||!supabase||!user)return;
 sendButton.disabled=true;
 try{
  const result=await supabase.from("messages").insert({user_id:user.id,text});
  if(result.error)throw result.error;
  input.value="";
  input.style.height="auto";
  charCount.textContent="0 / 500";
 }catch(error){
  setConnection("Message failed");
  setTimeout(()=>setConnection("Connected"),1500);
 }finally{
  sendButton.disabled=false;
 }
}

async function openPublicProfile(userId){
 if(!supabase||!userId)return;
 const result=await supabase.from("profiles").select("id,username,display_name,note,avatar_url").eq("id",userId).maybeSingle();
 if(result.error||!result.data)return;
 const data=result.data;
 setProfileAvatar(publicProfileAvatar,data,"public-avatar");
 publicProfileDisplayName.textContent=data.display_name||data.username;
 publicProfileUsername.textContent=data.username?"@"+data.username:"";
 publicProfileNote.textContent=data.note||"No profile note.";
 userProfileModal.classList.remove("hidden");
}

avatarPreview.addEventListener("click",()=>avatarInput.click());
avatarInput.addEventListener("change",()=>{
 avatarFile=avatarInput.files?.[0]||null;
 if(!avatarFile)return;
 if(avatarFile.size>4*1024*1024){
  showProfileMessage("Avatar must be smaller than 4 MB.");
  avatarFile=null;
  avatarInput.value="";
  return;
 }
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
 if(event.key==="Enter"&&!event.shiftKey){
  event.preventDefault();
  sendMessage();
 }
});
sendButton.addEventListener("click",sendMessage);
messagesEl.addEventListener("click",event=>{
 const button=event.target.closest("[data-user-id]");
 if(button)openPublicProfile(button.dataset.userId);
});
profileModal.addEventListener("click",event=>{if(event.target===profileModal)closeProfileModal()});
userProfileModal.addEventListener("click",event=>{if(event.target===userProfileModal)userProfileModal.classList.add("hidden")});
nameModal.addEventListener("click",event=>{if(event.target===nameModal&&!profile)event.preventDefault()});

async function start(){
 setConnection("Connecting");
 try{
  await initializeRealtime();
 }catch(error){
  console.error(error);
  setConnection("Local demo");
  const cachedProfile=JSON.parse(localStorage.getItem(STORAGE_PROFILE)||"null");
  const cachedName=localStorage.getItem(STORAGE_NAME)||"";
  if(cachedProfile||cachedName){
   profile=cachedProfile||{username:cachedName,display_name:cachedName,note:"",avatar_url:""};
   renderProfile();
  }else{
   profile={username:"",display_name:"Guest",note:"",avatar_url:""};
   renderProfile();
   nameModal.classList.remove("hidden");
  }
  messages=JSON.parse(localStorage.getItem("swgc-room-chats-messages")||"[]").map(item=>({
   user_id:"local",
   username:item.name,
   display_name:item.name,
   avatar_url:"",
   text:item.text,
   created_at:new Date().toISOString()
  }));
  renderMessages();
 }
}

start();