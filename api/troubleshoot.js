export default async function handler(req,res){
 if(req.method!=="POST"){
  res.setHeader("Allow","POST");
  return res.status(405).json({ok:false,error:"Method not allowed"});
 }
 const supportEmail=process.env.SUPPORT_EMAIL||"";
 const apiKey=process.env.RESEND_API_KEY||"";
 const fromEmail=process.env.RESEND_FROM||"";
 if(!supportEmail||!apiKey||!fromEmail)return res.status(500).json({ok:false,error:"Support service is not configured"});
 const body=req.body||{};
 const reason=String(body.reason||"").trim();
 const otherReason=String(body.otherReason||"").trim();
 const details=String(body.details||"").trim();
 if(!reason||!details)return res.status(400).json({ok:false,error:"Missing required fields"});
 if(reason==="Other"&&!otherReason)return res.status(400).json({ok:false,error:"Missing other reason"});
 if(reason.length>200||otherReason.length>1000||details.length>5000)return res.status(400).json({ok:false,error:"Request is too large"});
 const data={reason,otherReason,details,page:String(body.page||"").slice(0,2000),userAgent:String(body.userAgent||"").slice(0,1000),language:String(body.language||"").slice(0,100),createdAt:String(body.createdAt||new Date().toISOString()).slice(0,100)};
 const text=["A new SWGC Room Chats troubleshooting request was submitted.","","Reason: "+data.reason,data.otherReason?"Other reason: "+data.otherReason:"","","Details:",data.details,"","Page: "+data.page,"Language: "+data.language,"Created: "+data.createdAt].filter(Boolean).join("\n");
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from:fromEmail,to:[supportEmail],subject:"[SWGC Troubleshoot] "+reason,text})});
 if(!response.ok)return res.status(502).json({ok:false,error:"Email delivery failed"});
 return res.status(200).json({ok:true});
}