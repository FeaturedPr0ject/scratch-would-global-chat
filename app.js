import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SERVER_API_BASE="https://swgc-chat-server.onrender.com";
const CONFIG_ENDPOINT=SERVER_API_BASE+"/api/config";

const BASE_DOCUMENT_TITLE="SWGC Room Chats";
let unreadTabMessages=0;
let faviconSource=null;
function updateTabNotifications(){
 document.title=unreadTabMessages>0?"("+unreadTabMessages+") "+BASE_DOCUMENT_TITLE:BASE_DOCUMENT_TITLE;
 const favicon=document.querySelector('link[rel="icon"]');
 if(!favicon)return;
 if(!faviconSource){
  faviconSource=new Image();
  faviconSource.onload=drawTabFavicon;
  faviconSource.src="./assests/logo.png";
 }else if(faviconSource.complete&&faviconSource.naturalWidth)drawTabFavicon();
}
function drawTabFavicon(){
 const favicon=document.querySelector('link[rel="icon"]');
 if(!favicon||!faviconSource?.naturalWidth)return;
 const canvas=document.createElement("canvas");
 canvas.width=64;
 canvas.height=64;
 const context=canvas.getContext("2d");
 context.drawImage(faviconSource,0,0,64,64);
 if(unreadTabMessages>0){
  context.beginPath();
  context.arc(48,16,15,0,Math.PI*2);
  context.fillStyle="#ff4757";
  context.fill();
  context.lineWidth=3;
  context.strokeStyle="#0b0b0f";
  context.stroke();
  context.fillStyle="#ffffff";
  context.font="bold 19px Arial";
  context.textAlign="center";
  context.textBaseline="middle";
  context.fillText(unreadTabMessages>99?"99+":String(unreadTabMessages),48,16);
 }
 favicon.href=canvas.toDataURL("image/png");
}
function countUnreadTabMessage(message){
 if(!message||message.user_id===userId)return;
 const away=document.hidden||!document.hasFocus();
 if(away){
  unreadTabMessages=Math.min(999,unreadTabMessages+1);
  updateTabNotifications();
  showIncomingMessageNotification(message);
 }
}
function showIncomingMessageNotification(message){
 const author=String(message.display_name||message.username||"SWGC user");
 const body=message.type==="sticker"?"Sent a sticker":String(message.text||"New message").slice(0,180);
 if("Notification" in window&&Notification.permission==="granted"){
  try{
   const notice=new Notification(author,{body,icon:"./assests/logo.png",tag:"swgc-"+String(message.id||Date.now())});
   notice.onclick=()=>{window.focus();notice.close();};
  }catch{}
 }
}
let notificationPromptRequested=false;
document.addEventListener("pointerdown",()=>{
 if(notificationPromptRequested||!("Notification" in window)||Notification.permission!=="default")return;
 notificationPromptRequested=true;
 requestNotificationPermission();
},{once:true,passive:true});
document.addEventListener("visibilitychange",()=>{
 if(!document.hidden){
  unreadTabMessages=0;
  updateTabNotifications();
 }
});

const STORAGE_NAME="swgc-room-chats-name";
const STORAGE_PROFILE="swgc-room-chats-profile";
const THEME_STORAGE="swgc-room-chats-theme";
const COLOR_MODE_STORAGE="swgc-room-chats-color-mode";
const LANGUAGE_STORAGE="swgc-room-chats-language";
const THEME_PRESETS={orange:["#ffad00","#ffbf2f","255,173,0"],blue:["#4f8cff","#74a6ff","79,140,255"],purple:["#a970ff","#c293ff","169,112,255"],green:["#38d39f","#63e6b8","56,211,159"],red:["#ff5f6d","#ff7b86","255,95,109"]};
const startupOverlay=document.querySelector("#startupOverlay");
const messagesEl=document.querySelector("#messages");
const input=document.querySelector("#messageInput");
const sendButton=document.querySelector("#sendButton");
const stickerButton=document.querySelector("#stickerButton");
const fileButton=document.querySelector("#fileButton");
const fileInput=document.querySelector("#fileInput");
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
const recentStickerFeature=document.querySelector("#recentStickerFeature");
const recentStickerGrid=document.querySelector("#recentStickerGrid");
const recentStickerEmpty=document.querySelector("#recentStickerEmpty");
const clearSavedStickersButton=document.querySelector("#clearSavedStickers");
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
const roomStatus=document.querySelector("#roomStatus");
const groupCard=document.querySelector("#groupCard");
const groupModal=document.querySelector("#groupModal");
const closeGroupModalButton=document.querySelector("#closeGroupModal");
const groupNameInput=document.querySelector("#groupNameInput");
const groupFriendList=document.querySelector("#groupFriendList");
const groupModalMessage=document.querySelector("#groupModalMessage");
const groupSettingsModal=document.querySelector("#groupSettingsModal");
const closeGroupSettingsButton=document.querySelector("#closeGroupSettings");
const groupSettingsNameInput=document.querySelector("#groupSettingsNameInput");
const groupSettingsAvatar=document.querySelector("#groupSettingsAvatar");
const groupSettingsAvatarInput=document.querySelector("#groupSettingsAvatarInput");
const groupSettingsMessage=document.querySelector("#groupSettingsMessage");
const groupSettingsSaveButton=document.querySelector("#groupSettingsSave");
const groupSettingsDeleteButton=document.querySelector("#groupSettingsDelete");
const createGroupButton=document.querySelector("#createGroupButton");
const groupCreateSubmit=document.querySelector("#groupCreateSubmit");
const publicRoomButton=document.querySelector("#publicRoomButton");
const mobileMenuButton=document.querySelector("#mobileMenuButton");
const mobileMenuBackdrop=document.querySelector("#mobileMenuBackdrop");
const mobileSidebar=document.querySelector(".sidebar");
const chatLayout=document.querySelector(".chat-layout");
const scrollToBottomButton=document.querySelector("#scrollToBottom");
const profileSectionButtons=document.querySelectorAll("[data-profile-section]");
const profileSectionProfile=document.querySelector("#profileSectionProfile");
const profileSectionSettings=document.querySelector("#profileSectionSettings");
const themeOptions=document.querySelectorAll("[data-theme]");
const settingsCategoryButtons=document.querySelectorAll("[data-settings-category]");
const settingsPanels=document.querySelectorAll("[data-settings-panel]");
const themeModeOptions=document.querySelectorAll("[data-theme-mode]");
const languageSelect=document.querySelector("#languageSelect");
let friends=[];
let selectedProfileId="";
let groups=[];
let ownedGroup=null;
let groupCreationUsed=false;
let activeGroupId="";
let publicMessages=[];
let groupMessages=[];
const onlineUsers=new Set();
let presenceChannel=null;
const connectionDot=document.querySelector("#connectionDot");
const connectionText=document.querySelector("#connectionText");
let supabaseClient=null;
let klipyApiKey="";
let userId="";
let profile=null;
const profileDirectory=new Map();
let messages=[];
let socket=null;
const SAVED_STICKERS_STORAGE="swgc-room-chats-saved-stickers";
const RECENT_STICKERS_STORAGE="swgc-room-chats-recent-stickers";
let savedStickers=[];
let recentStickers=[];
let stickerSearchPos="";
let stickerSearchLoading=false;
let stickerSearchHasMore=true;
let stickerSearchQuery="";
let currentLanguage=localStorage.getItem(LANGUAGE_STORAGE)||"en";
let stickerSearchRequest=0;
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
function syncVisualViewport(){
 const viewport=window.visualViewport;
 const height=viewport?.height||window.innerHeight;
 document.documentElement.style.setProperty("--visual-vh",height+"px");
}

