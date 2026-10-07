export default function handler(request,response){
 if(request.method!=="GET"){
  response.status(405).json({ok:false,error:"Method not allowed"});
  return;
 }
 const chatServerUrl=process.env.CHAT_SERVER_URL||"";
 if(!chatServerUrl){
  response.status(503).json({ok:false,error:"Chat server is not configured"});
  return;
 }
 response.status(200).json({ok:true,chatServerUrl});
}