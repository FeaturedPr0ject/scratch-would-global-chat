function setupAuthBackend(){
  getAuthSecret();
  getUsers();
  UrlFetchApp.fetch("https://www.google.com/generate_204",{muteHttpExceptions:true});
  return "Authentication backend is authorized.";
}

function getSupportEmail(){
  return PropertiesService.getScriptProperties().getProperty("SUPPORT_EMAIL")||"";
}

function getAuthSecret(){
  const props=PropertiesService.getScriptProperties();
  let secret=props.getProperty("AUTH_SESSION_SECRET");
  if(!secret){
    const lock=LockService.getScriptLock();
    lock.waitLock(10000);
    try{
      secret=props.getProperty("AUTH_SESSION_SECRET");
      if(!secret){
        secret=Utilities.getUuid()+"-"+Utilities.getUuid()+"-"+Utilities.getUuid();
        props.setProperty("AUTH_SESSION_SECRET",secret);
      }
    }finally{
      lock.releaseLock();
    }
  }
  return secret;
}

function getUsers(){
  const raw=PropertiesService.getScriptProperties().getProperty("SWGC_USERS")||"{}";
  try{
    return JSON.parse(raw);
  }catch{
    return {};
  }
}

function saveUsers(users){
  PropertiesService.getScriptProperties().setProperty("SWGC_USERS",JSON.stringify(users));
}

function normalizeEmail(email){
  return String(email||"").trim().toLowerCase();
}

function bytesToHex(bytes){
  return bytes.map(byte=>{
    const value=(byte<0?byte+256:byte).toString(16);
    return value.length===1?"0"+value:value;
  }).join("");
}

function hashPassword(password,salt){
  return bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+":"+password));
}

function createSession(email){
  const payload={
    email,
    iat:Date.now(),
    exp:Date.now()+172800000
  };
  const encoded=Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/,"");
  const signature=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(encoded,getAuthSecret())).replace(/=+$/,"");
  return encoded+"."+signature;
}

function verifySession(token){
  if(!token||typeof token!=="string")return null;
  const parts=token.split(".");
  if(parts.length!==2)return null;
  const expected=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0],getAuthSecret())).replace(/=+$/,"");
  if(parts[1]!==expected)return null;
  try{
    const payload=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if(!payload.email||!payload.exp||Date.now()>=payload.exp)return null;
    return payload;
  }catch{
    return null;
  }
}

function validateTurnstile(token){
  const secret=PropertiesService.getScriptProperties().getProperty("TURNSTILE_SECRET")||"";
  if(!secret)return {success:false};
  if(!token||typeof token!=="string"||token.length>2048)return {success:false};
  try{
    const response=UrlFetchApp.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"post",
      payload:{
        secret,
        response:token
      },
      muteHttpExceptions:true
    });
    const result=JSON.parse(response.getContentText()||"{}");
    const expectedHostname=PropertiesService.getScriptProperties().getProperty("TURNSTILE_HOSTNAME")||"";
    if(result.success&&expectedHostname&&result.hostname!==expectedHostname)return {success:false};
    return result;
  }catch{
    return {success:false};
  }
}

function isValidCallback(callback){
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(String(callback||""));
}