syncVisualViewport();
window.visualViewport?.addEventListener("resize",syncVisualViewport);
window.visualViewport?.addEventListener("scroll",syncVisualViewport);
window.addEventListener("orientationchange",()=>setTimeout(syncVisualViewport,80));

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

function applyColorMode(mode,save=true){
 const value=mode==="light"?"light":"dark";
 document.documentElement.dataset.colorMode=value;
 themeModeOptions.forEach(button=>button.classList.toggle("active",button.dataset.themeMode===value));
 if(save)localStorage.setItem(COLOR_MODE_STORAGE,value);
}

function loadColorMode(){
 applyColorMode(localStorage.getItem(COLOR_MODE_STORAGE)||"dark",false);
}

function applyLanguage(language,save=true){
 const value=language==="vi"?"vi":"en";
 document.documentElement.lang=value;
 if(languageSelect)languageSelect.value=value;
 const labels=value==="vi"?{
  color:"Kiểu màu",theme:"Chủ đề",language:"Ngôn ngữ",
  colorTitle:"Kiểu màu",colorDescription:"Chọn màu nhấn chính cho SWGC Room Chats.",
  themeTitle:"Chủ đề",themeDescription:"Chọn chế độ Sáng hoặc Tối.",
  languageTitle:"Ngôn ngữ",languageDescription:"Chọn ngôn ngữ được sử dụng trong SWGC Room Chats.",
  languageLabel:"Ngôn ngữ",profile:"Hồ sơ",settings:"Cài đặt",light:"Sáng",dark:"Tối",
  troubleshoot:"Khắc phục sự cố",connected:"Đã kết nối",connecting:"Đang kết nối",offline:"Ngoại tuyến",
  publicRoom:"Phòng công khai",everyone:"Mọi người đều có thể tham gia",friends:"Bạn bè",
  edit:"Sửa",report:"Báo cáo sự cố",respectTitle:"Hãy tôn trọng nhau.",respectText:"Giữ cuộc trò chuyện thân thiện và an toàn.",
  searchUsers:"Tìm người dùng hoặc UID",searchUsersAria:"Tìm người dùng",message:"Gửi tin nhắn...",
  send:"Gửi",enterHint:"Enter để gửi · Shift+Enter để xuống dòng",stickers:"Sticker",recent:"Gần đây",
  search:"Tìm kiếm",recommended:"Đề xuất",reactions:"Cảm xúc",cute:"Dễ thương",meme:"Meme",animals:"Động vật",
  noRecent:"Chưa có sticker gần đây.",saved:"Đã lưu",unsaveAll:"Bỏ lưu tất cả",noSaved:"Chưa có sticker đã lưu.",
  searchKlipy:"Tìm kiếm KLIPY",powered:"Được cung cấp bởi KLIPY",username:"Tên người dùng",
  displayName:"Tên hiển thị",displayPlaceholder:"Tên giả hoặc tên hiển thị (tùy chọn)",profileNote:"Ghi chú hồ sơ",
  profileNotePlaceholder:"Viết gì đó về bạn...",saveProfile:"Lưu hồ sơ",cropAvatar:"Cắt ảnh đại diện",
  cropHint:"Kéo ảnh để điều chỉnh vị trí và dùng thanh thu phóng.",zoom:"Thu phóng",useAvatar:"Dùng ảnh đại diện",
  cancel:"Hủy",chooseUsername:"Chọn tên người dùng",uniqueHint:"Tên người dùng phải là duy nhất. Tên hiển thị là tùy chọn. Nếu để trống, tên người dùng sẽ được hiển thị.",
  uniqueUsername:"Tên người dùng duy nhất",joinRoom:"Tham gia phòng",addFriend:"Thêm bạn",noNote:"Chưa có ghi chú hồ sơ.",
  profileTab:"Hồ sơ",settingsTab:"Cài đặt"
 }:{
  color:"Color Style",theme:"Theme",language:"Language",
  colorTitle:"Color Style",colorDescription:"Choose the main accent color for SWGC Room Chats.",
  themeTitle:"Theme",themeDescription:"Choose between Light and Dark mode.",
  languageTitle:"Language",languageDescription:"Choose the language used by SWGC Room Chats.",
  languageLabel:"Language",profile:"Profile",settings:"Settings",light:"Light",dark:"Dark",
  troubleshoot:"Troubleshoot",connected:"Connected",connecting:"Connecting",offline:"Offline",
  publicRoom:"Public room",everyone:"Everyone can join",friends:"Friends",
  edit:"Edit",report:"Report a problem",respectTitle:"Be respectful.",respectText:"Keep room chats friendly and safe.",
  searchUsers:"Search users or UID",searchUsersAria:"Search users",message:"Send a message...",
  send:"Send",enterHint:"Enter to send · Shift+Enter for a new line",stickers:"Stickers",recent:"Recent",
  search:"Search",recommended:"Recommended",reactions:"Reactions",cute:"Cute",meme:"Meme",animals:"Animals",
  noRecent:"No recent stickers yet.",saved:"Saved",unsaveAll:"Unsave all",noSaved:"No saved stickers yet.",
  searchKlipy:"Search KLIPY",powered:"Powered by KLIPY",username:"Username",
  displayName:"Display name",displayPlaceholder:"Fake name or display name (optional)",profileNote:"Profile note",
  profileNotePlaceholder:"Write something about yourself...",saveProfile:"Save Profile",cropAvatar:"Crop Avatar",
  cropHint:"Drag the image to position it and use the zoom control.",zoom:"Zoom",useAvatar:"Use Avatar",
  cancel:"Cancel",chooseUsername:"Choose your username",uniqueHint:"Your username must be unique. Display name is optional. If empty, your username will be shown.",
  uniqueUsername:"Unique username",joinRoom:"Join Room",addFriend:"Add Friend",noNote:"No profile note.",
  profileTab:"Profile",settingsTab:"Settings"
 };
 const setText=(selector,text)=>document.querySelectorAll(selector).forEach(element=>element.textContent=text);
 const setPlaceholder=(selector,text)=>document.querySelectorAll(selector).forEach(element=>element.setAttribute("placeholder",text));
 const setAria=(selector,text)=>document.querySelectorAll(selector).forEach(element=>element.setAttribute("aria-label",text));
 setText('[data-settings-category="color"]',labels.color);
 setText('[data-settings-category="theme"]',labels.theme);
 setText('[data-settings-category="language"]',labels.language);
 setText('[data-settings-panel="color"] .settings-section-head strong',labels.colorTitle);
 setText('[data-settings-panel="color"] .settings-section-head span',labels.colorDescription);
 setText('[data-settings-panel="theme"] .settings-section-head strong',labels.themeTitle);
 setText('[data-settings-panel="theme"] .settings-section-head span',labels.themeDescription);
 setText('[data-settings-panel="language"] .settings-section-head strong',labels.languageTitle);
 setText('[data-settings-panel="language"] .settings-section-head span',labels.languageDescription);
 setText(".settings-select-label",labels.languageLabel);
 setText('[data-profile-section="profile"]',labels.profile);
 setText('[data-profile-section="settings"]',labels.settings);
 setText('[data-theme-mode="light"] span:last-child',labels.light);
 setText('[data-theme-mode="dark"] span:last-child',labels.dark);
 setText(".support-link",labels.troubleshoot);
 setText("#roomStatus",labels.publicRoom);
 setText(".server-card strong",labels.publicRoom);
 setText(".server-card span span",labels.everyone);
 setText(".sidebar-head strong",labels.friends);
 setText(".friends-card-head>strong",labels.friends);
 setText(".profile-edit",labels.edit);
 setText(".sidebar-note strong",labels.respectTitle);
 setText(".sidebar-note span",labels.respectText);
 setText('.sidebar-note a',labels.report);
 setPlaceholder("#friendSearchInput",labels.searchUsers);
 setAria("#friendSearchButton",labels.searchUsersAria);
 setPlaceholder("#messageInput",labels.message);
 setText("#sendButton",labels.send);
 setText(".composer-foot span:last-child",labels.enterHint);
 setAria("#stickerButton",labels.stickers);
 setText(".sticker-picker-head strong",labels.stickers);
 setText("#savedStickerTab",labels.recent);
 setText("#searchStickerTab",labels.search);
 setText('[data-sticker-query=""]',labels.recommended);
 setText('[data-sticker-query="reaction sticker"]',labels.reactions);
 setText('[data-sticker-query="cute sticker"]',labels.cute);
 setText('[data-sticker-query="meme sticker"]',labels.meme);
 setText('[data-sticker-query="animal sticker"]',labels.animals);
 setText("#recentStickerEmpty",labels.noRecent);
 setText(".sticker-saved-section .sticker-section-title strong",labels.saved);
 setText("#clearSavedStickers",labels.unsaveAll);
 setText("#savedStickerEmpty",labels.noSaved);
 setPlaceholder("#stickerSearchInput",labels.searchKlipy);
 setText(".sticker-picker .sticker-search-status + div",labels.powered);
 setText('label[for="usernameInput"]',labels.username);
 setText('label[for="displayNameInput"]',labels.displayName);
 setText('label[for="profileNoteInput"]',labels.profileNote);
 setPlaceholder("#displayNameInput",labels.displayPlaceholder);
 setPlaceholder("#profileNoteInput",labels.profileNotePlaceholder);
 setText("#saveProfile",labels.saveProfile);
 setText("#avatarCropModal h2",labels.cropAvatar);
 setText("#avatarCropModal p",labels.cropHint);
 setText('label[for="avatarCropZoom"]',labels.zoom);
 setText("#avatarCropSave",labels.useAvatar);
 setText("#avatarCropCancel",labels.cancel);
 setText("#nameModal h2",labels.chooseUsername);
 setText("#nameModal p",labels.uniqueHint);
 setPlaceholder("#firstUsernameInput",labels.uniqueUsername);
 setPlaceholder("#firstDisplayNameInput",labels.displayName+" (optional)");
 setText("#joinRoomButton",labels.joinRoom);
 setText("#addFriendButton",labels.addFriend);
 setText("#publicProfileNote",labels.noNote);
 setText("#profileModal .modal-close",labels.cancel==="Hủy"?"×":"×");
 if(save)localStorage.setItem(LANGUAGE_STORAGE,value);
 currentLanguage=value;
}
function loadLanguage(){
 applyLanguage(localStorage.getItem(LANGUAGE_STORAGE)||"en",false);
}

