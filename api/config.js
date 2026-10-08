export default function handler(request,response){
 if(request.method!=="GET"){
  response.status(405).json({ok:false,error:"Method not allowed"});
  return;
 }
 const supabaseUrl=process.env.SUPABASE_URL||"";
 const supabasePublishableKey=process.env.SUPABASE_PUBLISHABLE_KEY||"";
 const klipyApiKey=process.env.KLIPY_API_KEY||"";
 if(!supabaseUrl||!supabasePublishableKey){
  response.status(503).json({ok:false,error:"Supabase is not configured"});
  return;
 }
 response.status(200).json({ok:true,supabaseUrl,supabasePublishableKey,klipyApiKey});
}
