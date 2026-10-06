function getSupportEmail(){
  return PropertiesService.getScriptProperties().getProperty("SUPPORT_EMAIL")||"";
}

function doPost(e){
  try{
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
    if(!data.reason||!data.details){
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Missing required fields"})).setMimeType(ContentService.MimeType.JSON);
    }
    if(data.reason==="Other"&&!data.otherReason){
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Missing other reason"})).setMimeType(ContentService.MimeType.JSON);
    }
    const supportEmail=getSupportEmail();
    if(!supportEmail){
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Support email is not configured"})).setMimeType(ContentService.MimeType.JSON);
    }
    const fileName="swgc-troubleshoot-request-"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd-HHmmss")+".json";
    const json=JSON.stringify(data,null,2);
    const attachment=Utilities.newBlob(json,"application/json",fileName);
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
  }catch(error){
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(error)})).setMimeType(ContentService.MimeType.JSON);
  }
}