function changeLanguage(language){
 const value=language==="vi"?"vi":"en";
 localStorage.setItem(LANGUAGE_STORAGE,value);
 window.location.reload();
}

function setSettingsCategory(category){
 const value=["color","theme","language"].includes(category)?category:"color";
 settingsCategoryButtons.forEach(button=>button.classList.toggle("active",button.dataset.settingsCategory===value));
 settingsPanels.forEach(panel=>panel.classList.toggle("hidden",panel.dataset.settingsPanel!==value));
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

async function requestNotificationPermission(){
 if(!("Notification" in window))return "unsupported";
 if(Notification.permission!=="default")return Notification.permission;
 try{
  const permission=await Notification.requestPermission();
  return permission;
 }catch{return "denied";}
}

function setConnection(state){
 const online=state==="Connected";
 connectionDot.classList.toggle("online",online);
 connectionDot.classList.toggle("offline",!online);
 connectionText.textContent=currentLanguage==="vi"?({Connected:"Đã kết nối",Connecting:"Đang kết nối",Offline:"Ngoại tuyến"}[state]||state):state;
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
  const attachmentUrl=item.type==="image"||item.type==="file"?safeUrl(item.text):"";
  const attachmentName=escapeText(item.attachment_name||"Attachment");
  const attachmentSizeText=formatFileSize(item.attachment_size||0);
  const content=item.type==="sticker"&&stickerUrl?'<span class="message-sticker"><img src="'+escapeText(stickerUrl)+'" alt="Sticker" loading="lazy"></span>':item.type==="sticker"?'<span class="message-sticker">'+escapeText(item.text)+'</span>':item.type==="image"&&attachmentUrl?'<a class="message-attachment-image-link" href="'+escapeText(attachmentUrl)+'" target="_blank" rel="noopener"><img class="message-attachment-image" src="'+escapeText(attachmentUrl)+'" alt="'+attachmentName+'" loading="lazy"></a>':item.type==="file"&&attachmentUrl?'<a class="message-file" href="'+escapeText(attachmentUrl)+'" target="_blank" rel="noopener"><span class="message-file-icon">↗</span><span class="message-file-info"><strong>'+attachmentName+'</strong><small>'+escapeText(attachmentSizeText)+'</small></span></a>':'<span class="message-text">'+escapeText(item.text)+'</span>';
  const canDelete=item.user_id===userId;
  const deleteLabel=currentLanguage==="vi"?"Xóa tin nhắn":"Delete message";
  const deleteMarkup=canDelete?'<button class="message-delete-button" type="button" data-message-id="'+escapeText(item.id)+'" aria-label="'+escapeText(deleteLabel)+'" title="'+escapeText(deleteLabel)+'">×</button>':"";
  return '<div class="message-row">'+
   '<button class="message-profile-button" type="button" data-user-id="'+escapeText(item.user_id)+'">'+
   avatarMarkup(avatarItem)+
   '<span class="message-body"><span class="message-meta"><span class="message-name-wrap"><span class="message-display-name">'+escapeText(displayName)+'</span>'+ownerBadgeMarkup(item.user_id,userNumber)+'<span class="message-username">'+escapeText(username?"@"+username:"")+'</span></span><time class="message-time">'+escapeText(new Date(item.created_at||Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}))+'</time></span>'+content+'</span></button>'+deleteMarkup+'</div>';
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
 const headers={"Content-Type":"application/json",...(options.headers||{})};
 if(supabaseClient){
  const sessionResult=await supabaseClient.auth.getSession();
  const accessToken=sessionResult.data.session?.access_token||"";
  if(accessToken)headers.Authorization="Bearer "+accessToken;
 }
 const response=await fetch(SERVER_API_BASE+path,{...options,method,headers,cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok===false)throw new Error(data.error||"Server request failed.");
 return data;
}

async function initializeSupabase(){
 const configResponse=await fetch(CONFIG_ENDPOINT,{cache:"no-store"});
 if(!configResponse.ok)throw new Error("Supabase is not configured");
 const config=await configResponse.json();
 const supabaseUrl=String(config.supabaseUrl||"").trim();
 const publishableKey=String(config.supabasePublishableKey||"").trim();
 klipyApiKey=String(config.klipyApiKey||"").trim();
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
 publicMessages=history.messages||[];
 messages=publicMessages.slice();
 renderMessages();
 connectRealtime();
 await loadFriends();
 await loadGroups();
 setConnection("Connected");
 setTimeout(()=>{requestNotificationPermission();},800);
}

function connectRealtime(){
 if(!supabaseClient)return;
 const channel=supabaseClient.channel("swgc-room");
 channel
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
   const message=payload.new;
   if(message&&!publicMessages.some(item=>item.id===message.id)){
    countUnreadTabMessage(message);
    publicMessages.push(message);
    publicMessages=publicMessages.slice(-100);
    if(!activeGroupId){messages=publicMessages.slice();renderMessages();}
   }
  })
  .on("postgres_changes",{event:"DELETE",schema:"public",table:"messages"},payload=>{
   const messageId=payload.old?.id;
   if(messageId){
    publicMessages=publicMessages.filter(item=>item.id!==messageId);
    if(!activeGroupId){messages=publicMessages.slice();renderMessages();}
   }
  })
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"group_messages"},payload=>{
   const message=payload.new;
   if(message&&message.group_id===activeGroupId&&!groupMessages.some(item=>item.id===message.id)){
    countUnreadTabMessage(message);
    groupMessages.push(message);
    groupMessages=groupMessages.slice(-100);
    messages=groupMessages.slice();
    renderMessages();
   }
  })
  .on("postgres_changes",{event:"DELETE",schema:"public",table:"group_messages"},payload=>{
   const messageId=payload.old?.id;
   if(messageId){
    groupMessages=groupMessages.filter(item=>item.id!==messageId);
    if(activeGroupId){messages=groupMessages.slice();renderMessages();}
   }
  })
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"groups"},()=>loadGroups())
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"group_members"},payload=>{if(payload.new?.user_id===userId)loadGroups()})
  .on("postgres_changes",{event:"DELETE",schema:"public",table:"group_members"},payload=>{if(payload.old?.user_id===userId)loadGroups()})
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
 try{
  const data=JSON.parse(localStorage.getItem(RECENT_STICKERS_STORAGE)||"[]");
  recentStickers=Array.isArray(data)?data.filter(item=>typeof item==="string"&&safeUrl(item)):[]; 
 }catch{recentStickers=[];}
 renderSavedStickers();
 renderRecentStickers();
}