function jsonp(callback,payload){
  if(!isValidCallback(callback)){
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Invalid callback"})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(callback+"("+JSON.stringify(payload)+")").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function queueAuthResponse(nonce,payload){
  if(!nonce||String(nonce).length>128)return;
  CacheService.getScriptCache().put("swgc-auth-"+nonce,JSON.stringify(payload),120);
}

function pollAuth(e){
  const nonce=String(e.parameter.nonce||"");
  if(!nonce||nonce.length>128)return {pending:false,ok:false,error:"Invalid authentication request."};
  const cache=CacheService.getScriptCache();
  const key="swgc-auth-"+nonce;
  const raw=cache.get(key);
  if(!raw)return {pending:true};
  cache.remove(key);
  try{
    return JSON.parse(raw);
  }catch{
    return {pending:false,ok:false,error:"Invalid authentication response."};
  }
}

function doGet(e){
  try{
    const action=e&&e.parameter&&e.parameter.action||"";
    if(action==="poll")return jsonp(e.parameter.callback,pollAuth(e));
    if(action==="validate"){
      const session=verifySession(e.parameter.token||"");
      return jsonp(e.parameter.callback,{
        type:"swgc-session-response",
        ok:Boolean(session),
        email:session?session.email:""
      });
    }
    return ContentService.createTextOutput("SWGC backend is online.");
  }catch{
    if(e&&e.parameter&&e.parameter.callback)return jsonp(e.parameter.callback,{ok:false,error:"Backend error. Please try again."});
    return ContentService.createTextOutput("Backend error. Please try again.");
  }
}

function handleAuth(e){
  const action=e.parameter.action||"";
  const email=normalizeEmail(e.parameter.email);
  const password=String(e.parameter.password||"");
  const turnstileToken=String(e.parameter.turnstileToken||"");
  if(!email||!password)return {ok:false,error:"Enter your email and password."};
  if(password.length<8)return {ok:false,error:"Password must be at least 8 characters."};
  if(!validateTurnstile(turnstileToken).success)return {ok:false,error:"CAPTCHA verification failed. Please try again."};
  const users=getUsers();
  if(action==="signIn"){
    if(users[email])return {ok:false,error:"An account with this email already exists. Use Log In instead."};
    const user={
      salt:Utilities.getUuid(),
      createdAt:new Date().toISOString()
    };
    user.passwordHash=hashPassword(password,user.salt);
    const lock=LockService.getScriptLock();
    lock.waitLock(10000);
    try{
      const latestUsers=getUsers();
      if(latestUsers[email])return {ok:false,error:"An account with this email already exists. Use Log In instead."};
      latestUsers[email]=user;
      saveUsers(latestUsers);
    }finally{
      lock.releaseLock();
    }
  }else if(action==="logIn"){
    const user=users[email];
    if(!user||hashPassword(password,user.salt)!==user.passwordHash)return {ok:false,error:"Invalid email or password."};
  }else{
    return {ok:false,error:"Invalid authentication action."};
  }
  return {ok:true,email,token:createSession(email)};
}

function doPost(e){
  try{
    const action=e&&e.parameter&&e.parameter.action||"";
    if(action==="signIn"||action==="logIn"){
      const nonce=String(e.parameter.nonce||"");
      const result=handleAuth(e);
      queueAuthResponse(nonce,result);
      return ContentService.createTextOutput(JSON.stringify({ok:true,queued:true})).setMimeType(ContentService.MimeType.JSON);
    }
    const data={
      product:e.parameter.product||"SWGC Room Chats",
      type:e.parameter.type||"Troubleshoot",
      reason:e.parameter.reason||"",
      otherReason:e.parameter.otherReason||"",
      details:e.parameter.details||"",
      page:e.parameter.page||"",
      userAgent:e.parameter.userAgent||"",
      language:e.parameter.language||"",
      createdAt:e.parameter.createdAt||new Date().toISOString()
    };
    if(!data.reason||!data.details)return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Missing required fields"})).setMimeType(ContentService.MimeType.JSON);
    if(data.reason==="Other"&&!data.otherReason)return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Missing other reason"})).setMimeType(ContentService.MimeType.JSON);
    const supportEmail=getSupportEmail();
    if(!supportEmail)return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Support email is not configured"})).setMimeType(ContentService.MimeType.JSON);
    const fileName="swgc-troubleshoot-request-"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd-HHmmss")+".json";
    const attachment=Utilities.newBlob(JSON.stringify(data,null,2),"application/json",fileName);
    const subject="[SWGC Troubleshoot] "+data.reason;
    const body=[
      "A new SWGC Room Chats troubleshooting request was submitted.",
      "",
      "Reason: "+data.reason,
      data.otherReason?"Other reason: "+data.otherReason:"",
      "",
      "Details:",
      data.details,
      "",
      "Page: "+data.page,
      "Language: "+data.language,
      "Created: "+data.createdAt
    ].filter(Boolean).join("\n");
    GmailApp.sendEmail({
      to:supportEmail,
      subject,
      body,
      attachments:[attachment],
      name:"SWGC Room Chats Support"
    });
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }catch{
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Backend error. Please try again."})).setMimeType(ContentService.MimeType.JSON);
  }
}