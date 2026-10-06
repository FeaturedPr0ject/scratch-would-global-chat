const STORAGE_NAME="swg-global-chat-name";
const messagesEl=document.querySelector("#messages");
const input=document.querySelector("#messageInput");
const sendButton=document.querySelector("#sendButton");
const charCount=document.querySelector("#charCount");
const nameModal=document.querySelector("#nameModal");
const nameInput=document.querySelector("#nameInput");
const saveName=document.querySelector("#saveName");
const changeName=document.querySelector("#changeName");
const profileName=document.querySelector("#profileName");
const profileAvatar=document.querySelector("#profileAvatar");
const connectionDot=document.querySelector("#connectionDot");
const connectionText=document.querySelector("#connectionText");

let username=localStorage.getItem(STORAGE_NAME)||"";
let messages=JSON.parse(localStorage.getItem("swg-local-messages")||"[]");

function escapeText(value){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function initials(name){
 const parts=name.trim().split(/\s+/).filter(Boolean);
 return (parts.length>1?parts[0][0]+parts[1][0]:name.slice(0,2)).toUpperCase();
}

function setConnection(online){
 connectionDot.classList.toggle("online",online);
 connectionDot.classList.toggle("offline",!online);
 connectionText.textContent=online?"Connected":"Demo mode";
}

function render(){
 if(!messages.length){
  messagesEl.innerHTML='<div class="empty"><div class="empty-inner"><div class="empty-logo"><svg viewBox="0 0 240 120" aria-hidden="true"><path d="M30 62C8 42 23 10 55 16C72-1 101 6 111 23C128 2 165 8 170 31C203 12 226 36 211 61C233 82 213 111 182 101C166 121 134 116 122 96C103 118 69 113 65 91C35 103 12 85 30 62Z" fill="#ffad00" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><text x="120" y="73" text-anchor="middle" fill="#fff" font-size="58" font-weight="900" font-family="Arial Black,Arial,sans-serif">SWG</text></svg></div><h2>Welcome to SWG Chat</h2><p>Start the conversation. Your first message will appear here.</p></div></div>';
  return;
 }
 messagesEl.innerHTML=messages.map(item=>'<article class="message"><div class="message-avatar">'+escapeText(initials(item.name))+'</div><div class="message-body"><div class="message-meta"><span class="message-name">'+escapeText(item.name)+'</span><time class="message-time">'+escapeText(item.time)+'</time></div><div class="message-text">'+escapeText(item.text)+'</div></div></article>').join("");
 messagesEl.scrollTop=messagesEl.scrollHeight;
}

function updateProfile(){
 profileName.textContent=username||"Guest";
 profileAvatar.textContent=username?initials(username):"?";
}

function openName(){
 nameInput.value=username;
 nameModal.classList.remove("hidden");
 setTimeout(()=>nameInput.focus(),20);
}

function saveUsername(){
 const value=nameInput.value.trim().replace(/\s+/g," ");
 if(value.length<2||value.length>24)return;
 username=value;
 localStorage.setItem(STORAGE_NAME,username);
 updateProfile();
 nameModal.classList.add("hidden");
 input.focus();
}

function sendMessage(){
 const text=input.value.trim();
 if(!text||!username)return;
 messages.push({name:username,text,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});
 messages=messages.slice(-100);
 localStorage.setItem("swg-local-messages",JSON.stringify(messages));
 input.value="";
 input.style.height="auto";
 charCount.textContent="0 / 500";
 render();
}

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
saveName.addEventListener("click",saveUsername);
changeName.addEventListener("click",openName);
nameInput.addEventListener("keydown",event=>{
 if(event.key==="Enter")saveUsername();
});

updateProfile();
render();
setConnection(false);
if(!username)openName();