function saveSticker(url){
 const safe=safeUrl(url);
 if(!safe)return;
 savedStickers=[safe,...savedStickers.filter(item=>item!==safe)];
 localStorage.setItem(SAVED_STICKERS_STORAGE,JSON.stringify(savedStickers));
 renderSavedStickers();
}

function unsaveSticker(url){
 const safe=safeUrl(url);
 if(!safe)return;
 savedStickers=savedStickers.filter(item=>item!==safe);
 localStorage.setItem(SAVED_STICKERS_STORAGE,JSON.stringify(savedStickers));
 renderSavedStickers();
}

function clearSavedStickers(){
 savedStickers=[];
 localStorage.setItem(SAVED_STICKERS_STORAGE,JSON.stringify(savedStickers));
 renderSavedStickers();
}

function addRecentSticker(url){
 const safe=safeUrl(url);
 if(!safe)return;
 recentStickers=[safe,...recentStickers.filter(item=>item!==safe)];
 localStorage.setItem(RECENT_STICKERS_STORAGE,JSON.stringify(recentStickers));
 renderRecentStickers();
}

function renderRecentStickers(){
 if(!recentStickerFeature||!recentStickerGrid||!recentStickerEmpty)return;
 const latest=recentStickers[0]||"";
 recentStickerFeature.classList.toggle("hidden",!latest);
 recentStickerFeature.innerHTML=latest?'<button class="sticker-tile" type="button" data-sticker-url="'+escapeText(latest)+'"><img src="'+escapeText(latest)+'" alt="Recent sticker" loading="lazy"></button>':"";
 const rest=recentStickers.slice(1);
 recentStickerGrid.innerHTML=rest.map(url=>'<button class="sticker-tile" type="button" data-sticker-url="'+escapeText(url)+'"><img src="'+escapeText(url)+'" alt="Recent sticker" loading="lazy"></button>').join("");
 recentStickerEmpty.classList.toggle("hidden",recentStickers.length>0);
}

