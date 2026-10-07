export default function handler(request,response){
  if(request.method!=="GET"){
    response.status(405).json({ok:false,error:"Method not allowed"});
    return;
  }
  const url=process.env.SUPABASE_URL||"";
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||"";
  if(!url||!key){
    response.status(503).json({ok:false,error:"Supabase is not configured"});
    return;
  }
  response.status(200).json({ok:true,url,key});
}