function renderSavedStickers(){
 if(!savedStickerGrid||!savedStickerEmpty)return;
 savedStickerGrid.innerHTML=savedStickers.map(url=>'<div class="sticker-result saved-sticker-result"><button class="sticker-tile" type="button" data-sticker-url="'+escapeText(url)+'"><img src="'+escapeText(url)+'" alt="Saved sticker" loading="lazy"></button><button class="sticker-save saved" type="button" data-unsave-sticker="'+escapeText(url)+'" aria-label="Unsave sticker" title="Unsave sticker"></button></div>').join("");
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

async function searchStickers(queryOverride=null,append=false){
 const query=(queryOverride??(stickerSearchInput?.value.trim()||"")).trim();
 if(!stickerSearchStatus||!stickerSearchGrid)return;
 if(query&&query.length<2){
  stickerSearchStatus.textContent="Enter at least 2 characters.";
  stickerSearchGrid.innerHTML="";
  stickerSearchPos="";
  stickerSearchHasMore=false;
  return;
 }
 if(stickerSearchLoading)return;
 if(append&&!stickerSearchHasMore)return;
 if(!append){
  stickerSearchRequest+=1;
  stickerSearchPos="";
  stickerSearchHasMore=true;
  stickerSearchQuery=query;
  stickerSearchGrid.innerHTML="";
 }
 const requestId=stickerSearchRequest;
 stickerSearchLoading=true;
 stickerSearchStatus.textContent=append?"Loading more KLIPY stickers...":"Searching KLIPY...";
 try{
  const params=new URLSearchParams();
  if(query)params.set("q",query);
  if(stickerSearchPos)params.set("pos",stickerSearchPos);
  const response=await fetch(SERVER_API_BASE+"/api/stickers?"+params.toString(),{cache:"no-store"});
  const data=await response.json();
  if(requestId!==stickerSearchRequest)return;
  if(!response.ok||data.ok===false)throw new Error(data.error||"Sticker search failed");
  const stickers=Array.isArray(data.stickers)?data.stickers:[];
  if(!append)stickerSearchGrid.innerHTML="";
  if(stickers.length){
   stickerSearchGrid.insertAdjacentHTML("beforeend",stickers.map(url=>{
    const saved=savedStickers.includes(url)?" saved":"";
    return '<div class="sticker-result"><button class="sticker-tile" type="button" data-sticker-url="'+escapeText(url)+'"><img src="'+escapeText(url)+'" alt="Sticker" loading="lazy"></button><button class="sticker-save'+saved+'" type="button" data-save-sticker="'+escapeText(url)+'" aria-label="'+(saved?"Unsave sticker":"Save sticker")+'" title="'+(saved?"Unsave sticker":"Save sticker")+'"></button></div>';
   }).join(""));
  }
  stickerSearchPos=String(data.next||"");
  stickerSearchHasMore=Boolean(stickerSearchPos);
  if(!stickers.length&&!append)stickerSearchStatus.textContent="No stickers found.";
  else stickerSearchStatus.textContent=stickerSearchHasMore?stickerSearchGrid.children.length+" results · scroll for more":stickerSearchGrid.children.length+" results";
 }catch{
  if(requestId===stickerSearchRequest)stickerSearchStatus.textContent="Could not load KLIPY stickers.";
 }finally{
  if(requestId===stickerSearchRequest)stickerSearchLoading=false;
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
 addRecentSticker(safe);
 await sendMessage("sticker",safe);
}

function formatFileSize(size){
 const value=Number(size||0);
 if(value<1024)return value+" B";
 if(value<1024*1024)return (value/1024).toFixed(1)+" KB";
 return (value/(1024*1024)).toFixed(2)+" MB";
}


function showFileSizeWarning(size){
 const panel=document.querySelector("#fileSizeWarning");
 const text=document.querySelector("#fileSizeWarningText");
 if(!panel||!text)return;
 text.textContent=currentLanguage==="vi"?"Tệp "+formatFileSize(size)+" vượt quá giới hạn 4 MB. Vui lòng chọn tệp nhỏ hơn.":"This file is "+formatFileSize(size)+", exceeding the 4 MB limit. Please choose a smaller file.";
 panel.classList.remove("hidden");
}

async function uploadFile(file){
 if(!file||!profile||!userId)return;
 if(file.size>4*1024*1024){showFileSizeWarning(file.size);return;}
 const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120)||"file";
 const path=userId+"/"+Date.now()+"-"+crypto.randomUUID()+"-"+safeName;
 const upload=await supabaseClient.storage.from("chat-files").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
 if(upload.error)throw upload.error;
 const fileRecord=await supabaseClient.from("chat_files").insert({user_id:userId,path,original_name:file.name,mime_type:file.type||"application/octet-stream",size_bytes:file.size}).select("id").single();
 if(fileRecord.error){
  await supabaseClient.storage.from("chat-files").remove([path]);
  throw fileRecord.error;
 }
 const publicUrl=supabaseClient.storage.from("chat-files").getPublicUrl(path).data.publicUrl;
 const inlineImage=/^image\/(png|jpeg)$/i.test(file.type||"")||/\.(png|jpe?g)$/i.test(file.name);
 const type=inlineImage?"image":"file";
 const endpoint=activeGroupId?"/api/group-messages":"/api/messages";
 const body={user_id:userId,group_id:activeGroupId||undefined,text:publicUrl,type,attachment_name:file.name,attachment_size:file.size,attachment_mime:file.type||"application/octet-stream"};
 const result=await request(endpoint,{method:"POST",body:JSON.stringify(body)});
 if(result.message&&!messages.some(item=>item.id===result.message.id)){
  messages.push(result.message);
  messages=messages.slice(-100);
  if(activeGroupId)groupMessages=messages.slice();else publicMessages=messages.slice();
  renderMessages(true);
 }
}

async function sendMessage(type="text",sticker=""){
 const text=type==="sticker"?sticker:input.value.trim();
 if(!text||!profile||!userId)return;
 sendButton.disabled=true;
 const targetGroupId=activeGroupId;
 const endpoint=targetGroupId?"/api/group-messages":"/api/messages";
 const optimisticId="pending-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
 const optimisticMessage={id:optimisticId,user_id:userId,user_number:profile.user_number,username:profile.username,display_name:profile.display_name,avatar_url:profile.avatar_url,text,type,created_at:new Date().toISOString(),pending:true};
 const targetList=targetGroupId?groupMessages:publicMessages;
 targetList.push(optimisticMessage);
 if(targetList.length>100)targetList.splice(0,targetList.length-100);
 messages=targetList.slice();
 renderMessages(true);
 input.value="";
 input.style.height="auto";
 charCount.textContent="0 / 500";
 stickerPicker?.classList.add("hidden");
 try{
  const body=targetGroupId?{user_id:userId,group_id:targetGroupId,text,type}:{user_id:userId,text,type};
  const result=await request(endpoint,{method:"POST",body:JSON.stringify(body)});
  const currentList=targetGroupId?groupMessages:publicMessages;
  const withoutPending=currentList.filter(item=>item.id!==optimisticId);
  if(result.message&&!withoutPending.some(item=>item.id===result.message.id))withoutPending.push(result.message);
  if(withoutPending.length>100)withoutPending.splice(0,withoutPending.length-100);
  if(targetGroupId)groupMessages=withoutPending;else publicMessages=withoutPending;
  if(activeGroupId===targetGroupId){messages=withoutPending.slice();renderMessages(true);}
 }catch(error){
  if(targetGroupId)groupMessages=groupMessages.filter(item=>item.id!==optimisticId);else publicMessages=publicMessages.filter(item=>item.id!==optimisticId);
  if(activeGroupId===targetGroupId){messages=(targetGroupId?groupMessages:publicMessages).slice();renderMessages(true);}
  setConnection(error instanceof Error?error.message:"Message failed");
  setTimeout(()=>setConnection("Connected"),1800);
 }finally{sendButton.disabled=false;}
}

async function deleteMessage(messageId){
 if(!messageId||!userId)return;
 const confirmed=window.confirm(currentLanguage==="vi"?"Xóa tin nhắn này?":"Delete this message?");
 if(!confirmed)return;
 try{
  const endpoint=activeGroupId?"/api/group-messages":"/api/messages";
  const result=await request(endpoint,{method:"DELETE",body:JSON.stringify({id:messageId})});
  if(result.message_id){
   messages=messages.filter(item=>item.id!==result.message_id);
   if(activeGroupId)groupMessages=messages.slice();else publicMessages=messages.slice();
   renderMessages();
  }
 }catch(error){
  setConnection(error instanceof Error?error.message:"Delete failed");
  setTimeout(()=>setConnection("Connected"),1800);
 }
}

function renderGroupCard(){
 if(!groupCard)return;
 const activeGroups=groups.filter(item=>!item.deleted_at);
 if(!activeGroups.length){
  if(groupCreationUsed){
   groupCard.innerHTML='<div class="group-card-head"><strong>Group</strong></div><div class="group-card-empty">'+escapeText(currentLanguage==="vi"?"Bạn đã dùng lượt tạo nhóm. Hãy xóa nhóm hiện tại để tạo nhóm mới.":"You already have a group. Delete it before creating another group.")+'</div>';
  }else{
   groupCard.innerHTML='<div class="group-card-head"><strong>Group</strong></div><div class="group-card-empty">'+escapeText(currentLanguage==="vi"?"Bạn chưa có nhóm.":"You do not have a group yet.")+'</div><button class="primary-button group-create-button" type="button">'+escapeText(currentLanguage==="vi"?"Tạo nhóm":"Create Group")+'</button>';
   groupCard.querySelector(".group-create-button")?.addEventListener("click",openGroupModal);
  }
  return;
 }
 groupCard.innerHTML=activeGroups.map(item=>{
  const owned=item.owner_id===userId;
  const avatar=safeUrl(item.avatar_url);
  const icon=avatar?'<span class="group-icon group-icon-image"><img src="'+escapeText(avatar)+'" alt=""></span>':'<span class="group-icon">'+escapeText(initials(item.name))+'</span>';
  return '<div class="group-item'+(activeGroupId===item.id?' active':'')+'"><button class="group-open-button" type="button" data-group-open="'+escapeText(item.id)+'">'+icon+'<span class="group-info"><strong>'+escapeText(item.name)+'</strong><small>'+escapeText(owned?(currentLanguage==="vi"?"Nhóm của bạn":"Your group"):(currentLanguage==="vi"?"Nhóm":"Group"))+'</small></span></button>'+(owned?'<button class="group-settings-button" type="button" data-group-settings="'+escapeText(item.id)+'" aria-label="'+escapeText(currentLanguage==="vi"?"Cài đặt nhóm":"Group settings")+'" title="'+escapeText(currentLanguage==="vi"?"Cài đặt nhóm":"Group settings")+'">⚙</button>':"")+'</div>';
 }).join("");
 groupCard.querySelectorAll("[data-group-open]").forEach(button=>button.addEventListener("click",()=>openGroup(button.dataset.groupOpen)));
 groupCard.querySelectorAll("[data-group-settings]").forEach(button=>button.addEventListener("click",()=>openGroupSettings(button.dataset.groupSettings)));
}
async function loadGroups(){
 try{
  const result=await request("/api/groups?user_id="+encodeURIComponent(userId));
  groups=result.groups||[];
  ownedGroup=groups.find(item=>item.owner_id===userId&&!item.deleted_at)||null;
  groupCreationUsed=Boolean(ownedGroup);
  if(activeGroupId&&!groups.some(item=>item.id===activeGroupId&&!item.deleted_at)){
   activeGroupId="";
   messages=publicMessages.slice();
   if(roomStatus)roomStatus.textContent=currentLanguage==="vi"?"Phòng công khai":"Public room";
   renderMessages(true);
  }
  renderGroupCard();
 }catch{
  groups=[];
  ownedGroup=null;
  groupCreationUsed=false;
  renderGroupCard();
 }
}

function openGroupModal(){
 if(groupCreationUsed||!groupModal)return;
 groupNameInput.value="";
 groupModalMessage.textContent="";
 const accepted=friends.filter(item=>item.status==="accepted");
 groupFriendList.innerHTML=accepted.length?accepted.map(item=>'<label class="group-member-option"><input type="checkbox" value="'+escapeText(item.user_id)+'"><span>'+avatarMarkup(item,"group-member-avatar")+'<span><strong>'+escapeText(item.display_name||item.username)+'</strong><small>@'+escapeText(item.username)+'</small></span></span></label>').join(""):'<span class="group-member-empty">'+escapeText(currentLanguage==="vi"?"Bạn chưa có bạn bè để thêm.":"You have no friends to add yet.")+'</span>';
 groupModal.classList.remove("hidden");
 setTimeout(()=>groupNameInput?.focus(),30);
}

function closeGroupModal(){
 groupModal?.classList.add("hidden");
 if(groupModalMessage)groupModalMessage.textContent="";
}

function openGroupSettings(groupId){
 const group=groups.find(item=>item.id===groupId&&item.owner_id===userId&&!item.deleted_at);
 if(!group||!groupSettingsModal)return;
 groupSettingsModal.dataset.groupId=group.id;
 groupSettingsNameInput.value=group.name||"";
 groupSettingsMessage.textContent="";
 const avatar=safeUrl(group.avatar_url);
 groupSettingsAvatar.innerHTML=avatar?'<img src="'+escapeText(avatar)+'" alt="">':escapeText(initials(group.name));
 groupSettingsAvatarInput.value="";
 groupSettingsModal.classList.remove("hidden");
 setTimeout(()=>groupSettingsNameInput?.focus(),30);
}

function closeGroupSettings(){
 groupSettingsModal?.classList.add("hidden");
 if(groupSettingsMessage)groupSettingsMessage.textContent="";
 if(groupSettingsAvatarInput)groupSettingsAvatarInput.value="";
}

async function saveGroupSettings(){
 const groupId=groupSettingsModal?.dataset.groupId||"";
 const group=groups.find(item=>item.id===groupId&&item.owner_id===userId&&!item.deleted_at);
 if(!group)return;
 const name=groupSettingsNameInput.value.trim().replace(/\s+/g," ");
 if(name.length<2||name.length>48){
  groupSettingsMessage.textContent=currentLanguage==="vi"?"Tên nhóm phải từ 2-48 ký tự.":"Group name must be 2-48 characters.";
  return;
 }
 let avatarUrl=group.avatar_url||"";
 const file=groupSettingsAvatarInput.files?.[0]||null;
 if(file){
  if(file.size>2*1024*1024){
   groupSettingsMessage.textContent=currentLanguage==="vi"?"Ảnh nhóm phải nhỏ hơn 2 MB.":"Group avatar must be smaller than 2 MB.";
   return;
  }
  avatarUrl=await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result||""));
   reader.onerror=()=>reject(new Error("Could not read group avatar."));
   reader.readAsDataURL(file);
  });
 }
 groupSettingsSaveButton.disabled=true;
 groupSettingsMessage.textContent=currentLanguage==="vi"?"Đang lưu...":"Saving...";
 try{
  const result=await request("/api/groups/update",{method:"POST",body:JSON.stringify({group_id:groupId,name,avatar_url:avatarUrl})});
  if(!result.group)throw new Error("Group update failed.");
  closeGroupSettings();
  await loadGroups();
  if(activeGroupId===groupId&&roomStatus)roomStatus.textContent=result.group.name;
 }catch(error){
  groupSettingsMessage.textContent=error instanceof Error?error.message:(currentLanguage==="vi"?"Không thể cập nhật nhóm.":"Could not update group.");
 }finally{groupSettingsSaveButton.disabled=false;}
}

async function createGroup(){
 if(groupCreationUsed||!profile)return;
 const name=groupNameInput.value.trim().replace(/\s+/g," ");
 if(name.length<2||name.length>48){groupModalMessage.textContent=currentLanguage==="vi"?"Tên nhóm phải từ 2-48 ký tự.":"Group name must be 2-48 characters.";return;}
 const selected=[...groupFriendList.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value).filter(Boolean);
 groupCreateSubmit.disabled=true;
 groupModalMessage.textContent=currentLanguage==="vi"?"Đang tạo nhóm...":"Creating group...";
 try{
  const result=await request("/api/groups",{method:"POST",body:JSON.stringify({name})});
  if(!result.group)throw new Error("Group creation failed.");
  if(selected.length)await request("/api/group-members",{method:"POST",body:JSON.stringify({group_id:result.group.id,user_ids:selected})});
  closeGroupModal();
  await loadGroups();
  await openGroup(result.group.id);
 }catch(error){
  groupModalMessage.textContent=error instanceof Error?error.message:(currentLanguage==="vi"?"Không thể tạo nhóm.":"Could not create group.");
 }finally{groupCreateSubmit.disabled=false;}
}

async function openGroup(groupId){
 const group=groups.find(item=>item.id===groupId&&!item.deleted_at);
 if(!group)return;
 try{
  const result=await request("/api/group-messages?group_id="+encodeURIComponent(groupId));
  activeGroupId=groupId;
  groupMessages=result.messages||[];
  messages=groupMessages.slice();
  if(roomStatus)roomStatus.textContent=group.name;
  renderGroupCard();
  renderMessages(true);
  setMobileMenu(false);
 }catch(error){
  setConnection(error instanceof Error?error.message:"Group failed");
  setTimeout(()=>setConnection("Connected"),1800);
 }
}

function openPublicRoom(){
 activeGroupId="";
 messages=publicMessages.slice();
 if(roomStatus)roomStatus.textContent=currentLanguage==="vi"?"Phòng công khai":"Public room";
 renderGroupCard();
 renderMessages(true);
}

async function deleteGroup(groupId){
 const group=groups.find(item=>item.id===groupId&&item.owner_id===userId&&!item.deleted_at);
 if(!group)return;
 const first=window.confirm((currentLanguage==="vi"?"Bạn chắc chắn muốn xóa nhóm \"":"Are you sure you want to delete \"")+group.name+(currentLanguage==="vi"?"\"? Tất cả thành viên sẽ mất quyền truy cập.":"\"? All members will lose access."));
 if(!first)return;
 const second=window.confirm((currentLanguage==="vi"?"Xác nhận lần cuối: xóa dữ liệu trò chuyện của nhóm \"":"Final confirmation: delete the chat data for \"")+group.name+(currentLanguage==="vi"?"\". Không thể hoàn tác và bạn sẽ không thể tạo nhóm khác.":"\". This cannot be undone, and you will not be able to create another group."));
 if(!second)return;
 try{
  const result=await request("/api/groups/delete",{method:"POST",body:JSON.stringify({group_id:groupId})});
  if(!result.deleted)throw new Error("Group deletion failed.");
  if(activeGroupId===groupId)openPublicRoom();
  await loadGroups();
 }catch(error){
  setConnection(error instanceof Error?error.message:(currentLanguage==="vi"?"Không thể xóa nhóm.":"Could not delete group."));
  setTimeout(()=>setConnection("Connected"),1800);
 }
}

async function openPublicProfile(userIdValue){
 if(!userIdValue)return;
 try{
  let data=profileDirectory.get(userIdValue);
  if(!data){
   const result=await request("/api/profiles");
   (result.profiles||[]).forEach(item=>profileDirectory.set(item.id,item));
   data=profileDirectory.get(userIdValue);
  }
  if(!data)return;
  selectedProfileId=data.id;
  setProfileAvatar(publicProfileAvatar,data,"public-avatar");
  publicProfileDisplayName.innerHTML=escapeText(data.display_name||data.username)+ownerBadgeMarkup(data.id,data.user_number);
  publicProfileUsername.textContent=data.username?"@"+data.username+(data.user_number?" · ID #"+data.user_number:""):"";
  publicProfileNote.textContent=data.note||(currentLanguage==="vi"?"Chưa có ghi chú hồ sơ.":"No profile note.");
  friendActionMessage.textContent="";
  const relation=friends.find(item=>item.user_id===data.id);
  addFriendButton.textContent=data.id===userId?(currentLanguage==="vi"?"Đây là bạn":"This is you"):relation?.status==="accepted"?(currentLanguage==="vi"?"Xóa bạn":"Unfriend"):relation?.status==="pending"?(currentLanguage==="vi"?"Đang chờ":"Request pending"):(currentLanguage==="vi"?"Thêm bạn":"Add Friend");
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
settingsCategoryButtons.forEach(button=>button.addEventListener("click",()=>setSettingsCategory(button.dataset.settingsCategory||"color")));
themeOptions.forEach(button=>button.addEventListener("click",()=>applyTheme(button.dataset.theme||"orange")));
themeModeOptions.forEach(button=>button.addEventListener("click",()=>applyColorMode(button.dataset.themeMode||"dark")));
languageSelect?.addEventListener("change",()=>changeLanguage(languageSelect.value));

openProfileButton.addEventListener("click",()=>{setMobileMenu(false);openMyProfile();});
closeProfileButton.addEventListener("click",closeProfileModal);
closeGroupModalButton?.addEventListener("click",closeGroupModal);
closeGroupSettingsButton?.addEventListener("click",closeGroupSettings);
groupSettingsSaveButton?.addEventListener("click",saveGroupSettings);
groupSettingsDeleteButton?.addEventListener("click",()=>{
 const groupId=groupSettingsModal?.dataset.groupId||"";
 closeGroupSettings();
 if(groupId)deleteGroup(groupId);
});
groupSettingsAvatar?.addEventListener("click",()=>groupSettingsAvatarInput?.click());
groupSettingsAvatarInput?.addEventListener("change",()=>{
 const file=groupSettingsAvatarInput.files?.[0];
 if(file){
  const reader=new FileReader();
  reader.onload=()=>{groupSettingsAvatar.innerHTML='<img src="'+escapeText(String(reader.result||""))+'" alt="">';};
  reader.readAsDataURL(file);
 }
});
groupSettingsModal?.addEventListener("click",event=>{if(event.target===groupSettingsModal)closeGroupSettings();});
groupCreateSubmit?.addEventListener("click",createGroup);
publicRoomButton?.addEventListener("click",()=>{openPublicRoom();setMobileMenu(false);});
groupModal?.addEventListener("click",event=>{if(event.target===groupModal)closeGroupModal();});
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
fileButton?.addEventListener("click",()=>fileInput?.click());
document.querySelector("#fileSizeWarningClose")?.addEventListener("click",()=>document.querySelector("#fileSizeWarning")?.classList.add("hidden"));
fileInput?.addEventListener("change",async()=>{
 const file=fileInput.files?.[0];
 fileInput.value="";
 if(!file)return;
 sendButton.disabled=true;
 try{await uploadFile(file);}
 catch(error){
  setConnection(error instanceof Error?error.message:(currentLanguage==="vi"?"Không thể tải tệp lên.":"Could not upload file."));
  setTimeout(()=>setConnection("Connected"),2200);
 }
 finally{sendButton.disabled=false;}
});
stickerPickerClose?.addEventListener("click",()=>stickerPicker?.classList.add("hidden"));
savedStickerTab?.addEventListener("click",()=>setStickerTab("saved"));
searchStickerTab?.addEventListener("click",()=>setStickerTab("search"));
stickerSearchButton?.addEventListener("click",()=>searchStickers());
stickerSearchInput?.addEventListener("keydown",event=>{if(event.key==="Enter")searchStickers()});
savedStickerGrid?.addEventListener("click",event=>{
 const unsave=event.target.closest("[data-unsave-sticker]");
 if(unsave){
  unsaveSticker(unsave.dataset.unsaveSticker);
  return;
 }
 const button=event.target.closest("[data-sticker-url]");
 if(button)sendSticker(button.dataset.stickerUrl);
});
recentStickerFeature?.addEventListener("click",event=>{
 const button=event.target.closest("[data-sticker-url]");
 if(button)sendSticker(button.dataset.stickerUrl);
});
recentStickerGrid?.addEventListener("click",event=>{
 const button=event.target.closest("[data-sticker-url]");
 if(button)sendSticker(button.dataset.stickerUrl);
});
stickerSearchGrid?.addEventListener("click",event=>{
 const save=event.target.closest("[data-save-sticker]");
 const send=event.target.closest("[data-sticker-url]");
 if(save){
  const url=save.dataset.saveSticker;
  if(savedStickers.includes(url)){
   unsaveSticker(url);
   save.classList.remove("saved");
   save.setAttribute("aria-label","Save sticker");
   save.setAttribute("title","Save sticker");
  }else{
   saveSticker(url);
   save.classList.add("saved");
   save.setAttribute("aria-label","Unsave sticker");
   save.setAttribute("title","Unsave sticker");
  }
  return;
 }
 if(send)sendSticker(send.dataset.stickerUrl);
});
clearSavedStickersButton?.addEventListener("click",clearSavedStickers);
stickerSearchGrid?.addEventListener("scroll",event=>{
 const el=event.currentTarget;
 if(el.scrollTop+el.clientHeight>=el.scrollHeight-120)searchStickers(null,true);
});
document.querySelectorAll("[data-sticker-query]").forEach(button=>button.addEventListener("click",()=>{
 document.querySelectorAll("[data-sticker-query]").forEach(item=>item.classList.toggle("active",item===button));
 if(stickerSearchInput)stickerSearchInput.value=button.dataset.stickerQuery||"";
 searchStickers(button.dataset.stickerQuery||"");
}));
document.addEventListener("click",event=>{if(!event.target.closest(".sticker-picker")&&!event.target.closest("#stickerButton"))stickerPicker?.classList.add("hidden")});
loadSavedStickers();
loadTheme();
loadColorMode();
loadLanguage();
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
groupCard?.addEventListener("click",event=>{
 const openButton=event.target.closest("[data-group-open]");
 const deleteButton=event.target.closest("[data-group-delete]");
 if(openButton){openGroup(openButton.dataset.groupOpen);return;}
 if(deleteButton){deleteGroup(deleteButton.dataset.groupDelete);return;}
});

messagesEl.addEventListener("click",event=>{
 const deleteButton=event.target.closest("[data-message-id]");
 if(deleteButton){
  event.preventDefault();
  event.stopPropagation();
  deleteMessage(deleteButton.dataset.messageId);
  return;
 }
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
 if(query.length<1){friendSearchStatus.textContent=currentLanguage==="vi"?"Nhập tên người dùng hoặc UID.":"Enter a username or UID.";return;}
 if(!/^\d+$/.test(query)&&query.length<2){friendSearchStatus.textContent=currentLanguage==="vi"?"Nhập ít nhất 2 ký tự.":"Enter at least 2 characters.";return;}
 friendSearchStatus.textContent=currentLanguage==="vi"?"Đang tìm kiếm...":"Searching...";
 try{
  const result=await request("/api/users/search?q="+encodeURIComponent(query));
  if(!result.profile){friendSearchStatus.textContent=currentLanguage==="vi"?"Không tìm thấy người dùng.":"User not found.";return;}
  const item=result.profile;
  friendSearchStatus.textContent="";
  friendSearchResult.classList.remove("hidden");
  friendSearchResult.innerHTML=avatarMarkup(item,"friend-search-avatar")+'<span><strong>'+escapeText(item.display_name||item.username)+ownerBadgeMarkup(item.user_id,item.user_number)+'</strong><small>@'+escapeText(item.username)+(item.user_number?" · ID #"+item.user_number:"")+'</small></span><button type="button" class="friend-view-button" data-search-id="'+escapeText(item.id)+'">View</button>';
 }catch(error){friendSearchStatus.textContent=error instanceof Error?error.message:(currentLanguage==="vi"?"Tìm kiếm thất bại.":"Search failed.")}
}

async function unfriend(){
 if(!selectedProfileId||selectedProfileId===userId)return;
 addFriendButton.disabled=true;
 friendActionMessage.textContent=currentLanguage==="vi"?"Đang xóa bạn...":"Removing friend...";
 try{
  const result=await request("/api/friends/unfriend",{method:"POST",body:JSON.stringify({user_id:userId,target_user_id:selectedProfileId})});
  friendActionMessage.textContent=result.message||(currentLanguage==="vi"?"Đã xóa bạn.":"Friend removed.");
  addFriendButton.textContent=currentLanguage==="vi"?"Thêm bạn":"Add Friend";
  addFriendButton.disabled=false;
  await loadFriends();
 }catch(error){
  friendActionMessage.textContent=error instanceof Error?error.message:(currentLanguage==="vi"?"Không thể xóa bạn.":"Could not remove friend.");
  addFriendButton.disabled=false;
 }
}

async function addFriend(){
 if(!selectedProfileId||selectedProfileId===userId)return;
 addFriendButton.disabled=true;
 friendActionMessage.textContent=currentLanguage==="vi"?"Đang gửi...":"Sending...";
 try{
  const result=await request("/api/friends/request",{method:"POST",body:JSON.stringify({user_id:userId,target_user_id:selectedProfileId})});
  friendActionMessage.textContent=result.message||(currentLanguage==="vi"?"Đã gửi lời mời kết bạn.":"Friend request sent.");
  addFriendButton.textContent="Request pending";
 }catch(error){
  friendActionMessage.textContent=error instanceof Error?error.message:(currentLanguage==="vi"?"Không thể gửi lời mời kết bạn.":"Could not send friend request.");
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
 }finally{
  if(startupOverlay){
   await new Promise(resolve=>setTimeout(resolve,500));
   startupOverlay.classList.add("is-hidden");
   setTimeout(()=>startupOverlay.remove(),400);
  }
 }
}
updateTabNotifications();
start();